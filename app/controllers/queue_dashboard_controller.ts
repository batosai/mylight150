import type { HttpContext } from '@adonisjs/core/http'
import { createDashboardAdapter } from '#services/queue_dashboard/factory'

const QUEUE = 'default'
const PER_PAGE = 25

export default class QueueDashboardController {
  async index({ response }: HttpContext) {
    return response.header('Content-Type', 'text/html').send(getDashboardHtml())
  }

  async stats({ response }: HttpContext) {
    const adapter = await createDashboardAdapter()
    const stats = await adapter.stats(QUEUE)
    return response.json(stats)
  }

  async jobs({ request, response }: HttpContext) {
    const adapter = await createDashboardAdapter()
    const status = request.input('status', 'pending') as string
    const page = Math.max(1, Number.parseInt(request.input('page', '1')))
    const { jobs, total } = await adapter.listJobs(QUEUE, status, page, PER_PAGE)
    return response.json({ jobs, total, page, perPage: PER_PAGE })
  }

  async retryJob({ params, response }: HttpContext) {
    const adapter = await createDashboardAdapter()
    try {
      await adapter.retryJob(params.id as string, QUEUE)
      return response.json({ success: true })
    } catch (e) {
      return response.status(404).json({ error: (e as Error).message })
    }
  }

  async deleteJob({ params, response }: HttpContext) {
    const adapter = await createDashboardAdapter()
    await adapter.deleteJob(params.id as string, QUEUE)
    return response.json({ success: true })
  }
}

function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Queue Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0f1117;
      --surface: #1a1d27;
      --border: #2a2d3a;
      --text: #e2e8f0;
      --muted: #64748b;
      --accent: #6366f1;
      --pending: #f59e0b;
      --delayed: #8b5cf6;
      --active: #3b82f6;
      --completed: #10b981;
      --failed: #ef4444;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }

    header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    header h1 {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.3px;
    }

    header h1 span { color: var(--accent); }

    .refresh-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--muted);
      font-size: 13px;
    }

    .toggle {
      position: relative;
      width: 36px;
      height: 20px;
      cursor: pointer;
    }

    .toggle input { opacity: 0; width: 0; height: 0; }

    .slider {
      position: absolute;
      inset: 0;
      background: var(--border);
      border-radius: 20px;
      transition: background 0.2s;
    }

    .slider::before {
      content: '';
      position: absolute;
      width: 14px;
      height: 14px;
      left: 3px;
      top: 3px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }

    input:checked + .slider { background: var(--accent); }
    input:checked + .slider::before { transform: translateX(16px); }

    main { padding: 24px; max-width: 1400px; margin: 0 auto; }

    .stats {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      cursor: pointer;
      transition: border-color 0.15s, transform 0.1s;
    }

    .stat-card:hover { border-color: var(--accent); transform: translateY(-1px); }
    .stat-card.active-tab { border-color: var(--accent); background: #1e2035; }

    .stat-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .stat-card[data-status="pending"] .stat-value { color: var(--pending); }
    .stat-card[data-status="delayed"] .stat-value { color: var(--delayed); }
    .stat-card[data-status="active"] .stat-value { color: var(--active); }
    .stat-card[data-status="completed"] .stat-value { color: var(--completed); }
    .stat-card[data-status="failed"] .stat-value { color: var(--failed); }

    .table-container {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
    }

    .table-header {
      padding: 14px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .table-title {
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .badge-pending { background: rgba(245,158,11,0.15); color: var(--pending); }
    .badge-delayed { background: rgba(139,92,246,0.15); color: var(--delayed); }
    .badge-active  { background: rgba(59,130,246,0.15); color: var(--active); }
    .badge-completed { background: rgba(16,185,129,0.15); color: var(--completed); }
    .badge-failed  { background: rgba(239,68,68,0.15); color: var(--failed); }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      text-align: left;
      padding: 10px 20px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted);
      font-weight: 600;
      background: rgba(0,0,0,0.2);
    }

    td {
      padding: 12px 20px;
      border-top: 1px solid var(--border);
      vertical-align: middle;
    }

    tr:hover td { background: rgba(255,255,255,0.02); }

    .job-name {
      font-weight: 500;
      color: var(--text);
    }

    .job-id {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 11px;
      color: var(--muted);
    }

    .payload-cell {
      max-width: 300px;
    }

    .payload-preview {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 11px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 280px;
    }

    .error-cell {
      max-width: 300px;
    }

    .error-text {
      font-size: 12px;
      color: var(--failed);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 280px;
    }

    .ts {
      font-size: 12px;
      color: var(--muted);
      white-space: nowrap;
    }

    .actions { display: flex; gap: 6px; }

    button {
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid transparent;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    button:hover { opacity: 0.85; }
    button:disabled { opacity: 0.4; cursor: default; }

    .btn-retry {
      background: rgba(99,102,241,0.15);
      color: var(--accent);
      border-color: rgba(99,102,241,0.3);
    }

    .btn-delete {
      background: rgba(239,68,68,0.1);
      color: var(--failed);
      border-color: rgba(239,68,68,0.25);
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--muted);
    }

    .empty-state svg { margin-bottom: 12px; opacity: 0.3; }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      border-top: 1px solid var(--border);
    }

    .page-info { color: var(--muted); font-size: 13px; }

    .page-btns { display: flex; gap: 6px; }

    .btn-page {
      background: var(--surface);
      color: var(--text);
      border-color: var(--border);
      padding: 5px 12px;
    }

    .btn-page:disabled { opacity: 0.3; }

    .loading-row td {
      text-align: center;
      padding: 40px;
      color: var(--muted);
    }

    .dot-pulse {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--active);
      animation: pulse 1.2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }
  </style>
