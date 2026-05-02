# 待办笔记 - 开发文档

## 项目概述

待办笔记是一款基于 Electron 的桌面待办管理应用，支持 ICS 日历文件导入、待办转日程、日程打卡等功能。采用 MSVB 架构（Model → Service → View → Bridge）。

## 技术栈

- **Electron 29** + **Electron Forge** - 桌面应用框架与打包
- **Vue 3** (Composition API) + **TypeScript** - 前端框架
- **Vite 5** - 构建工具
- **Pinia** - 状态管理
- **electron-store** - 本地持久化存储
- **ical.js** - ICS 日历文件解析
- **electron-log** - 日志系统

## 项目结构

```
├── src/
│   ├── main/                       # 主进程
│   │   ├── index.ts                # 应用入口
│   │   ├── services/               # 业务逻辑
│   │   │   ├── todoService.ts      # 待办 CRUD + 转日程
│   │   │   └── calendarService.ts  # 日程 CRUD + 打卡 + 关联
│   │   ├── ipc/
│   │   │   ├── channels.ts         # IPC 频道常量
│   │   │   └── handlers.ts         # IPC 处理器注册
│   │   ├── window/
│   │   │   ├── MainWindow.ts       # 无边框主窗口
│   │   │   └── WindowManager.ts    # 窗口管理器
│   │   ├── tray/index.ts           # 系统托盘
│   │   ├── store/index.ts          # electron-store 配置
│   │   ├── logger/index.ts         # 日志系统
│   │   ├── updater/index.ts        # 自动更新
│   │   ├── menu/index.ts           # 应用菜单
│   │   └── types/ical.js.d.ts      # ical.js 类型声明
│   ├── preload/
│   │   └── index.ts                # 预加载脚本（Bridge 层）
│   ├── renderer/                   # 渲染进程（Vue 3）
│   │   └── src/
│   │       ├── App.vue             # 根组件（含自定义标题栏）
│   │       ├── views/
│   │       │   ├── TodoView.vue    # 主页（待办 + 日程统一视图）
│   │       │   └── SettingsView.vue # 设置页
│   │       ├── components/
│   │       │   ├── TodoItem.vue    # 待办项组件
│   │       │   └── CalendarEventItem.vue # 日程项组件
│   │       ├── composables/
│   │       │   └── useTheme.ts     # 主题管理
│   │       ├── styles/
│   │       │   ├── main.css        # 全局样式
│   │       │   └── theme.css       # 主题变量（浅色/深色）
│   │       └── router/index.ts     # 路由配置
│   └── shared/                     # 主进程与渲染进程共享
│       ├── types.ts                # 类型定义（Todo, CalendarEvent, IPCChannels）
│       └── constants.ts            # 常量与 IPC 频道
├── resources/
│   └── icon.ico                    # 应用图标
├── forge.config.ts                 # Electron Forge 配置
├── vite.main.config.ts             # 主进程构建配置
├── vite.preload.config.ts          # 预加载脚本构建配置
└── vite.renderer.config.ts         # 渲染进程构建配置
```

## 开发指南

### 启动开发服务器

```bash
npm install
npm run dev
```

### 构建和打包

```bash
npm run build    # 打包应用
npm run make     # 创建安装包（自动先执行 package）
```

### 代码规范

```bash
npm run lint       # 检查
npm run lint:fix   # 自动修复
npm run format     # 格式化
```

## 架构：MSVB 模式

```
数据层 → 服务层 → 视图层 → 桥接层
Model  → Service → View  → Bridge
```

| 层级 | 职责 | 位置 |
|------|------|------|
| **Model** | 数据定义与存储 | `src/shared/types.ts`、`src/main/store/` |
| **Service** | 业务逻辑 | `src/main/services/`、`src/main/ipc/handlers.ts` |
| **View** | 用户界面 | `src/renderer/src/views/`、`src/renderer/src/components/` |
| **Bridge** | 进程桥接 | `src/preload/index.ts`、`src/shared/constants.ts` |

### 添加新功能流程

```
1. Model   → 在 shared/types.ts 定义数据类型
2. Service → 在 services/ 实现业务逻辑，在 ipc/handlers.ts 注册处理器
3. View    → 创建 Vue 组件和页面
4. Bridge  → 在 preload/index.ts 暴露 API，在 shared/constants.ts 定义频道
```

## 核心功能

### 待办管理

- 创建、编辑、删除、完成待办
- 优先级（低/中/高）和截止日期
- 待办转日程（设置开始时间 + 持续时间）
- 转换后待办显示「计划执行中」状态，日程打卡后自动完成

### 日程管理

- 导入 ICS 日历文件
- 按时间分组显示（今天/明天/具体日期）
- 进行中/已结束/已打卡状态区分
- 时间冲突检测与警告
- 打卡功能（不强制）
- 已打卡日程不可删除；删除未打卡日程会恢复关联待办

### 窗口与界面

- 无边框窗口 + 自定义标题栏（集成最小化/最大化/关闭按钮）
- 浅色/深色/跟随系统主题（日式侘寂风格）
- 系统托盘（最小化到托盘、双击恢复、右键菜单）
- 窗口状态持久化（位置、大小、最大化）

### IPC 频道

| 分类 | 频道 | 说明 |
|------|------|------|
| 应用 | `app:getVersion` `app:getName` `app:getPath` | 应用信息 |
| 窗口 | `window:minimize` `window:maximize` `window:close` | 窗口控制 |
| 存储 | `store:get` `store:set` `store:delete` | 数据持久化 |
| 待办 | `todo:getAll` `todo:create` `todo:update` `todo:delete` `todo:convertToEvent` | 待办操作 |
| 日程 | `calendar:getAll` `calendar:import` `calendar:delete` `calendar:checkIn` | 日程操作 |

### 数据存储

用户数据存储在 `%APPDATA%/todo-notes/` 目录（electron-store），不随打包带走：

- `window.bounds` / `window.maximized` - 窗口状态
- `user.preferences.theme` - 主题偏好
- `user.preferences.startupBehavior` - 启动行为
- `app.settings.closeToTray` / `app.settings.autoUpdate` - 应用设置
- `data.todos` - 待办列表
- `data.calendarEvents` - 日程列表

### 日志

使用 electron-log，日志文件位于 `%APPDATA%/todo-notes/logs/`。

## AI 智能体指引

### 注意事项

1. 渲染进程不能直接访问 Node.js API，必须通过 IPC
2. 预加载脚本使用 `contextBridge` 暴露 API
3. 所有 IPC 通信必须有 TypeScript 类型定义
4. 日程删除返回 `{ success: boolean; reason?: string }` 而非布尔值
5. 待办与日程之间通过 `linkedEventUid` 和 `sourceTodoId` 双向关联
6. 打包资源需在 `forge.config.ts` 的 `extraResource` 中配置

## 故障排查

### 依赖安装失败

```powershell
proxy                          # 开启代理
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
npm install
```

### 常见问题

1. **应用无法启动** - 检查 Node.js 版本（推荐 18+），删除 `node_modules` 重新安装
2. **IPC 调用失败** - 检查频道名称是否一致，重启应用使主进程重新加载
3. **托盘图标空白** - 确认 `resources/icon.ico` 存在且 `forge.config.ts` 配置了 `extraResource`
4. **构建失败** - 运行 `npm run lint` 检查代码规范

## 相关文档

- [Electron 文档](https://www.electronjs.org/docs)
- [Vue 3 文档](https://vuejs.org/guide/introduction.html)
- [Electron Forge 文档](https://www.electronforge.io/)
- [Vite 文档](https://vitejs.dev/)
