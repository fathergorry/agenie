//Конфигурационный файл, по работе с самим проектом см readme.md

import url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
import * as ai from '../core/openaiapi.js' //для написания своего интерфейса просто скормите этот файл нейросети вместе с описанием API вашей нейросети.

function  VseGPT(prompt, opts={}) {
  const models = { //это модели из vsegpt api, у вас может быть другой список
    1: { id: 'openai/gpt-4o-mini', price: 0.037 },
    2: { id: 'google/gemini-2.5-flash-pre-0925', price: 0.09 },
    3: { id: 'inception/mercury' },
    4: { id: 'x-ai/grok-4.1-fast' },
    5: { id: 'anthropic/claude-haiku-4.5' },
    6: { id: 'deepseek/deepseek-v3.2-exp-alt', price: 0.045, delay: 7 },
    7: { id: 'qwen/qwen3-next-80b-a3b', price: 0.022, delay: 5 },
    8: { id: 'moonshotai/kimi-k2-0905', price: 0.08 },
    9: { id: 'google/gemini-3-flash-pre', price: 0.15 },
    10: {id: 'qwen/qwen3-coder', price:0.3, delay: 26}
  }
    opts.timeoutMs=30000;
    opts.apiKey = process.env.VSEGPT_API_KEY; //можно просто вставить сюда ключ как строку
    opts.url = 'https://'+'api.vsegpt.ru/v1/chat/completions'
    opts.AImodel = models[4].id
    return ai.OpenaiAPI(prompt, opts);
  }


export const cfg = {
  __filename,
  backups: './ag-backups/', //Резервные копии изменяемых файлов
  workspace: './ag-workspace/', //Значение пока только './ag-workspace'
  tests: './tests', 
  chaining: 'LangGraph', //для ИИ-автоматизации предприятия лучше Knodes тк +fallback!!
  baseTaskPrompt: `Ты квалифицированный программист. Пиши максимально лаконичный, но понятный для человека код. Комментируй его, если это касается текущей задачи. Общайся и комментируй на русском. Answer without markdown. Не изменяй тесты без явной необходимости, создавай минимальное количество новых тестов.`,
  structuredTaskExtra: `Always answer in machine-readable JSON format, placing code of each file into separate field, like: {"FILE:./path/to/file.ext":"code","FILE:./path/to/another/file":"code of another file if needed","comment":"твой комментарий и все что не входит в листинги. Сюда же пиши, все, что обозначено как 'здесь, этот диалог', и все, место для чего не указано явно."}. Only include files created or changed by you. `,
  
  //определите блоки вашего проекта, поскольку многие LLM имеют ограничения на 32-256 кб входного текста, но даже если его немного меньше, все равно работают c большими хуже чем с маленькими блоками. К тому же, вам может быть нежелательно или рисково передавать весь проект "на сторону". Блоки описываются в формате glob, + кажлму блоку можно сопоставить свой источник ИИ.
  blocks: { //даны для примера, формат - glob, glob-patterns
    block_creation: {index:["ag-workspace/_config.js","ag-workspace/mean.short"], skip_gitignore:true}, //этот лучше не удалять
    mean : {
      index: ["package.json", "core/*.{js,md}", "**/_tasks.log", "ag-workspace/_config.js"] 
      ,ignore:["**/vsegptapi.js","**/timer.js", "**/console.js"]
    },
    curr : {
      index: ["**/taskformat.md","**/taskparser.js", "**/_tasks.log"],
      LLMQuery:VseGPT
    },
    //Блок для CLI команд - централизованное выполнение утилит проекта
    cli: {
      index: [
        "core/cli.js",
        "package.json", 
        "core/diff.js",
        "core/task.js",
        "core/rollback.js",
        "core/install.js"
      ],
      LLMQuery: VseGPT,
      skip_gitignore: true
    }
  }
  ,LLMQuery:VseGPT //если в блоке нет своей LLMQuery, выполнится эта
}

//пример добавления своего LLM API: "Создай скрипт вызова API нейросети по приложенной документации, размести его в этом конфиге, в блоке cfg.blocks.имя_блока ". Документацию можно взять у поставщика нейросети, у которой есть ваша учетная запись, она обычно выложена там же, где и личный кабинет.