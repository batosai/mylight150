import {
  type TaskContext,
  defineConfig,
  upload,
  desc,
  task,
  get,
  set,
  local,
  cd,
  run,
  bin,
  pmInstallProd,
  before,
  after,
} from '@catapultjs/deploy'
import '@catapultjs/deploy/recipes/pm2'

// TODO migrate =>
// https://github.com/catapultjs/deploy/blob/main/recipes/adonisjs_local.ts

set('writable_dirs', ['storage', 'logs', 'tmp'])
set('shared_dirs', ['storage', 'logs', 'tmp'])
set('shared_files', ['.env'])
set('adonisjs_path', './')

desc('Builds the AdonisJS application locally')
task('deploy:build', async () => {
  const adonisjsPath = get<string>('adonisjs_path', '')
  await local('node ace build', { cwd: adonisjsPath })
  await local('cp package.json ./build', { cwd: adonisjsPath })
  await local('cp package-lock.json ./build', { cwd: adonisjsPath })
  await local('cp ecosystem.config.cjs ./build', { cwd: adonisjsPath })
})

desc('Uploads local artifacts to the release directory')
task('deploy:update_code', async ({ paths }: TaskContext) => {
  const source = get('source_path', './build/.').replace(/\/?$/, '/')
  await upload(source, paths.release)
})

desc('Installs dependencies in the release')
task('deploy:install', () => {
  cd('{{release_path}}')
  run(pmInstallProd())
})

before('deploy:lock', 'deploy:build')
after('deploy:shared', 'deploy:install')

// ---

desc('Lists the registered queue schedules')
task('queue:scheduler:list', () => {
  cd('{{current_path}}')
  run(`${bin('node')} ace queue:scheduler:list`)
})

desc('Queues a battery reading from the Android UI')
task('battery:refresh', () => {
  cd('{{current_path}}')
  run(`${bin('node')} ace battery:refresh`)
})

desc('Checks the mylight Android session')
task('mylight:status', () => {
  cd('{{current_path}}')
  run(`${bin('node')} ace mylight:status`)
})

desc('Reconnects mylight if the Android session is disconnected')
task('mylight:reconnect', () => {
  cd('{{current_path}}')
  run(`${bin('node')} ace mylight:reconnect`)
})

export default defineConfig({
  hosts: [
    {
      name: 'production',
      ssh: 'mylight150@192.168.1.117',
      deployPath: '/home/mylight150/prod',
    },
  ],
})
