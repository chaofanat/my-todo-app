import { app } from 'electron';
import path from 'path';
import { execSync } from 'child_process';

function runSquirrelCommand(args: string[]): boolean {
  try {
    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
    execSync(`"${updateDotExe}" ${args.join(' ')}`, { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

export function handleSquirrelEvent(): boolean {
  if (process.argv.length === 1) {
    return false;
  }

  const squirrelEvent = process.argv[1];

  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      runSquirrelCommand(['--createShortcut', path.basename(process.execPath)]);
      app.exit(0);
      return true;

    case '--squirrel-uninstall':
      runSquirrelCommand(['--removeShortcut', path.basename(process.execPath)]);
      app.exit(0);
      return true;

    case '--squirrel-obsolete':
      app.exit(0);
      return true;

    default:
      return false;
  }
}
