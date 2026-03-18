#!/usr/bin/env node

const command = process.argv[2];

switch(command) {
  case 'sh':
    import('./console.js').then(({ processCommands }) => processCommands(process.argv[3]));
    break;
  case 'install':
    // Загружаем install.js только тут, чтобы не грузились другие зависимости
    import('./install.js').then(({ install }) => install());
    break;
  case 'dirtst':
    import('../sandbox/dirtest.js').then(({ dirtst }) => dirtst());
    break;
  case 'diff':
    import('./diff.js').then(({ consoleDiff }) => consoleDiff());
    break;
  case 'rollback':
    import('./rollback.js').then(({ rollback: rollbackFn }) => rollbackFn());
    break;
  case undefined:
  case 'task':
    import('./task.js').then(({ runTask }) => runTask());
    break;
  case 'list':
    import('./task.js').then(({ runTask }) => runTask());
    break;
  default:
    console.log('Неуместная команда:', command);
    console.log('Доступно: ag [diff|rollback|install|task|list]');
}