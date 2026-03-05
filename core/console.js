import { spawn } from 'child_process';
import { createInterface } from 'readline';
import fs, { writeFileSync } from 'fs';
import path from 'path';
import { sysInfo, decode } from './866.js';

import { loadConfig } from './cfgLoaderAsync.js';
const cfg = await loadConfig();

// Глобальные переменные
let consoleLog = [];
let globalLogPath = path.join(cfg.workspace, 'console_log.json');

try {
  consoleLog = JSON.parse(fs.readFileSync(globalLogPath, 'utf8'));
  showResume()
} catch {
  const dir = path.dirname(globalLogPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  consoleLog = [];
  fs.writeFileSync(globalLogPath, '[]');
}

function saveLog() {
  const dir = path.dirname(globalLogPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  writeFileSync(globalLogPath, JSON.stringify(consoleLog , null, 2));
}

function showResume(){
  const resumeObjects = consoleLog.filter(item => 'resume' in item); 
  if(!resumeObjects.length) return; 
  console.log(resumeObjects[0].resume);
  //return resumeObjects[resumeObjects.length - 1].resume
  //return resumeObjects.map(obj => obj.resume || '').join('\n')
}

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

// Состояние сессии
let sessionCwd = process.cwd();
let sessionEnv = { ...process.env };

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
    let cleanCmd = cmd.trim();
    if ((cleanCmd.startsWith('"') && cleanCmd.endsWith('"')) ||
        (cleanCmd.startsWith("'") && cleanCmd.endsWith("'"))) {
      cleanCmd = cleanCmd.slice(1, -1);
    }

    const info = sysInfo();
    const isPowerShell = info.includes('PowerShell');

    let commandToRun, args = [];
    if (isPowerShell) {
      commandToRun = 'powershell.exe';
      args = ['-Command', cleanCmd];
    } else {
      commandToRun = cleanCmd;
    }

    const child = spawn(commandToRun, args, {
      shell: !isPowerShell,
      cwd: sessionCwd,
      env: sessionEnv
    });

    let outputBuffer = Buffer.alloc(0);
    child.stdout.on('data', (data) => {
      outputBuffer = Buffer.concat([outputBuffer, data]);
    });
    child.stderr.on('data', (data) => {
      outputBuffer = Buffer.concat([outputBuffer, data]);
    });

    child.on('close', (code) => {
      const decodedOutput = decode(outputBuffer);
      if (decodedOutput.trim()) {
        console.log(decodedOutput.trim());
        resolve(decodedOutput.trim());
      } else {
        const msg = `Команда завершена с кодом ${code}`;
        console.log(msg);
        resolve(msg);
      }
    });
  });
}

function getCurrentCommandIndex() {
  let commandIndex = -1;
  for (let i = 0; i < consoleLog.length; i++) {
    if (consoleLog[i].hasOwnProperty('command')) {
      if (commandIndex !== -1) {
        return commandIndex;
      }
      commandIndex = i;
    } else if (consoleLog[i].hasOwnProperty('result')) {
      if (commandIndex !== -1) {
        commandIndex = -1;
      }
    }
  }
  return commandIndex;
}

function getLastAssistantBefore(cmdIndex) {
  for (let i = cmdIndex - 1; i >= 0; i--) {
    if (consoleLog[i].hasOwnProperty('assistant')) {
      return consoleLog[i].assistant;
    }
  }
  return 'Без комментариев:';
}

function isCommand(input) {
  if (!input) return false;
  const firstWord = input.split(/\s+/)[0];
  return /^[a-zA-Z0-9_][a-zA-Z0-9_-]*$/.test(firstWord);
}

function isDangerousCommand(command) {
  const dangerousCommands = [
    'rm', 'sudo', 'passwd', 'mv', 'cp', 'dd', 'kill', 'pkill', 'reboot', 'shutdown',
    'del', 'rmdir', 'format', 'diskpart', 'taskkill', 'bcdedit', 'reg', 'attrib',
    'cipher', 'sfc', 'netsh', 'gpupdate', 'takeown', 'icacls'
  ];
  const firstWord = command.split(/\s+/)[0];
  return dangerousCommands.includes(firstWord.toLowerCase());
}

