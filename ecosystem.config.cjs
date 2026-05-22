const path = require('path')
const root = path.resolve('../../', 'current')

module.exports = {
  apps: [
    {
      name: 'api',
      exec_mode: 'cluster',
      instances: '2',
      autorestart: true,
      watch: false,
      cwd: root,
      script: 'bin/server.js',
      max_memory_restart: '180M',
    },
    {
      name: 'worker',
      exec_mode: 'cluster',
      instances: '2',
      autorestart: true,
      watch: false,
      cwd: root,
      script: 'ace.js',
      args: 'queue:work',
      max_memory_restart: '256M',
    },
  ],
}
