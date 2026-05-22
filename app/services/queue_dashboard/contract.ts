export interface JobRecord {
  id: string
  name: string
  payload: unknown
  status: string
  attempts: number
  priority?: number
  createdAt?: number
  finishedAt?: number
  acquiredAt?: number
  error?: string
}

export interface StatsResult {
  pending: number
  delayed: number
  active: number
  completed: number
  failed: number
}

export interface ListResult {
  jobs: JobRecord[]
  total: number
}

export interface DashboardAdapter {
  stats(queue: string): Promise<StatsResult>
  listJobs(queue: string, status: string, page: number, perPage: number): Promise<ListResult>
  retryJob(id: string, queue: string): Promise<void>
  deleteJob(id: string, queue: string): Promise<void>
}
