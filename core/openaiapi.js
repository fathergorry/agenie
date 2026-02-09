
import * as queues from './timer.js'

export async function askVseGPT(messages, opts = {}){
  opts.url = 'https://api.vsegpt.ru/v1/chat/completions'
  return OpenaiAPI(messages,opts)
}

export async function OpenaiAPI(messages, opts = {}) {
  const { maxTokens = 4096, timeoutMs = 21_000 } = opts;
  opts.url= opts.url.trim();

  //очередь, только эта строка. Вторым аргументом указать примерно в полтора раза больше чем лимит провайдера.
  await queues.subscribeToQueue(opts.url, opts.queueMs||3800, timeoutMs) 


  const controller = new AbortController(); //реализует время ожидания
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const startTime = Date.now();
  try {
    const response = await fetch(opts.url, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model:opts.AImodel,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const endTime = Date.now();

    if (!response.ok) {
      const errorText = await response.text().catch(() => '<нет текста>');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { choices: [{ message: { content: text } }] };
    }

    let reply = data.choices[0]?.message?.content?.trim() || '(пустой ответ)';

    // Пытаемся распарсить ответ как JSON
    if (typeof reply === 'string') {
      try {
        reply = tryParseResponse(reply);
      } catch (e) {
        console.warn('⚠️ Ошибка парсинга в вызове tryParseResponse:', e.message);
        reply = { reply: reply }; // если не получилось, оборачиваем в объект
      }
    }

    const usage = data.usage || {};
    console.log('⏱️ Время ответа:', endTime - startTime, 'мс');
    if (usage.total_tokens) {
      console.log(`📊 Токены: total=${usage.total_tokens}, prompt=${usage.prompt_tokens}, completion=${usage.completion_tokens}`);
    }

    if (Array.isArray(reply)) {
      return reply;
    } else {
      return { ...reply, duration: endTime - startTime };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    console.error('⏱️ Время до ошибки:', duration, 'мс');
    if (error.name === 'AbortError') {
      throw new Error('❌ Запрос к удаленному серверу превысил таймаут (' + timeoutMs + ' мс)');
    }
    throw error;
  }
}



function tryParseResponse(str) { //Пробует распарсить строку как JSON
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn('⚠️ Ошибка парсинга в JSON.parse tryParseResponse:', e.message);
    const fixed = fixJsonKeys(str);
    return JSON.parse(fixed);
  }
}
function fixJsonKeys(str) { //Преобразует строку вида {key: "value"} в валидный JSON
  return str.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
}



import fs from 'fs';
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('🧪 Запуск тестового запроса к LLM...\n');

  const dialog = [
    { role: 'system', content: `Ты js-программист.` },
    { role: 'user', content: `создай скрипт, выводящий в консоль результат '2' + 2` }
  ];

  console.log(JSON.stringify(dialog, null, 2));
  console.log('\n⏳ Отправка запроса...\n');

  try {
    const result = await OpenaiAPI(dialog, { AImodel:'x-ai/grok-4.1-fast', apiKey: process.env.VSEGPT_API_KEY });
    console.log('\n✅ Ответ:\n', result);
    fs.writeFileSync('./sandbox/promptresult.json', JSON.stringify(result, null, 2), 'utf-8');
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
  }
}