// core/main.js
import { runTask } from './task.js';
import { consoleDiff } from './diff.js';
import { rollback } from './rollback.js';
import parse from './taskparser.js';
import { cfg } from './cfgloader.js';

const main = {
  runTask,
  consoleDiff,
  rollback,
  parse,
  cfg
};

export default main;

// Named exports
export {
  runTask,
  consoleDiff,
  rollback,
  parse,
  cfg
};