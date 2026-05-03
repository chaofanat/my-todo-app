// 应用常量定义

export const APP_NAME = '待办笔记';
export const APP_VERSION = '1.0.0';

// 窗口默认配置
export const WINDOW_DEFAULTS = {
  MAIN: {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
  },
  CHILD: {
    width: 600,
    height: 400,
    minWidth: 400,
    minHeight: 300,
  },
};

// IPC 频道名称
export const IPC_CHANNELS = {
  // 应用
  APP_GET_VERSION: 'app:getVersion',
  APP_GET_NAME: 'app:getName',
  APP_GET_PATH: 'app:getPath',

  // 窗口
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',
  WINDOW_CREATE: 'window:create',
  WINDOW_DESTROY: 'window:destroy',
  WINDOW_LIST: 'window:list',

  // 存储
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
  STORE_DELETE: 'store:delete',

  // 日志
  LOG_INFO: 'log:info',
  LOG_WARN: 'log:warn',
  LOG_ERROR: 'log:error',

  // 更新
  UPDATER_CHECK: 'updater:check',
  UPDATER_DOWNLOAD: 'updater:download',
  UPDATER_INSTALL: 'updater:install',
  UPDATER_UPDATE_AVAILABLE: 'updater:update-available',
  UPDATER_UPDATE_PROGRESS: 'updater:update-progress',
  UPDATER_UPDATE_DOWNLOADED: 'updater:update-downloaded',

  // 待办事项
  TODO_GET_ALL: 'todo:getAll',
  TODO_CREATE: 'todo:create',
  TODO_UPDATE: 'todo:update',
  TODO_DELETE: 'todo:delete',
  TODO_CONVERT_TO_EVENT: 'todo:convertToEvent',

  // 日程
  CALENDAR_GET_ALL: 'calendar:getAll',
  CALENDAR_IMPORT: 'calendar:import',
  CALENDAR_DELETE: 'calendar:delete',
  CALENDAR_CHECK_IN: 'calendar:checkIn',

  // MCP
  MCP_RESTART: 'mcp:restart',
} as const;

// 存储键名
export const STORE_KEYS = {
  WINDOW_BOUNDS: 'window.bounds',
  WINDOW_MAXIMIZED: 'window.maximized',
  USER_PREFERENCES: 'user.preferences',
  APP_SETTINGS: 'app.settings',
  USER_TIMEZONE: 'user.preferences.timezone',
  TODOS: 'todos',
  CALENDAR_EVENTS: 'calendarEvents',
} as const;
