import * as nogit from '../core/nogit.js';
import fs from 'fs';
import path from 'path';

const testFile = './sandbox/test-nogit.js';

const testContent = 'test content';

beforeEach(() => {
  if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
});

afterEach(() => {
  if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
});

test('fileMapper extracts FILE entries', () => {
  const input = {
    comment: 'test',
    'FILE:./test.js': 'content',
    other: 'data'
  };
  const result = nogit.fileMapper(input);
  expect(result['./test.js']).toBe('content');
  expect(result.comment).toBeUndefined();
});