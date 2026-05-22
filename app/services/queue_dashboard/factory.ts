import type { DashboardAdapter } from './contract.js'

export async function createDashboardAdapter(): Promise<DashboardAdapter> {
  const driver = process.env.QUEUE_DRIVER ?? 'redis'

  if (driver === 'db' || driver === 'database') {
    const tableName = process.env.QUEUE_DB_TABLE ?? 'queue_jobs'
    const { DbDashboardAdapter } = await import('./db.js')
    return new DbDashboardAdapter(tableName)
  }

  const connectionName = process.env.REDIS_QUEUE_CONNECTION ?? 'main'
  const { RedisDashboardAdapter } = await import('./redis.js')
  return new RedisDashboardAdapter(connectionName)
}
