
import { spawn } from 'child_process';
import { createInterface } from 'readline';
import fs, { writeFileSync, renameSync } from 'fs';
import path from 'path';
import {dos866ToUtf8} from './866.js';

import {loadConfig} from './cfgLoaderAsync.js';
const cfg = await loadConfig();

const workspaceDir = './ag-workspace';
if (!fs.existsSync(workspaceDir)) {
  fs.mkdirSync(workspaceDir, { recursive: true });
}

const logPath = path.join(workspaceDir, 'console_log.json');
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// Состояние сессии
let sessionCwd = process.cwd();
let sessionEnv = { ...process.env };

function loadCommands() {
  const content = fs.readFileSync(logPath, 'utf8');
  return JSON.parse(content);
}

function saveLog(data) {
  const tempFile = path.join(workspaceDir, 'console_log.tmp');
  writeFileSync(tempFile, JSON.stringify(data, null, 2));
  renameSync(tempFile, logPath);
}

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

// Функция runCommand с нормальным захватом вывода и обработкой сессии
async function runCommand(cmd) {
  // Обработка специальных команд
  if (cmd.startsWith('cd ')) {
    const dir = cmd.slice(3).trim();
    const resolvedPath = path.resolve(sessionCwd, dir);
    if (fs.existsSync(resolvedPath)) {
      sessionCwd = resolvedPath;
      process.chdir(sessionCwd);
      const msg = `Текущая директория: ${sessionCwd}`;
      console.log(msg);
      return msg;
    } else {
      const msg = `cd: нет такого файла или каталога: ${dir}`;
      console.log(msg);
      return msg;
    }
  }

  if (cmd === 'pwd') {
    const msg = sessionCwd;
    console.log(msg);
    return msg;
  }

  if (cmd.startsWith('export ')) {
    const match = cmd.match(/^export\s+([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2];
      // Удалить кавычки, если они есть
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      sessionEnv[key] = value;
      process.env[key] = value;
      const msg = `Установлена переменная ${key}`;
      console.log(msg);
      return msg;
    } else {
      const msg = 'Неверный формат export. Используйте: export KEY=VALUE';
      console.log(msg);
      return msg;
    }
  }

  // Для всех остальных команд используем spawn
  return new Promise((resolve) => {
    const child = spawn(cmd, { shell: true, cwd: sessionCwd, env: sessionEnv });

    let output = '';
    child.stdout.on('data', (data) => output += data.toString());
    child.stderr.on('data', (data) => output += data.toString());

    child.on('close', (code) => {
      if (output.trim()) {
        console.log(output.trim()); // Выводим результат в консоль
        resolve(output.trim());
      } else {
        const msg = `Команда завершена с кодом ${code}`;
        console.log(msg); // Выводим сообщение в консоль
        resolve(msg);
      }
    });
  });
}

function getCurrentCommandIndex(data) {
  let commandIndex = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i].hasOwnProperty('command')) {
      if (commandIndex !== -1) {
        return commandIndex;
      }
      commandIndex = i;
    } else if (data[i].hasOwnProperty('result')) {
      if (commandIndex !== -1) {
        commandIndex = -1;
      }
    }
  }
  return commandIndex;
}

function getLastAssistantBefore(data, cmdIndex) {
  for (let i = cmdIndex - 1; i >= 0; i--) {
    if (data[i].hasOwnProperty('assistant')) {
      return data[i].assistant;
    }
  }
  return 'Без комментариев:';
}

function isCommand(input) {
  if (!input) return false;
  const firstWord = input.split(/\s+/)[0];
  return /^[a-zA-Z0-9_][a-zA-Z0-9_-]*$/.test(firstWord);
}

// Расширенный список опасных команд
function isDangerousCommand(command) {
  const dangerousCommands = [
    'rm', 'sudo', 'passwd', 'mv', 'cp', 'dd', 'kill', 'pkill', 'reboot', 'shutdown',
    'del', 'rmdir', 'format', 'diskpart', 'taskkill', 'bcdedit', 'reg', 'attrib', 
    'cipher', 'sfc', 'chkdsk', 'netsh', 'gpupdate', 'takeown', 'icacls'
  ];
  const firstWord = command.split(/\s+/)[0];
  return dangerousCommands.includes(firstWord.toLowerCase());
}

