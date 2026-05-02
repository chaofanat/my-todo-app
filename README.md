# 待办笔记

一款基于 Electron + Vue 3 + TypeScript 的桌面待办管理应用，支持 ICS 日历文件导入、待办转日程、日程打卡等功能。

## 功能特性

- **待办管理** - 创建、编辑、完成、删除待办，支持优先级和截止日期
- **ICS 日历导入** - 导入 .ics 日历文件生成日程，支持全天事件和定时事件
- **待办转日程** - 一键将待办转为日程，设置开始时间和持续时间
- **日程打卡** - 日程结束后可打卡标记完成，已打卡日程不可删除
- **双向关联** - 待办转日程后显示「计划执行中」，日程打卡后待办自动完成；删除日程恢复待办状态
- **时间冲突检测** - 自动检测同时间段内的日程冲突并显示警告
- **主题切换** - 浅色/深色/跟随系统三种主题
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
│   ├── services/            # 业务逻辑（待办服务、日程服务）
│   ├── ipc/                 # IPC 通信（频道定义、处理器）
│   ├── window/              # 窗口管理（无边框主窗口）
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
- **Service** - 业务逻辑（`main/services/`）与 IPC 处理器（`main/ipc/handlers.ts`）
- **View** - 用户界面（Vue 组件、页面、主题）
- **Bridge** - 进程桥接（`preload/index.ts` 暴露 API 给渲染进程）

## 数据存储

用户数据存储在 `%APPDATA%/todo-notes/` 目录，不随打包带走。卸载重装不会丢失数据。

## 许可证

MIT License
