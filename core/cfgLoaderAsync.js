import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv'; 






dotenv.config({ debug:false, quiet: true });

import * as ai from './openaiapi.js'
globalThis.ai = ai

const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), 'ag-workspace/_config.js');
const BLOCKS_PATH = path.resolve(process.cwd(), 'ag-workspace/_blocks.json');

export async function loadConfig(configPath = DEFAULT_CONFIG_PATH) {
  if (!fs.existsSync(configPath)) {
    throw new Error('Отсутствует конфиг. Выполните ag install')
  }

  const importUrl = pathToFileURL(configPath).href;
  const module = await import(importUrl);
  const cfg = module.cfg 

  // Загружаем блоки из отдельного файла
  if (fs.existsSync(BLOCKS_PATH)) {
    const blocksData = fs.readFileSync(BLOCKS_PATH, 'utf8');
    cfg.blocks = JSON.parse(blocksData);
  } else {
    throw new Error ('No _blocks.json. Run ag install')
  }
  if(Array.isArray(cfg.envFiles)){
    cfg.envFiles.forEach(file=>{
      //console.log('env: ',file)
      dotenv.config({ path: file});
    })
  } 
  cfg.blocks['none'] = {"index":[]}
  //console.log('envp: ', process.env)

  // Назначаем LLMQuery для каждого блока

    for (const [blockName, blockConfig] of Object.entries(cfg.blocks)) {
      const fnName = blockConfig.LLMQuery || null;
      if (typeof fnName === 'string') {
        // Ищем функцию в cfg по имени
        if (typeof cfg[fnName] === 'function') {
          blockConfig.LLMQuery = cfg[fnName];
        } else {
          // Если не найдена, используем общую LLMQuery
          blockConfig.LLMQuery = cfg.LLMQuery;
        }
      } else {
        // Если LLMQuery не функция и не строка, используем общую
        blockConfig.LLMQuery = cfg.LLMQuery;
      }
    }
  

  return cfg;
}