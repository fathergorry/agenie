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

const filesToCopy = ['_config.js', '_tasks.log', '_blocks.json', 'readme.md', 'taskformat.md'];

export function install() {
  console.log('Установка в:', absTarget);
  fs.mkdirSync(absTarget, { recursive: true });
  console.log('Директория создана:', absTarget);

  for (const fileName of filesToCopy) {
    const sourceFile = path.join(sourceDir, fileName);
    const targetFile = path.join(absTarget, fileName);

    if (!fs.existsSync(targetFile)) {
      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, targetFile);
        console.log('Файл скопирован:', fileName);
      } else {
        if (fileName === '_tasks.log') {
          // Если _tasks.log нет, создаем пустой
          fs.writeFileSync(targetFile, '', 'utf8');
          console.log('Файл создан:', fileName + ' (пустой)');
        } else {
          console.error('Исходный файл не найден в:', sourceFile);
          return;
        }
      }
    } else {
      console.log('Файл уже существует, пропускаем:', fileName);
    }
  }

  console.log('✅ Установка завершена! Откройте /ag-workspace/readme.md и следуйте инструкциям:)');
}