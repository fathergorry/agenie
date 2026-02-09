//В проектах проще так: 
//await queues.subscribeToQueue('ID таймера', 3800, timeoutMs) //итого не более 2*timeoutMs
//Интервал лучше делать немного больше требуемого, таймаут задает ограничение для внешнего процесса, например если у вызова апи есть этот таймаут. Верно?

const queues = globalThis.__queues__ ||= {};

export function subscribeToQueue(id, interval, timeLimit = 3000) {
  if (!queues[id]) {
    queues[id] = { current: 0, tasks: [] };
  }

  if (queues[id].current + interval > timeLimit) {
    throw new Error('Queue time limit exceeded');
  }

  const wait = queues[id].current;
  const task = { wait, interval, createdAt: Date.now() };
  
  queues[id].tasks.push(task);
  queues[id].current += interval;

  const promise = new Promise(resolve => {
    setTimeout(() => {
      queues[id].tasks = queues[id].tasks.filter(t => t !== task);
      queues[id].current -= task.interval;
      resolve();
    }, wait);
  });

  return { timeLeft: wait, promise };
}




// Пример использования
async function example() {
  try {
    console.log('Добавляем 1-ю задачу...');
    var x = subscribeToQueue('api', 1500); // OK
    console.log('1-я задача: timeLeft =', x.timeLeft);

    console.log('Добавляем 2-ю задачу...');
    var y = subscribeToQueue('api', 1500); // OK
    console.log('2-я задача: timeLeft =', y.timeLeft);

    console.log('Выполняем 1-ю задачу...');
    await x.promise;
    console.log('1-я задача выполнена');

    console.log('Выполняем 2-ю задачу...');
    await y.promise;
    console.log('2-я задача выполнена');

    console.log('Добавляем 3-ю задачу (ожидаем ошибку)...');
    var z = subscribeToQueue('api', 1500); // Ошибка
  } catch (e) {
    console.log('Ошибка:', e.message);
  }
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  example();
}