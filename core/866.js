export function dos866ToUtf8(str) {
    const rusMap = {
        // Заглавные (А-Я)
        0x80: 'А', 0x81: 'Б', 0x82: 'В', 0x83: 'Г', 0x84: 'Д', 0x85: 'Е', 0x86: 'Ж', 0x87: 'З',
        0x88: 'И', 0x89: 'Й', 0x8A: 'К', 0x8B: 'Л', 0x8C: 'М', 0x8D: 'Н', 0x8E: 'О', 0x8F: 'П',
        0x90: 'Р', 0x91: 'С', 0x92: 'Т', 0x93: 'У', 0x94: 'Ф', 0x95: 'Х', 0x96: 'Ц', 0x97: 'Ч',
        0x98: 'Ш', 0x99: 'Щ', 0x9A: 'Ъ', 0x9B: 'Ы', 0x9C: 'Ь', 0x9D: 'Э', 0x9E: 'Ю', 0x9F: 'Я',
        // Строчные (а-я)
        0xA0: 'а', 0xA1: 'б', 0xA2: 'в', 0xA3: 'г', 0xA4: 'д', 0xA5: 'е', 0xA6: 'ж', 0xA7: 'з',
        0xA8: 'и', 0xA9: 'й', 0xAA: 'к', 0xAB: 'л', 0xAC: 'м', 0xAD: 'н', 0xAE: 'о', 0xAF: 'п',
        0xB0: 'р', 0xB1: 'с', 0xB2: 'т', 0xB3: 'у', 0xB4: 'ф', 0xB5: 'х', 0xB6: 'ц', 0xB7: 'ч',
        0xB8: 'ш', 0xB9: 'щ', 0xBA: 'ъ', 0xBB: 'ы', 0xBC: 'ь', 0xBD: 'э', 0xBE: 'ю', 0xBF: 'я',
        // Ё/ё
        0xF0: 'Ё', 0xF1: 'ё'
    };

    let result = '';
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        result += rusMap[code] || str[i];
    }
    return result;
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) { //self-testing
    console.log(dos866ToUtf8('\x80\x81\x82\x83\x84 - \x90\x91\x92\x93\x94\x95'))
}