async function askLLM(aiCommand) {
  let _resume = '';
  if(aiCommand !== 'new' && consoleLog.length >= 2) {
      _resume = '{"resume":"Содержание и анализ переданного документа, и список использованных команд, чтобы не повторять."},';
  }
  let systemPrompt = `Ты — мой ассистент в командной строке ${JSON.stringify(sysInfo())}. Ты помогаешь анализировать и управлять через терминал. Взаимодействие описано историей, которая идёт по шагам. Формат истории - json массив состоящий из объектов. Каждый объект в ней — один из этапов взаимодействия с командной строкой, это может быть команда, твой комментарий, результат выполнения команды, либо вопрос или указание от пользователя. 
Твои задачи: 
1. Понять что делается. 
2. Понять, на каком мы сейчас этапе.
3. Сгенерировать один или несколько следующих шагов с командами и пояснениями. 
4. Вернуть ответ в аналогичном json-формате: [
  ${_resume}
  {"assistant":"твой комментарий к нижеследующей команде"},
  {"command":"console command"},
  {"assistant":"комментарий к команде 2"},
  {"command":"консольная команда 2..."}
] То есть command всегда идет после assistant.
Тебе нельзя создавать строки с "user", они могут быть только во входящем файле - это замечания и вопросы пользователя. 
  `;
  const dialog = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(consoleLog) }
    ]
  console.log('Ожидаем ответа LLM, шагов отправлено:', consoleLog.length)

  const response = await cfg.LLMQuery(dialog);
  console.log(response)

  if (!Array.isArray(response)) {
    throw new Error("LLM вернул не массив");
  }

  const hasValidElement = response.some(item =>
    item.hasOwnProperty('assistant') || item.hasOwnProperty('command')
  );
  if (!hasValidElement) {
    throw new Error("LLM не вернул ни одного assistant ни command элемента");
  }

  consoleLog = response;
  showResume();
  saveLog();
}

export async function processCommands() {
  while (true) {
    const commandIndex = getCurrentCommandIndex();

    let input;
    if (commandIndex === -1) {
      // Очередь команд пуста — можно начать новую или продолжить
      console.log('✅ Все команды обработаны. Можно начать новый сеанс (со слова new) или продолжить.');
      input = await ask('\nВведите "new инструкция", команду или запрос (или Ctrl+C): ');
    } else {
      // Есть незавершенная команда — спрашиваем, что делать
      const command = consoleLog[commandIndex].command;
      const assistantComment = getLastAssistantBefore(commandIndex);
      console.log(`\n💬 ${assistantComment}:\n➡️ ${command}`);
      input = await ask('Enter - выполнить, s - пропустить, либо своя команда/запрос\n> ');
    }

    // Проверяем, начинается ли ввод с 'new'
    const trimmedInput = input.trim();
    const parts = trimmedInput.split(/\s+/);
    const firstWord = parts[0];

    if (firstWord === "new") {
      // Сбрасываем историю
      consoleLog = [];
      const instruction = parts.slice(1).join(' ');
      if (instruction) {
        consoleLog.push({ user: instruction });
        await askLLM('new');
      }
      continue;
    }

    // Если ввод пустой и есть команда для выполнения
    if (trimmedInput === '' && commandIndex !== -1) {
      const command = consoleLog[commandIndex].command;
      const result = await runCommand(command);
      consoleLog.splice(commandIndex + 1, 0, { result });
      saveLog();
      continue;
    }

    // Если ввод 's' и есть команда для пропуска
    if (trimmedInput === 's' && commandIndex !== -1) {
      consoleLog.splice(commandIndex + 1, 0, { result: "пропущено пользователем" });
      saveLog();
      continue;
    }

    // Если ввод — своя команда (и не 's' и не 'new')
    if (isCommand(trimmedInput)) {
      // Если была ИИ-команда, помечаем её как пропущенную
      if (commandIndex !== -1) {
        consoleLog.splice(commandIndex + 1, 0, { result: "пропем" });
      }
      // Выполняем свою команду
      const result = await runCommand(trimmedInput);
      consoleLog.push({ command: trimmedInput, addedBy: "user" });
      consoleLog.push({ result });
      saveLog();
      continue;
    }

    // Если не 'new', не 's', не пустой ввод, и не команда — значит это запрос к ИИ
    consoleLog.push({ user: trimmedInput });
    await askLLM();
  }
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

