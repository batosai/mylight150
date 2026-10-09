/*
|--------------------------------------------------------------------------
| Scheduler
|--------------------------------------------------------------------------
|
| This file is used to define scheduled jobs. You can schedule jobs to run
| at specific intervals using cron expressions or duration strings.
|
| Example:
|
|   import SendWeeklyReport from '#jobs/send_weekly_report'
|
|   SendWeeklyReport.schedule({ userId: 1 })
|     .cron('0 9 * * MON')
|     .run()
|
*/

import { Schedule } from '@adonisjs/queue'
import RefreshBattery from '#jobs/refresh_battery'

await RefreshBattery.schedule({}).id('mylight-battery-refresh').every('5m')

// Remove the persisted schedule from before the battery job was renamed.
for (const schedule of await Schedule.list()) {
  if (schedule.name === 'CreateScreenshot') await schedule.delete()
}
