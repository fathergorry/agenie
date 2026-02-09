// core/cfgloader.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url'; // Добавлено

const getCurrentDir = () => {
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(__filename);
};

const DEFAULT_CONFIG_PATH = path.resolve(getCurrentDir(), '../ag-workspace/_config.js');

function createProxyForBlocks(cfg) {
  if (!cfg.blocks) return cfg;

  const blockProxies = {};
  for (const [blockName, blockConfig] of Object.entries(cfg.blocks)) {
    blockProxies[blockName] = new Proxy(blockConfig, {
      get(target, prop) {
        if (prop === 'LLMQuery') {
          if (typeof target[prop] === 'function') {
            return target[prop]; // используем LLMQuery из блока, если он есть
          }
          return cfg.LLMQuery; // иначе fallback на глобальный
        }
        return target[prop];
      }
    });
  }

  return { ...cfg, blocks: blockProxies };
}

async function loadConfig(configPath = DEFAULT_CONFIG_PATH) {
  let userConfig = {};
  if (fs.existsSync(configPath)) {
    try {
      // Используем pathToFileURL для корректного преобразования
      const importUrl = pathToFileURL(configPath).href;
      const module = await import(importUrl);
      userConfig = module.cfg || {};
    } catch (e) {
      console.warn(`[cfgloader] Warning: Could not load config from ${configPath} Using defaults.`, e);
    }
  }

  const defaultConfig = {
    backups: './ag-backups/',
    workspace: './ag-workspace/',
    listext: '.mjs'
  };

  const mergedConfig = { ...defaultConfig, ...userConfig };
  return createProxyForBlocks(mergedConfig);
}

const cfg = await loadConfig();

export { cfg };