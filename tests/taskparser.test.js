import parse from '../core/taskparser.js';
import { cfg } from '../core/cfgloader.js';
import fs from 'fs';

const TASKS_PATH = cfg.workspace + '_tasks.log';

const originalContent = fs.readFileSync(TASKS_PATH, 'utf8');

const testPrompt = '@PROMPT listing==test files==file1,,file2\nTest task content';

beforeEach(() => {
  fs.writeFileSync(TASKS_PATH, testPrompt);
});

afterEach(() => {
  fs.writeFileSync(TASKS_PATH, originalContent);
});

test('parse extracts PROMPT and params', () => {
  const result = parse(cfg);
  expect(result.listing).toBe('test');
  expect(result.files).toEqual(['file1', 'file2']);
  expect(result.PROMPT).toBe('Test task content');
});