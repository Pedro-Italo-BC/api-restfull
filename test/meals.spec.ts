import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { app } from '../src/app'
import { execSync } from 'node:child_process'
import request from 'supertest'

describe('Meals routes.', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('should be able to create a new meal', async () => {
    const createdMealResponse = await request(app.server).post('/meals').send({
      name: 'Banana',
      description: 'Uma Banana',
      inDiet: 'diet',
      date: '2023-04-21',
      hour: '21:50',
    })

    const cookies = createdMealResponse.get('Set-Cookie')

    const listMealsResponse = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200)

    expect(listMealsResponse.body.meals).toEqual([
      expect.objectContaining({
        name: 'Banana',
        date: '2023-04-21',
      }),
    ])
  })

  it('should be able to get the list of meals', async () => {
    const createdMealResponse = await request(app.server).post('/meals').send({
      name: 'Banana',
      description: 'Uma Banana',
      inDiet: 'diet',
      date: '2023-04-21',
      hour: '21:50',
    })

    const cookies = createdMealResponse.get('Set-Cookie')

    const listOfMeals = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200)

    expect(listOfMeals.body.meals).toEqual([
      expect.objectContaining({
        name: 'Banana',
        date: '2023-04-21',
      }),
    ])
  })

  it('should be able to get a specific meal', async () => {
    const createdMeal = await request(app.server).post('/meals').send({
      name: 'Banana',
      description: 'Uma Banana',
      inDiet: 'diet',
      date: '2023-04-21',
      hour: '21:50',
    })

    const cookies = createdMeal.get('Set-Cookie')

    const listOfMeals = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200)

    const { id } = listOfMeals.body.meals[0]
    const specificMeal = await request(app.server)
      .get(`/meals/${id}`)
      .set('Cookie', cookies)
      .expect(200)

    expect(specificMeal.body.meal).toEqual(
      expect.objectContaining({
        name: 'Banana',
      }),
    )
  })

  it('should be able to get metrics of meals', async () => {
    const createdMealResponse = await request(app.server).post('/meals').send({
      name: 'Banana',
      description: 'Uma Banana',
      inDiet: 'diet',
      date: '2023-04-21',
      hour: '21:50',
    })

    const cookies = createdMealResponse.get('Set-Cookie')

    const metrics = await request(app.server)
      .get('/meals/metrics')
      .set('Cookie', cookies)
      .expect(200)

    expect(metrics.body).toEqual({
      totalMeals: 1,
      totalDietMeals: 1,
      totalNotDietMeals: 0,
      bestDaySequence: {
        inDietAmount: 1,
        date: '2023-04-21',
      },
    })
  })

  it('should be able to update a specific meal', async () => {
    const createdMeal = await request(app.server).post('/meals').send({
      name: 'Banana',
      description: 'Uma Banana',
      inDiet: 'diet',
      date: '2023-04-21',
      hour: '21:50',
    })

    const cookies = createdMeal.get('Set-Cookie')

    const listOfMeals = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200)

    const { id } = listOfMeals.body.meals[0]

    await request(app.server)
      .put(`/meals/${id}`)
      .set('Cookie', cookies)
      .send({ name: 'Pizza', inDiet: 'notDiet' })

    const specificMeal = await request(app.server)
      .get(`/meals/${id}`)
      .set('Cookie', cookies)
      .expect(200)

    expect(specificMeal.body.meal).toEqual(
      expect.objectContaining({
        name: 'Pizza',
        in_diet: 'notDiet',
      }),
    )
  })

  it('should be able to delete a specific meal', async () => {
    const createdMeal = await request(app.server).post('/meals').send({
      name: 'Pizza',
      description: 'Uma Banana',
      inDiet: 'notDiet',
      date: '2023-04-21',
      hour: '21:50',
    })

    const cookies = createdMeal.get('Set-Cookie')

    const firstListOfMeals = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200)

    const { id } = firstListOfMeals.body.meals[0]

    await request(app.server)
      .delete(`/meals/${id}`)
      .set('Cookie', cookies)
      .expect(202)

    const secondListOfMeals = await request(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200)

    expect(secondListOfMeals.body.meals).toHaveLength(0)
  })
})
