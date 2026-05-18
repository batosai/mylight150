const path = require('path')
const root = path.resolve(__dirname, '../', 'current')

module.exports = {
  apps: [
    {
      name: 'api',
      exec_mode: 'cluster',
      instances: 'max',
      autorestart: true,
      watch: false,
      cwd: root,
      script: 'npm',
      args: 'run start',
      max_memory_restart: '128M',
    },
    {
      name: 'worker',
      exec_mode: 'cluster',
      instances: '3',
      autorestart: true,
      watch: false,
      cwd: root,
      script: 'node',
      args: 'ace queue:work',
      max_memory_restart: '256M',
    },
  ],
}
