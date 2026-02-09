#!/usr/bin/env node
import { runTask } from './task.js';
import { consoleDiff } from './diff.js';
import { rollback } from './rollback.js';
import { install } from './install.js';
import { cfg } from './cfgloader.js';

const command = process.argv[2];

switch(command) {
  case 'diff':
    consoleDiff();
    break;
  case 'rollback':
    rollback();
    break;
  case 'install':
    install();
    break;
  case undefined:
  case 'task':
    runTask();
    break;
  default:
    console.log('Неизвестная команда:', command);
    console.log('Доступно: ag [diff|rollback|install|task]');
}
