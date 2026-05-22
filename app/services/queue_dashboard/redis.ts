import redis from '@adonisjs/redis/services/main'

import type { DashboardAdapter, JobRecord, ListResult, StatsResult } from './contract.js'

export class RedisDashboardAdapter implements DashboardAdapter {
  readonly #connectionName: string

  constructor(connectionName = 'main') {
    this.#connectionName = connectionName
  }

  #keys(queue: string) {
    return {
      data: `jobs::${queue}::data`,
      pending: `jobs::${queue}::pending`,
      delayed: `jobs::${queue}::delayed`,
      active: `jobs::${queue}::active`,
      completed: `jobs::${queue}::completed`,
      completedIndex: `jobs::${queue}::completed::index`,
      failed: `jobs::${queue}::failed`,
      failedIndex: `jobs::${queue}::failed::index`,
    }
  }

  #conn() {
    return redis.connection(this.#connectionName as Parameters<typeof redis.connection>[0])
  }

  async stats(queue: string): Promise<StatsResult> {
    const k = this.#keys(queue)
    const conn = this.#conn()
    const [pending, delayed, active, completed, failed] = await Promise.all([
      conn.zcard(k.pending),
      conn.zcard(k.delayed),
      conn.hlen(k.active),
      conn.zcard(k.completedIndex),
      conn.zcard(k.failedIndex),
    ])
    return { pending, delayed, active, completed, failed }
  }

  async listJobs(
    queue: string,
    status: string,
    page: number,
    perPage: number
  ): Promise<ListResult> {
    const k = this.#keys(queue)
    const conn = this.#conn()
    const offset = (page - 1) * perPage
    let jobIds: string[] = []
    let total = 0

    if (status === 'pending') {
      total = await conn.zcard(k.pending)
      jobIds = await conn.zrange(k.pending, offset, offset + perPage - 1)
    } else if (status === 'delayed') {
      total = await conn.zcard(k.delayed)
      jobIds = await conn.zrange(k.delayed, offset, offset + perPage - 1)
    } else if (status === 'active') {
      const all = await conn.hkeys(k.active)
      total = all.length
      jobIds = all.slice(offset, offset + perPage)
    } else if (status === 'completed') {
      total = await conn.zcard(k.completedIndex)
      jobIds = await conn.zrevrange(k.completedIndex, offset, offset + perPage - 1)
    } else if (status === 'failed') {
      total = await conn.zcard(k.failedIndex)
      jobIds = await conn.zrevrange(k.failedIndex, offset, offset + perPage - 1)
    }

    if (jobIds.length === 0) return { jobs: [], total }

    const dataPipeline = conn.pipeline()
    for (const id of jobIds) dataPipeline.hget(k.data, id)

    const metaKey =
      status === 'completed'
        ? k.completed
        : status === 'failed'
          ? k.failed
          : status === 'active'
            ? k.active
            : null
    const metaPipeline = conn.pipeline()
    if (metaKey) {
      for (const id of jobIds) metaPipeline.hget(metaKey, id)
    }

    const [dataResults, metaResults] = await Promise.all([dataPipeline.exec(), metaPipeline.exec()])

    const jobs = jobIds
      .map((id, i) => {
        const [, rawData] = (dataResults![i] ?? []) as [Error | null, string | null]
        if (!rawData) return null

        const data = JSON.parse(rawData)
        let meta: Record<string, unknown> = {}

        if (metaResults && metaResults[i]) {
          const [, rawMeta] = metaResults[i] as [Error | null, string | null]
          if (rawMeta) meta = JSON.parse(rawMeta)
        }

        return {
          id,
          status,
          name: data.name,
          payload: data.payload,
          attempts: data.attempts ?? 0,
          priority: data.priority as number | undefined,
          createdAt: data.createdAt as number | undefined,
          finishedAt: meta.finishedAt as number | undefined,
          acquiredAt:
            (meta.acquiredAt as number | undefined) ?? (data.acquiredAt as number | undefined),
          error: meta.error as string | undefined,
        } as JobRecord
      })
      .filter((j): j is JobRecord => j !== null)

    return { jobs, total }
  }

  async retryJob(id: string, queue: string): Promise<void> {
    const k = this.#keys(queue)
    const conn = this.#conn()

    const [rawData, isInFailed] = await Promise.all([
      conn.hget(k.data, id),
      conn.hexists(k.failed, id),
    ])

    if (!rawData || !isInFailed) throw new Error('Job not found in failed queue')

    const job = JSON.parse(rawData)
    job.attempts = 0
    const score = (job.priority ?? 5) * 10_000_000_000_000 + Date.now()

    await conn
      .multi()
      .hdel(k.failed, id)
      .zrem(k.failedIndex, id)
      .hset(k.data, id, JSON.stringify(job))
      .zadd(k.pending, score, id)
      .exec()
  }

  async deleteJob(id: string, queue: string): Promise<void> {
    const k = this.#keys(queue)
    const conn = this.#conn()

    await conn
      .multi()
      .hdel(k.failed, id)
      .zrem(k.failedIndex, id)
      .hdel(k.completed, id)
      .zrem(k.completedIndex, id)
      .zrem(k.pending, id)
      .zrem(k.delayed, id)
      .hdel(k.active, id)
      .hdel(k.data, id)
      .exec()
  }
}
