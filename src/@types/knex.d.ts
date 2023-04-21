// eslint-disable-next-line
import { Knex } from 'knex'

declare module 'knex/types/tables' {
  export interface Tables {
    meals: {
      id: string
      description: string
      name: string
      created_at: string
      updated_at: string
      date_and_hour: string
      in_diet: 'diet' | 'notDiet'
      session_id?: string
    }
  }
}
