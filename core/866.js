import iconv from 'iconv-lite';
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';

export function sysInfo() {
    const platform = process.platform;

    let osVersion = 'unknown';
    try {
        switch (platform) {
            case 'win32':
                osVersion = execSync('ver', { encoding: 'utf-8' }).trim();
                break;
            case 'darwin':
                osVersion = execSync('sw_vers -productVersion', { encoding: 'utf-8' }).trim();
                break;
            case 'linux':
                osVersion = execSync('cat /etc/os-release | grep PRETTY_NAME=', { encoding: 'utf-8' }).trim().replace('PRETTY_NAME=', '').replace(/"/g, '');
                break;
            default:
                osVersion = '';
        }
    } catch (e) {
        console.error('Could not determine OS version:', e.message);
    }

    if (platform === 'win32') {
        const isPs = !!process.env.PSModulePath || (process.env.ComSpec && process.env.ComSpec.includes('PowerShell'));
        return [ isPs ? 'PowerShell' : 'cmd',platform, osVersion];
    }

    const shell = process.env.SHELL || 'sh';
    return [shell, platform, osVersion];
}

/**
 * Улучшенная функция декодирования для Windows.
 * Пытается применить эвристику, специфичную для русской локали Windows.
 */
function decodeWindowsBuffer(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) return '';

    // Стратегия перебора кодировок, наиболее вероятных для RU-Windows консоли
    const encodingsToTry = ['cp866', 'cp1251', 'utf8'];

    for (const encoding of encodingsToTry) {
        try {
            const decoded = iconv.decode(buffer, encoding);
            
            // Простая эвристика: если в декодированной строке много корректной кириллицы
            // и мало "мусорных" символов замены (), считаем успехом.
            const cyrillicRegex = /[\u0400-\u04FF]/g;
            const replacementRegex = /\ufffd/g; // Символ замены (частый признак неверной кодировки)

            const cyrillicMatches = decoded.match(cyrillicRegex);
            const replacementMatches = decoded.match(replacementRegex);

            const hasCyrillic = cyrillicMatches && cyrillicMatches.length > 2;
            const hasGarbage = replacementMatches && replacementMatches.length > 0;

            // Если есть кириллица и нет явного мусора (или мусора очень мало относительно текста)
            if (hasCyrillic && !hasGarbage) {
                return decoded;
            }
            
            // Спец-case: если это точно не UTF-8 (потому что UTF-8 байты, прочитанные как UTF-8, дали кракозябры типа ╨Э)
            // Но мы уже пробуем cp866 первым. Если cp866 дал читаемый текст - возвращаем его.
        } catch (e) {
            continue;
        }
    }

    // Фоллбэк: просто toString(), если ничего не подошло
    return buffer.toString('utf8');
}

export function decode(buffer) {
    if (typeof buffer === 'string') return buffer;
    if (!Buffer.isBuffer(buffer)) return String(buffer);

    if (process.platform === 'win32') {
        return decodeWindowsBuffer(buffer);
    }

    // Для Linux/macOS обычно достаточно UTF-8
    return buffer.toString('utf8');
}

// Улучшенный тест через spawn с обработкой ошибок
function testSpawn(cmd) {
    return new Promise((resolve, reject) => {
        // Важно: в Windows лучше явно указывать оболочку, если команда сложная
        const isWin = process.platform === 'win32';
        const shellCmd = isWin ? (process.env.ComSpec || 'cmd.exe') : '/bin/sh';
        const shellArgs = isWin ? ['/c', cmd] : ['-c', cmd];

        const child = spawn(shellCmd, shellArgs, {
            env: { ...process.env }, 
            // Иногда помогает установка LANG, но в Windows это игнорируется процессами win32
        });
        
        let outputBuffer = Buffer.alloc(0);
        let errorBuffer = Buffer.alloc(0);

        child.stdout.on('data', (data) => {
            outputBuffer = Buffer.concat([outputBuffer, data]);
        });
        
        child.stderr.on('data', (data) => {
            errorBuffer = Buffer.concat([errorBuffer, data]);
        });

        child.on('close', (code) => {
            // Объединяем stdout и stderr, так как winget может писать прогресс в stderr
            const fullBuffer = Buffer.concat([outputBuffer, errorBuffer]);
            const decodedOutput = decode(fullBuffer);
            
            const cleanOutput = decodedOutput.trim();
            
            if (cleanOutput) {
                console.log(cleanOutput);
            } else {
                console.log(`Command finished with code ${code}`);
            }

            if (code !== 0 && !cleanOutput.includes('успешно') && !cleanOutput.includes('successfully')) {
                 // Не всегда код 0 означает успех в некоторых утилитах, но обычно да.
                 // Здесь мы просто резолвим, чтобы цепочка промисов не ломалась, если вывод есть.
            }
            
            resolve({ code, output: cleanOutput });
        });
        
        child.on('error', (err) => {
            reject(err);
        });
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    console.log('sysInfo:', sysInfo());
    
    if (process.platform === 'win32') {
        console.log('\n--- Тест route print ---');
        testSpawn('route print')
            .then(() => {
                console.log('\n--- Тест winget (симуляция проблемы) ---');
                // Запускаем команду, которая точно выдаст русский текст
                return testSpawn('winget search --query "7-zip" --count 1');
            })
            .catch(error => console.error('Test failed:', error.message));
    } else {
        console.log("Этот тест оптимизирован для Windows.");
    }
}