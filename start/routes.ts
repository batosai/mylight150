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

const QueueDashboardController = () => import('#controllers/queue_dashboard_controller')

router.get('/queue-dashboard', [QueueDashboardController, 'index'])
router.get('/queue-dashboard/api/stats', [QueueDashboardController, 'stats'])
router.get('/queue-dashboard/api/jobs', [QueueDashboardController, 'jobs'])
router.post('/queue-dashboard/api/jobs/:id/retry', [QueueDashboardController, 'retryJob'])
router.delete('/queue-dashboard/api/jobs/:id', [QueueDashboardController, 'deleteJob'])
