import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'queue_dashboard.index': { paramsTuple?: []; params?: {} }
    'queue_dashboard.stats': { paramsTuple?: []; params?: {} }
    'queue_dashboard.jobs': { paramsTuple?: []; params?: {} }
    'queue_dashboard.retry_job': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'queue_dashboard.delete_job': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'queue_dashboard.index': { paramsTuple?: []; params?: {} }
    'queue_dashboard.stats': { paramsTuple?: []; params?: {} }
    'queue_dashboard.jobs': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'queue_dashboard.index': { paramsTuple?: []; params?: {} }
    'queue_dashboard.stats': { paramsTuple?: []; params?: {} }
    'queue_dashboard.jobs': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'queue_dashboard.retry_job': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'queue_dashboard.delete_job': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}