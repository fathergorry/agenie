#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Получаем правильный путь к текущему файлу
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Импортируем cfg
import {cfg} from './cfgloader.js';

// Правильный путь к корню модуля (поднимаемся из core/)
const moduleRoot = path.dirname(__dirname);

const srcFiles = {
  '_config.js': path.join(moduleRoot, cfg.workspace, '_config.js'),
  '_tasks.log': path.join(moduleRoot, cfg.workspace, '_tasks.log')
};

// Всегда устанавливаем в ag-workspace
const targetDir = 'ag-workspace';
const absTarget = path.resolve(targetDir);

console.log('Установка в:', absTarget);

// Создаем директорию
fs.mkdirSync(absTarget, { recursive: true });
console.log('Директория создана:', absTarget);

// Копируем файлы только если их нет
for (const [fileName, srcPath] of Object.entries(srcFiles)) {
  // Проверяем существование исходного файла
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Исходный файл не найден: ${srcPath}`);
  }
  
  const targetFile = path.join(absTarget, fileName);
  
  // Копируем только если целевого файла нет
  if (!fs.existsSync(targetFile)) {
    fs.copyFileSync(srcPath, targetFile);
    console.log(`Файл скопирован: ${fileName}`);
  } else {
    console.log(`Файл уже существует, пропускаем: ${fileName}`);
  }
}

console.log('✅ Установка завершена! Откройте /ag-workspace/readme.md и следуйте инструкциям:)');