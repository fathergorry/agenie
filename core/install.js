// ./core/install.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к исходной директории ag-workspace в проекте aigenie
const sourceDir = path.resolve(__dirname, '../ag-workspace');
const targetDir = './ag-workspace/';
const absTarget = path.resolve(targetDir);

export function install() {
  console.log('Установка в:', absTarget);
  fs.mkdirSync(absTarget, { recursive: true });
  console.log('Директория создана:', absTarget);

  // Копируем _config.js из исходника, если не существует
  const sourceConfigFile = path.join(sourceDir, '_config.js');
  const targetConfigFile = path.join(absTarget, '_config.js');

  if (!fs.existsSync(targetConfigFile)) {
    if (fs.existsSync(sourceConfigFile)) {
      fs.copyFileSync(sourceConfigFile, targetConfigFile);
      console.log('Файл скопирован: _config.js');
    } else {
      console.error('Исходный файл _config.js не найден в:', sourceConfigFile);
      return;
    }
  } else {
    console.log('Файл уже существует, пропускаем: _config.js');
  }

  // Копируем _tasks.log из исходника, если не существует
  const sourceLogFile = path.join(sourceDir, '_tasks.log');
  const targetLogFile = path.join(absTarget, '_tasks.log');

  if (!fs.existsSync(targetLogFile)) {
    if (fs.existsSync(sourceLogFile)) {
      fs.copyFileSync(sourceLogFile, targetLogFile);
      console.log('Файл скопирован: _tasks.log');
    } else {
      // Если файла нет, можно создать пустой
      fs.writeFileSync(targetLogFile, '', 'utf8');
      console.log('Файл создан: _tasks.log (пустой)');
    }
  } else {
    console.log('Файл уже существует, пропускаем: _tasks.log');
  }

  console.log('✅ Установка завершена! Откройте /ag-workspace/readme.md и следуйте инструкциям:)');
}