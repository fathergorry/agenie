#!/usr/bin/env node

//import { runTask } from './task.js';
import { consoleDiff } from './diff.js';
import { rollback } from './rollback.js';
import { cfg } from './cfgloader.js';

console.log(process.argv)
console.log(process.cwd())