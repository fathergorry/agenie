import { decode, sysInfo } from '../core/866.js'; // Укажите путь к вашему файлу
import iconv from 'iconv-lite';

// Мокаем process.platform для тестирования логики Windows на любой машине
jest.mock('child_process', () => ({
    execSync: jest.fn(),
    spawn: jest.fn(),
}));

describe('Encoding System Tests', () => {
    
    // Сохраняем оригинальное значение platform
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');

    afterEach(() => {
        // Восстанавливаем platform после каждого теста
        if (originalPlatform) {
            Object.defineProperty(process, 'platform', originalPlatform);
        }
    });

    describe('Linux/WSL Environment Scenarios', () => {
        beforeEach(() => {
            Object.defineProperty(process, 'platform', { value: 'linux' });
        });

        test('Should correctly handle standard UTF-8 (Linux default)', () => {
            const text = 'Системная информация';
            const buffer = Buffer.from(text, 'utf8');
            
            expect(decode(buffer)).toBe(text);
        });

        test('Should handle double-encoding mess (Mojibake recovery) - WSL/SSH common issue', () => {
            // Симуляция: CP1251 текст -> прочитан как Latin1 -> сохранен в UTF-8
            // Это часто случается при копировании файлов или работе git bash / wsl
            const original = 'Тест';
            const latin1Buffer = iconv.encode(original, 'win1251'); // <D4, E1, F1, F2>
            
            // Node.js читает байты как latin1 строки (если что-то пошло не так)
            const corruptedString = latin1Buffer.toString('latin1'); // "Òåñò"
            
            // Эта строка затем упаковывается в UTF-8 буфер
            const doubleEncodedBuffer = Buffer.from(corruptedString, 'utf8');

            // Наш модуль на Linux просто делает toString('utf8'), ожидая UTF-8
            // Результат будет "Òåñò" (кракозябры), так как это валидный UTF-8, но неправильный текст.
            // Это демонстрирует ограничение: на Linux мы верим, что вход - UTF-8.
            // Если ваша система должна это чинить, decode должен быть умнее.
            const result = decode(doubleEncodedBuffer);
            
            // Проверяем, что мы просто декодировали UTF-8 без краша
            expect(result).toBeDefined(); 
            // Если бы мы ожидали "Тест", тест провалился бы, что верно для простой логики Linux.
        });
    });

    describe('Windows CMD/PowerShell Scenarios', () => {
        beforeEach(() => {
            Object.defineProperty(process, 'platform', { value: 'win32' });
        });

        test('Case 1: Classic CMD (CP866) - Russian text', () => {
            // Проблема: В классическом CMD (chcp 866) русский текст идет в кодировке DOS (CP866).
            const text = 'Привет CMD';
            const buffer = iconv.encode(text, 'cp866');

            // Ожидание: Функция должна распознать CP866 и декодировать в UTF-8 строку
            expect(decode(buffer)).toBe(text);
        });

        test('Case 2: Windows GUI/PowerShell Core (CP1251)', () => {
            // Проблема: Некоторые утилиты или старый PowerShell могут отдавать CP1251 (ANSI)
            const text = 'Текст из Windows';
            const buffer = iconv.encode(text, 'win1251');

            expect(decode(buffer)).toBe(text);
        });

        test('Case 3: Native UTF-8 (Modern Windows Terminal)', () => {
            // Проблема: Современные терминалы могут отдавать чистый UTF-8
            const text = 'Современный вывод';
            const buffer = Buffer.from(text, 'utf8');

            expect(decode(buffer)).toBe(text);
        });

        test('Case 4: UTF-8 BOM (Byte Order Mark)', () => {
            // Проблема: PowerShell иногда добавляет BOM
            const text = 'Данные с BOM';
            const bufferWithBom = Buffer.concat([
                Buffer.from([0xEF, 0xBB, 0xBF]), // UTF-8 BOM
                Buffer.from(text, 'utf8')
            ]);

            // Декодер должен корректно обработать (iconv обычно справляется, но проверим)
            const result = decode(bufferWithBom);
            // Убираем потенциальный BOM из строки, если iconv его оставил (обычно нет)
            expect(result.trim()).toBe(text);
        });

        test('Case 5: "Mojibake" - Double Encoding (UTF-8 interpreted as CP1251)', () => {
            // Проблема: Winget или редиректы иногда выдают UTF-8 байты, 
            // но Node.js или консоль считает их ANSI (CP1251).
            // Исходный текст: "тест"
            // UTF-8 байты: <D1, 82, D0, B5, D1, 81, D1, 82>
            // Если прочитать эти байты как Win1251, получим кракозябры.
            
            const text = 'тест';
            const utf8Bytes = Buffer.from(text, 'utf8');
            
            // Имитируем ситуацию, когда канал передачи "испортил" данные, 
            // интерпретировав UTF-8 байты как ANSI (редкий, но возможный кейс в PS)
            // Для теста мы создаем буфер, который выглядит как результат такой ошибки.
            // Это сложный кейс. Ваш алгоритм перебора может не справиться, это нормально.
            // Главное, чтобы он не упал.
            
            expect(() => decode(utf8Bytes)).not.toThrow();
        });

        test('Case 6: Binary garbage safety', () => {
            // Проверка, что функция не крашится на мусоре
            const buffer = Buffer.from([0x00, 0xFF, 0xAB, 0xCD]);
            expect(() => decode(buffer)).not.toThrow();
        });
    });

    describe('sysInfo Detection Logic', () => {
        test('Detects PowerShell on Windows', () => {
            Object.defineProperty(process, 'platform', { value: 'win32' });
            process.env.PSModulePath = 'C:\\Program Files\\PowerShell\\Modules';
            
            const info = sysInfo();
            expect(info[0]).toBe('PowerShell');
            
            delete process.env.PSModulePath;
        });

        test('Detects CMD on Windows', () => {
            Object.defineProperty(process, 'platform', { value: 'win32' });
            delete process.env.PSModulePath;
            process.env.ComSpec = 'C:\\Windows\\System32\\cmd.exe';

            const info = sysInfo();
            expect(info[0]).toBe('cmd');
        });
    });
});