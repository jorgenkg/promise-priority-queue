import * as test from "tape";
import PromiseQueue from "../../index.js";

async function timeout<T>(fnOrPromise: Promise<T> | (() => Promise<T>), ms = 1000): Promise<T> {
  return Promise
    .race([
      typeof fnOrPromise === "function" ? fnOrPromise() : fnOrPromise,
      new Promise<T>((resolve, reject) => setTimeout(() => reject("timeout"), ms).unref())
    ]);
}


test("It should be possible to add tasks to the queue and return the promised result of the task", async t => {
  const queue = new PromiseQueue();
  const result = "result value";
  const taskFullfillmentPromise = queue.addTask(0, async() => await new Promise(resolve => setTimeout(() => resolve(result), 100)));
  t.ok(taskFullfillmentPromise instanceof Promise, "Expected the return value to be a promise");
  t.equal(await timeout(taskFullfillmentPromise), result, "Expected the promise returned by addTask to resolve to the result from the task");
});


test("It should be possible to add tasks to the queue when it is paused without executing the task", async t => {
  const queue = new PromiseQueue();
  queue.pause();

  const taskFullfillmentPromise = queue.addTask(0, async() => await new Promise(resolve => setTimeout(() => resolve(true), 100)));


  const executedTask = await Promise
    .race([
      taskFullfillmentPromise.then(() => true),
      new Promise(resolve => setTimeout(() => resolve(false), 1))
    ]);

  t.notOk(executedTask, "Expected the task not to be executed when the queue is paused");
});

test("It should execute tasks with highest priority first", async t => {
  const queue = new PromiseQueue(2, 1);
  queue.pause();

  const taskA = queue.addTask(1, async() => await new Promise(resolve => setTimeout(() => resolve("A"), 100)));
  const taskB = queue.addTask(0, async() => await new Promise(resolve => setTimeout(() => resolve("B"), 200)));

  queue.resume();


  const executedTask = await Promise
    .race([
      taskA, taskB
    ]);

  t.ok(executedTask === "B", "Expected the highest priority task to be executed first");
});

test("It should execute tasks with identical priority in a FIFO manner", async t => {
  const queue = new PromiseQueue(1, 1);
  queue.pause();

  const taskA = queue.addTask(0, async() => await new Promise(resolve => setTimeout(() => resolve("A"), 200)));
  const taskB = queue.addTask(0, async() => await new Promise(resolve => setTimeout(() => resolve("B"), 100)));

  queue.resume();

  const executedTask = await Promise
    .race([
      taskA, taskB
    ]);

  t.ok(executedTask === "A", "Expected the first task added to the queue be executed first");
});


test("Tasks should be concurrently executable if 'concurrency' > 1", async t => {
  const queue = new PromiseQueue(1, 2);
  queue.pause();

  const taskA = queue.addTask(0, async() => await new Promise(resolve => setTimeout(() => resolve("A"), 200)));
  const taskB = queue.addTask(0, async() => await new Promise(resolve => setTimeout(() => resolve("B"), 200)));

  queue.resume();


  const executedConcurrently = await Promise
    .race([
      Promise.all([taskA, taskB]).then(() => true),
      new Promise(resolve => setTimeout(() => resolve(false), 300))
    ]);

  t.ok(executedConcurrently, "Expected the tasks to be executed concurrently");
});

test("Tasks should not be executed concurrently if 'concurrency' = 1", async t => {
  const queue = new PromiseQueue(1, 1);
  queue.pause();

  const taskA = queue.addTask(0, async() => await new Promise(resolve => setTimeout(() => resolve("A"), 200)));
  const taskB = queue.addTask(0, async() => await new Promise(resolve => setTimeout(() => resolve("B"), 200)));

  queue.resume();

  const executedConcurrently = await Promise
    .race([
      Promise.all([taskA, taskB]).then(() => true),
      new Promise(resolve => setTimeout(() => resolve(false), 300))
    ]);

  t.notOk(executedConcurrently, "Expected the tasks not to be executed concurrently");
});


test("It should gracefully handle errors thrown in tasks by rejecting the task promise", async t => {
  const queue = new PromiseQueue(1, 2);

  const task = queue.addTask(0, async() => await new Promise((resolve, reject) => setTimeout(() => reject(), 10)));

  t.ok(await task.then(() => false).catch(() => true), "Expected the failing task to be rejected");
});
