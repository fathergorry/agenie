/** @type {import('jest').Config} */
export default {
  // Убираем эту строку: extensionsToTreatAsEsm: ['.js'],
  
  // Отключаем трансформацию по умолчанию для ES-модулей
  transform: {},
  
  // Для работы с ES-модулями
  testEnvironment: 'node',
  
  // Исправляем проблему с дублированием имени пакета
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  
  // Убираем конфликты имен
  roots: ['<rootDir>/tests'],
  
  // Указываем, что используем ESM режим
  moduleFileExtensions: ['js', 'json'],
};