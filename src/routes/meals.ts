import { randomUUID } from 'crypto'
import { FastifyInstance } from 'fastify'
import { string, z } from 'zod'
import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'
import dayjs from 'dayjs'

export async function mealsRoutes(app: FastifyInstance) {
  app.get(
    '/',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const { sessionId } = request.cookies

      const meals = await knex('meals').where('session_id', sessionId).select()

      return { meals }
    },
  )

  app.post('/', async (request, reply) => {
    const createMealBodySchema = z.object({
      name: z.string(),
      description: z.string().default(''),
      inDiet: z.enum(['diet', 'notDiet']),
      dateAndHour: z
        .string()
        .regex(/(^[0-9]{4}[-][0-9]{2}[-][0-9]{2}[ ][0-9]{2}[:][0-9]{2}$)/),
    })

    const { dateAndHour, inDiet, name, description } =
      createMealBodySchema.parse(request.body)

    const dataAndHour = dayjs(dateAndHour).format('YYYY-MM-DD HH:mm:ss')

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 DAYS
      })
    }

    await knex('meals').insert({
      name,
      date_and_hour: dataAndHour,
      description,
      in_diet: inDiet,
      session_id: sessionId,
      id: randomUUID(),
    })

    return reply.status(201).send()
  })

  app.delete(
    '/:id',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const deleteMealParamsSchema = z.object({
        id: string().uuid(),
      })
      const { sessionId } = request.cookies
      const { id } = deleteMealParamsSchema.parse(request.params)

      await knex('meals')
        .where({
          session_id: sessionId,
          id,
        })
        .delete()

      return reply.status(202).send()
    },
  )

  app.put(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const updateMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const editMealBodySchema = z.object({
        name: z.string().optional(),
        description: z.string().default('').optional(),
        inDiet: z.enum(['diet', 'notDiet']).optional(),
        dateAndHour: z
          .string()
          .regex(/(^[0-9]{4}[-][0-9]{2}[-][0-9]{2}[ ][0-9]{2}[:][0-9]{2}$)/)
          .optional(),
      })

      const { id } = updateMealParamsSchema.parse(request.params)
      const { dateAndHour, description, inDiet, name } =
        editMealBodySchema.parse(request.body)

      const { sessionId } = request.cookies

      const updatedAt = dayjs(new Date()).format('YYYY/MM/DD HH:mm:ss')

      await knex('meals')
        .where({
          session_id: sessionId,
          id,
        })
        .update({
          in_diet: inDiet,
          name,
          date_and_hour: dateAndHour,
          description,
          updated_at: updatedAt,
        })

      return reply.status(200).send()
    },
  )
}
