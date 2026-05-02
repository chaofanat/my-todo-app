import { Tray, Menu, nativeImage, app, dialog } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';
import { WindowManager } from '../window/WindowManager';
import type { Logger } from 'electron-log';

let tray: Tray | null = null;

export function setupTray(windowManager: WindowManager, logger: Logger): void {
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'icon.ico')
    : join(app.getAppPath(), 'resources/icon.ico');

  let icon: Electron.NativeImage;
  if (existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    logger.warn('托盘图标不存在:', iconPath);
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('待办笔记');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: '关于',
      click: () => {
        dialog.showMessageBox({
          type: 'info',
          title: '关于',
          message: '待办笔记',
          detail: `版本: ${app.getVersion()}\n支持 ICS 日历导入的待办管理应用`,
          buttons: ['确定'],
        });
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  logger.info('系统托盘已初始化');
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