// Функция для работы с LLM API
async function askLLM(data) {
  const systemPrompt = `Ты — мой ассистент в командной строке. Ты помогаешь анализировать и управлять через терминал. Взаимодействие описано историей, которая идёт по шагам. Формат истории - json массив состоящий из объектов. Каждый объект в ней — один из этапов взаимодействия с командной строкой, это может быть команда, твой комментарий, результат выполнения команды, либо вопрос или указание от пользователя. 
Твои задачи: 
1. Понять что делается. 
2. Понять, на каком мы сейчас этапе.
3. Сгенерировать один или несколько следующих шагов с командами и пояснениями. 
4. Вернуть ответ в таком же json-формате (массив из объектов с assistant либо command, причем в assistant нельзя разметку)
  `;
  const dialog = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(data) }
    ]
  console.log(dialog)
  try {
    const response = await cfg.LLMQuery(dialog);
    console.log(response)
   // Проверяем, что это массив
    if (!Array.isArray(response)) {
      console.error("LLM вернул не массив");
      return;
    }
    
    // Проверяем, есть ли хотя бы один assistant или command
    const hasValidElement = response.some(item => 
      item.hasOwnProperty('assistant') || item.hasOwnProperty('command')
    );
    
    if (!hasValidElement) {
      console.error("LLM не вернул ни одного assistant ни command элемента");
      return;
    }
    
    // Сохраняем ответ как новые данные
    saveLog(response);
  } catch (error) {
    console.error("Ошибка при обращении к LLM API:", error.message);
  }
}

export async function processCommands() {
  let data = loadCommands();

  const commandIndex = getCurrentCommandIndex(data);
  if (commandIndex === -1) {
    console.log('✅ Все команды обработаны.');
    
    // Предлагаем ввести новую команду или запрос
    const newInput = await ask('\nВведите новую команду или запрос (или Ctrl+C для выхода): ');
    
    if (isCommand(newInput)) {
      // Добавляем новую команду
      data.push({ command: newInput, addedBy: "user" });
      saveLog(data);
      
      // Выполняем команду
      const cmdResult = await runCommand(newInput);
      data.push({ result: cmdResult });
      saveLog(data);
    } else {
      // Добавляем как пользовательский запрос
      data.push({ user: newInput });
      saveLog(data);
      await askLLM(data);
    }
    
    // Рекурсивно вызываем снова для обработки новых данных
    await processCommands();
    return;
  }

  const command = data[commandIndex].command;
  const assistantComment = getLastAssistantBefore(data, commandIndex);

  console.log(`\n💬 ${assistantComment}:`);

  // Проверяем, является ли команда опасной
  if (isDangerousCommand(command)) {
    console.log("Выполнять с осторожностью и пониманием");
  }

  console.log(`➡️ ${command}`);

  const userInput = await ask('Enter - выполнить, s - пропустить, либо своя инструкция, комментарий или команда\n> ');

  const action = userInput.trim().toLowerCase();

  if (action === 's') {
    data.splice(commandIndex + 1, 0, { result: "пропущено пользователем" });
    saveLog(data);
    await processCommands();
    return;
  }

  if (action === '') {
    const result = await runCommand(command);
    data.splice(commandIndex + 1, 0, { result: result });
    saveLog(data);
    await processCommands();
    return;
  }

  if (isCommand(userInput)) {
    data.splice(commandIndex + 1, 0, { result: "отменено пользователем" });
    data.splice(commandIndex + 2, 0, { command: userInput, addedBy:"user" });
    saveLog(data);
    const cmdResult = await runCommand(userInput);
    data.splice(commandIndex + 3, 0, { result: cmdResult });
    rl.history?.unshift(userInput);
    saveLog(data);
    await processCommands();
  } else {
    // Не-команда: вставляем после текущей команды
    data.splice(commandIndex + 1, 0, { result: "отменено пользователем" });
    data.splice(commandIndex + 2, 0, { user: userInput });
    saveLog(data); 
    await askLLM(data);
  }
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) processCommands();