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

  app.get(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getMealParamsSchema.parse(request.params)

      const { sessionId } = request.cookies

      const meal = await knex('meals')
        .where({
          id,
          session_id: sessionId,
        })
        .first()

      return { meal }
    },
  )

  app.get(
    '/metrics',
    {
      preHandler: [checkSessionIdExists],
    },
    async (request, reply) => {
      const { sessionId } = request.cookies

      const totalMeals = await knex('meals')
        .where('session_id', sessionId)
        .count({ total: 'id' })
        .select()

      const totalDietMeals = await knex('meals')
        .where({
          session_id: sessionId,
          in_diet: 'diet',
        })
        .count({ total: 'id' })
        .select()

      const totalNotDietMeals = await knex('meals')
        .where({
          session_id: sessionId,
          in_diet: 'notDiet',
        })
        .count({ total: 'id' })
        .select()

      const bestDaySequence = await knex('meals')
        .where({ session_id: sessionId, in_diet: 'diet' })
        .groupBy('date')
        .count({ inDietAmount: 'in_diet' })
        .orderBy('inDietAmount', 'desc')
        .select('date')
        .first()

      return {
        totalMeals: totalMeals[0].total,
        totalDietMeals: totalDietMeals[0].total,
        totalNotDietMeals: totalNotDietMeals[0].total,
        bestDaySequence,
      }
    },
  )

  app.post('/', async (request, reply) => {
    const createMealBodySchema = z.object({
      name: z.string(),
      description: z.string().default(''),
      inDiet: z.enum(['diet', 'notDiet']),
      date: z.string().regex(/(^[0-9]{4}[-][0-9]{2}[-][0-9]{2}$)/),
      hour: z.string().regex(/(^[0-9]{2}[:][0-9]{2}$)/),
    })

    const { date, hour, inDiet, name, description } =
      createMealBodySchema.parse(request.body)

    const correctDate = dayjs(date).format('YYYY-MM-DD')
    const correctHour = dayjs(`${date} ${hour}`).format('HH:mm')

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
      date: correctDate,
      hour: correctHour,
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
        date: z
          .string()
          .regex(/(^[0-9]{4}[-][0-9]{2}[-][0-9]{2}$)/)
          .optional(),
        hour: z
          .string()
          .regex(/(^[0-9]{2}[:][0-9]{2}$)/)
          .optional(),
      })

      const { id } = updateMealParamsSchema.parse(request.params)
      const { date, hour, description, inDiet, name } =
        editMealBodySchema.parse(request.body)

      const correctDate = dayjs(date).format('YYYY-MM-DD')
      const correctHour = dayjs(`${date} ${hour}`).format('HH:mm')

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
          date: correctDate,
          hour: correctHour,
          description,
          updated_at: updatedAt,
        })

      return reply.status(200).send()
    },
  )
}
