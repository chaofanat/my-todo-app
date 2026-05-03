# 待办笔记

一款基于 Electron + Vue 3 + TypeScript 的桌面待办管理应用，支持 ICS 日历文件导入、待办转日程、日程打卡、MCP 服务等功能。

## 功能特性

- **待办管理** - 创建、编辑、完成、删除待办，支持优先级和截止日期
- **ICS 日历导入** - 导入 .ics 日历文件生成日程，支持全天事件和定时事件
- **待办转日程** - 一键将待办转为日程，设置开始时间和持续时间
- **日程打卡** - 日程结束后可打卡标记完成，已打卡日程不可删除
- **双向关联** - 待办转日程后显示「计划执行中」，日程打卡后待办自动完成；删除日程恢复待办状态
- **时间冲突检测** - 自动检测同时间段内的日程冲突并显示警告
- **MCP 服务** - 内置 MCP Server，AI 助手可直接操作待办和日程数据
- **主题切换** - 浅色/深色/跟随系统三种主题
- **时区管理** - 支持设置时区，统一 UTC 存储与本地显示，MCP 工具校验时区一致性
- **系统通知** - 待办到期提醒、日程开始提醒，支持开关
- **系统托盘** - 支持最小化到托盘，双击恢复窗口
- **窗口状态记忆** - 自动保存和恢复窗口位置、大小
- **无边框窗口** - 自定义标题栏，集成窗口控制按钮

## 技术栈

- **Electron 29** + **Electron Forge** - 桌面应用框架与打包
- **Vue 3** (Composition API) + **TypeScript** - 前端框架
- **Vite 5** - 构建工具
- **Pinia** - 状态管理
- **electron-store** - 本地数据持久化
- **ical.js** - ICS 日历文件解析
- **@modelcontextprotocol/sdk** - MCP 协议实现
- **express** - MCP 服务 HTTP 传输层

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 打包应用
npm run build

# 创建安装包
npm run make
```

### 网络问题处理

如果 `npm install` 时遇到 Electron 下载失败：

```powershell
# Windows PowerShell
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
npm install
```

## 项目结构

```
src/
├── main/                    # 主进程
│   ├── services/            # 业务逻辑（待办服务、日程服务、通知服务）
│   ├── ipc/                 # IPC 通信（频道定义、处理器）
│   ├── mcp/                 # MCP 服务（Streamable HTTP + SSE 双传输）
│   ├── window/              # 窗口管理（无边框主窗口）
├── shared/                  # 主进程与渲染进程共享
│   ├── types.ts             # 类型定义
│   ├── constants.ts         # 常量与 IPC 频道
│   └── timezone.ts          # 时区工具模块
│   ├── tray/                # 系统托盘
│   ├── store/               # 数据存储
│   └── logger/              # 日志系统
├── preload/                 # 预加载脚本（Bridge 层）
├── renderer/                # 渲染进程（Vue 3）
│   └── src/
│       ├── views/           # 页面（主页、设置）
│       ├── components/      # 组件（待办项、日程项）
│       ├── composables/     # 组合式函数（主题）
│       └── styles/          # 样式（全局样式、主题变量）
└── shared/                  # 共享代码（类型定义、常量）
```

## 架构

采用 MSVB（Model → Service → View → Bridge）模式：

- **Model** - 数据类型定义（`shared/types.ts`）与持久化存储（`electron-store`）
- **Service** - 业务逻辑（`main/services/`）与 IPC 处理器（`main/ipc/handlers.ts`）与 MCP 工具（`main/mcp/`）
- **View** - 用户界面（Vue 组件、页面、主题）
- **Bridge** - 进程桥接（`preload/index.ts` 暴露 API 给渲染进程）

## MCP 服务

应用内置 MCP Server，允许 AI 助手（Claude Desktop、Cursor 等）通过 MCP 协议直接操作待办和日程数据。

### 传输方式

| 传输类型 | 端点 | 适用场景 |
|----------|------|----------|
| Streamable HTTP | `http://127.0.0.1:3000/mcp` | 推荐，新版客户端 |
| SSE | `http://127.0.0.1:3000/sse` | 旧版客户端兼容 |

默认关闭，需在设置页手动启用。仅绑定 `127.0.0.1`，支持可选 Bearer Token 鉴权。

### 可用工具

| 工具 | 说明 |
|------|------|
| `todo_list` | 获取所有待办 |
| `todo_create` | 创建待办 |
| `todo_update` | 更新待办 |
| `todo_delete` | 删除待办 |
| `todo_convertToEvent` | 待办转日程 |
| `calendar_list` | 获取所有日程 |
| `calendar_create` | 创建日程 |
| `calendar_createBatch` | 批量创建日程 |
| `calendar_delete` | 删除日程 |
| `calendar_checkIn` | 日程打卡/取消打卡 |

### 客户端配置

Claude Desktop 或 Cursor 配置示例：

```json
{
  "mcpServers": {
    "todo-notes": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

如设置了 API Key：

```json
{
  "mcpServers": {
    "todo-notes": {
      "url": "http://127.0.0.1:3000/mcp",
      "headers": {
        "Authorization": "Bearer your-api-key"
      }
    }
  }
}
```

### 时区与时间参数

应用统一使用 **UTC** 存储时间，按用户设定时区显示。MCP 工具对时间参数执行时区校验：

- 传入**无时区后缀**的时间（如 `2026-05-03T10:00:00`）：按应用设定时区解释
- 传入**与应用时区一致的偏移**（如 `+08:00` 且应用设为 Asia/Shanghai）：正常处理
- 传入**不一致的偏移或 UTC（Z）**：返回错误，提示时区不匹配

用户数据存储在 `%APPDATA%/todo-notes/` 目录，不随打包带走。卸载重装不会丢失数据。

## 许可证

MIT License
