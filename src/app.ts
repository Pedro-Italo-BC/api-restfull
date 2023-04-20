import fastify from 'fastify'
import cookie from '@fastify/cookie'
import { knex } from './database'

export const app = fastify()

app.register(cookie)

app.get('/test', async () => {
  const response = await knex('sqlite_schema').select('*')

  return response
})
