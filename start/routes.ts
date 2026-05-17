/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import redis from '@adonisjs/redis/services/main'

router.get('/api/battery', async () => {
  const redisMain = redis.connection('main')
  const capacity = (await redisMain.get('mylight150_capacity')) ?? 0

  return {
    capacity,
  }
})