</head>
<body>
  <header>
    <h1>Queue <span>Dashboard</span></h1>
    <div class="refresh-toggle">
      <span id="refresh-label">Auto-refresh</span>
      <label class="toggle">
        <input type="checkbox" id="auto-refresh" checked>
        <span class="slider"></span>
      </label>
    </div>
  </header>

  <main>
    <div class="stats">
      <div class="stat-card active-tab" data-status="pending" onclick="switchTab('pending')">
        <div class="stat-label">Pending</div>
        <div class="stat-value" id="stat-pending">—</div>
      </div>
      <div class="stat-card" data-status="delayed" onclick="switchTab('delayed')">
        <div class="stat-label">Delayed</div>
        <div class="stat-value" id="stat-delayed">—</div>
      </div>
      <div class="stat-card" data-status="active" onclick="switchTab('active')">
        <div class="stat-label">Active</div>
        <div class="stat-value" id="stat-active">—</div>
      </div>
      <div class="stat-card" data-status="completed" onclick="switchTab('completed')">
        <div class="stat-label">Completed</div>
        <div class="stat-value" id="stat-completed">—</div>
      </div>
      <div class="stat-card" data-status="failed" onclick="switchTab('failed')">
        <div class="stat-label">Failed</div>
        <div class="stat-value" id="stat-failed">—</div>
      </div>
    </div>

    <div class="table-container">
      <div class="table-header">
        <div class="table-title">
          <span id="tab-title">Pending jobs</span>
          <span id="tab-badge" class="badge badge-pending">pending</span>
        </div>
        <div id="live-indicator" style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)">
          <span class="dot-pulse"></span> Live
        </div>
      </div>
      <div id="table-wrap">
        <table>
          <thead id="table-head"></thead>
          <tbody id="table-body">
            <tr class="loading-row"><td colspan="6">Loading…</td></tr>
          </tbody>
        </table>
      </div>
      <div class="pagination" id="pagination" style="display:none">
        <span class="page-info" id="page-info"></span>
        <div class="page-btns">
          <button class="btn-page" id="btn-prev" onclick="changePage(-1)">← Prev</button>
          <button class="btn-page" id="btn-next" onclick="changePage(1)">Next →</button>
        </div>
      </div>
    </div>
  </main>

  <script>
    let currentTab = 'pending'
    let currentPage = 1
    let totalJobs = 0
    let perPage = 25
    let refreshTimer = null
    let autoRefresh = true

    const TITLES = {
      pending: 'Pending jobs',
      delayed: 'Delayed jobs',
      active: 'Active jobs',
      completed: 'Completed jobs',
      failed: 'Failed jobs',
    }

    const HEADS = {
      pending: ['Job', 'Payload', 'Priority', 'Attempts', 'Created', ''],
      delayed: ['Job', 'Payload', 'Priority', 'Attempts', 'Created', ''],
      active: ['Job', 'Payload', 'Priority', 'Attempts', 'Acquired', ''],
      completed: ['Job', 'Payload', 'Attempts', 'Finished', '', ''],
      failed: ['Job', 'Payload', 'Error', 'Attempts', 'Finished', 'Actions'],
    }

    function switchTab(tab) {
      currentTab = tab
      currentPage = 1
      document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active-tab'))
      document.querySelector('[data-status="' + tab + '"]').classList.add('active-tab')
      document.getElementById('tab-title').textContent = TITLES[tab]
      document.getElementById('tab-badge').className = 'badge badge-' + tab
      document.getElementById('tab-badge').textContent = tab
      loadJobs()
    }

    function changePage(delta) {
      const maxPage = Math.ceil(totalJobs / perPage)
      currentPage = Math.max(1, Math.min(currentPage + delta, maxPage))
      loadJobs()
    }

    async function loadStats() {
      try {
        const r = await fetch('/queue-dashboard/api/stats')
        const data = await r.json()
        ;['pending','delayed','active','completed','failed'].forEach(s => {
          document.getElementById('stat-' + s).textContent = data[s].toLocaleString()
        })
      } catch {}
    }

    async function loadJobs() {
      const tbody = document.getElementById('table-body')
      const thead = document.getElementById('table-head')

      const heads = HEADS[currentTab]
      thead.innerHTML = '<tr>' + heads.map(h => '<th>' + h + '</th>').join('') + '</tr>'

      tbody.innerHTML = '<tr class="loading-row"><td colspan="' + heads.length + '">Loading…</td></tr>'

      try {
        const r = await fetch('/queue-dashboard/api/jobs?status=' + currentTab + '&page=' + currentPage)
        const data = await r.json()
        totalJobs = data.total
        perPage = data.perPage
        renderJobs(data.jobs)
        renderPagination()
      } catch {
        tbody.innerHTML = '<tr class="loading-row"><td colspan="6">Error loading jobs</td></tr>'
      }
    }

    function renderJobs(jobs) {
      const tbody = document.getElementById('table-body')
      const cols = HEADS[currentTab].length

      if (!jobs.length) {
        tbody.innerHTML = \`
          <tr><td colspan="\${cols}">
            <div class="empty-state">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                <path d="M12 12h.01"/>
              </svg>
              <div>No \${currentTab} jobs</div>
            </div>
          </td></tr>\`
        return
      }

      tbody.innerHTML = jobs.map(job => renderRow(job)).join('')
    }

    function renderRow(job) {
      const name = job.name || '—'
      const payload = JSON.stringify(job.payload ?? {})
      const priority = job.priority ?? 5
      const attempts = job.attempts ?? 0
      const createdAt = job.createdAt ? fmtTs(job.createdAt) : '—'
      const finishedAt = job.finishedAt ? fmtTs(job.finishedAt) : '—'
      const acquiredAt = job.acquiredAt ? fmtTs(job.acquiredAt) : '—'
      const error = job.error || ''

      const idCell = \`<div class="job-name">\${esc(name)}</div><div class="job-id">\${esc(job.id.substring(0, 8))}…</div>\`
      const payloadCell = \`<div class="payload-preview" title="\${esc(payload)}">\${esc(payload)}</div>\`

      const actions = \`
        <div class="actions">
          \${currentTab === 'failed' ? \`<button class="btn-retry" onclick="retryJob('\${job.id}', this)">Retry</button>\` : ''}
          \${['failed','completed'].includes(currentTab) ? \`<button class="btn-delete" onclick="deleteJob('\${job.id}', this)">Delete</button>\` : ''}
        </div>\`

      if (currentTab === 'pending' || currentTab === 'delayed') {
        return \`<tr>
          <td>\${idCell}</td>
          <td class="payload-cell">\${payloadCell}</td>
          <td>\${priority}</td>
          <td>\${attempts}</td>
          <td class="ts">\${createdAt}</td>
          <td></td>
        </tr>\`
      }

      if (currentTab === 'active') {
        return \`<tr>
          <td>\${idCell}</td>
          <td class="payload-cell">\${payloadCell}</td>
          <td>\${priority}</td>
          <td>\${attempts}</td>
          <td class="ts">\${acquiredAt}</td>
          <td></td>
        </tr>\`
      }

      if (currentTab === 'completed') {
        return \`<tr>
          <td>\${idCell}</td>
          <td class="payload-cell">\${payloadCell}</td>
          <td>\${attempts}</td>
          <td class="ts">\${finishedAt}</td>
          <td></td>
          <td>\${actions}</td>
        </tr>\`
      }

      // failed
      return \`<tr>
        <td>\${idCell}</td>
        <td class="payload-cell">\${payloadCell}</td>
        <td class="error-cell"><div class="error-text" title="\${esc(error)}">\${esc(error) || '—'}</div></td>
        <td>\${attempts}</td>
        <td class="ts">\${finishedAt}</td>
        <td>\${actions}</td>
      </tr>\`
    }

    function renderPagination() {
      const maxPage = Math.ceil(totalJobs / perPage)
      const pagination = document.getElementById('pagination')
      if (totalJobs <= perPage) {
        pagination.style.display = 'none'
        return
      }
      pagination.style.display = 'flex'
      const start = (currentPage - 1) * perPage + 1
      const end = Math.min(currentPage * perPage, totalJobs)
      document.getElementById('page-info').textContent = \`\${start}–\${end} of \${totalJobs}\`
      document.getElementById('btn-prev').disabled = currentPage <= 1
      document.getElementById('btn-next').disabled = currentPage >= maxPage
    }

    async function retryJob(id, btn) {
      btn.disabled = true
      try {
        const r = await fetch('/queue-dashboard/api/jobs/' + id + '/retry', { method: 'POST' })
        if (r.ok) { loadStats(); loadJobs() }
      } finally { btn.disabled = false }
    }

    async function deleteJob(id, btn) {
      if (!confirm('Delete this job?')) return
      btn.disabled = true
      try {
        const r = await fetch('/queue-dashboard/api/jobs/' + id, { method: 'DELETE' })
        if (r.ok) { loadStats(); loadJobs() }
      } finally { btn.disabled = false }
    }

    function fmtTs(ms) {
      const d = new Date(ms)
      return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' })
    }

    function esc(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    }

    function refresh() {
      loadStats()
      loadJobs()
    }

    function startTimer() {
      if (refreshTimer) clearInterval(refreshTimer)
      refreshTimer = setInterval(refresh, 5000)
      document.getElementById('live-indicator').style.opacity = '1'
    }

    function stopTimer() {
      if (refreshTimer) clearInterval(refreshTimer)
      document.getElementById('live-indicator').style.opacity = '0'
    }

    document.getElementById('auto-refresh').addEventListener('change', function() {
      autoRefresh = this.checked
      autoRefresh ? startTimer() : stopTimer()
    })

    refresh()
    startTimer()
  </script>
</body>
</html>`
}
