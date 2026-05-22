import type { DashboardAdapter, JobRecord, ListResult, StatsResult } from './contract.js'

type LucidDb = {
  from(table: string): any
}

const ORDER_BY: Record<string, { column: string; direction: 'asc' | 'desc' }> = {
  pending: { column: 'score', direction: 'asc' },
  delayed: { column: 'execute_at', direction: 'asc' },
  active: { column: 'acquired_at', direction: 'asc' },
  completed: { column: 'finished_at', direction: 'desc' },
  failed: { column: 'finished_at', direction: 'desc' },
}

export class DbDashboardAdapter implements DashboardAdapter {
  readonly #tableName: string

  constructor(tableName = 'queue_jobs') {
    this.#tableName = tableName
  }

  async #db(): Promise<LucidDb> {
    // @adonisjs/lucid is a peer dependency when using the database driver
    const { default: db } = await import('@adonisjs/lucid/services/db' as string)
    return db as LucidDb
  }

  async stats(queue: string): Promise<StatsResult> {
    const db = await this.#db()
    const rows = (await db
      .from(this.#tableName)
      .where('queue', queue)
      .whereIn('status', ['pending', 'delayed', 'active', 'completed', 'failed'])
      .groupBy('status')
      .select('status')
      .count('* as count')) as { status: string; count: number | string }[]

    const result: StatsResult = { pending: 0, delayed: 0, active: 0, completed: 0, failed: 0 }
    for (const row of rows) {
      const key = row.status as keyof StatsResult
      if (key in result) result[key] = Number(row.count)
    }
    return result
  }

  async listJobs(
    queue: string,
    status: string,
    page: number,
    perPage: number
  ): Promise<ListResult> {
    const db = await this.#db()
    const offset = (page - 1) * perPage
    const order = ORDER_BY[status] ?? ORDER_BY.pending

    const [rows, countResult] = await Promise.all([
      db
        .from(this.#tableName)
        .where('queue', queue)
        .where('status', status)
        .orderBy(order.column, order.direction)
        .limit(perPage)
        .offset(offset),
      db
        .from(this.#tableName)
        .where('queue', queue)
        .where('status', status)
        .count('* as total')
        .first() as Promise<{ total: number | string } | null>,
    ])

    const jobs = (rows as any[]).map((row): JobRecord => {
      const data = JSON.parse(typeof row.data === 'string' ? row.data : JSON.stringify(row.data))
      return {
        id: row.id,
        status: row.status,
        name: data.name,
        payload: data.payload,
        attempts: data.attempts ?? 0,
        priority: data.priority,
        createdAt: data.createdAt,
        finishedAt: row.finished_at ? Number(row.finished_at) : undefined,
        acquiredAt: row.acquired_at ? Number(row.acquired_at) : undefined,
        error: row.error ?? undefined,
      }
    })

    return { jobs, total: Number(countResult?.total ?? 0) }
  }

  async retryJob(id: string, queue: string): Promise<void> {
    const db = await this.#db()

    const row = await db
      .from(this.#tableName)
      .where('id', id)
      .where('queue', queue)
      .where('status', 'failed')
      .first()

    if (!row) throw new Error('Job not found in failed queue')

    const data = JSON.parse(typeof row.data === 'string' ? row.data : JSON.stringify(row.data))
    data.attempts = 0
    const score = (data.priority ?? 5) * 10_000_000_000_000 + Date.now()

    await db
      .from(this.#tableName)
      .where('id', id)
      .where('queue', queue)
      .update({
        status: 'pending',
        data: JSON.stringify(data),
        score,
        finished_at: null,
        error: null,
        worker_id: null,
        acquired_at: null,
      })
  }

  async deleteJob(id: string, queue: string): Promise<void> {
    const db = await this.#db()
    await db.from(this.#tableName).where('id', id).where('queue', queue).delete()
  }
}
