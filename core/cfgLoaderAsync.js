import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { install } from './install.js';

import * as ai from './openaiapi.js'
globalThis.ai = ai

const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), 'ag-workspace/_config.js');

function createProxyForBlocks(cfg) {
  if (!cfg.blocks) return cfg;

  const blockProxies = {};
  for (const [blockName, blockConfig] of Object.entries(cfg.blocks)) {
    blockProxies[blockName] = new Proxy(blockConfig, {
      get(target, prop) {
        if (prop === 'LLMQuery') {
          if (typeof target[prop] === 'function') {
            return target[prop];
          }
          return cfg.LLMQuery;
        }
        return target[prop];
      }
    });
  }

  return { ...cfg, blocks: blockProxies };
}

export async function loadConfig(configPath = DEFAULT_CONFIG_PATH) {
  if (!fs.existsSync(configPath)) {
    //install()
   throw new Error('Отсутствует конфиг. Выполните ag install')
  }

  const importUrl = pathToFileURL(configPath).href;
  const module = await import(importUrl);
  const rawConfig = module.cfg || {};

  return createProxyForBlocks(rawConfig);
}