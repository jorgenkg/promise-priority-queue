import * as fakeTimer from "@sinonjs/fake-timers";
import * as test from "tape";
import PromiseQueue from "../../index.js";

const clock = fakeTimer.createClock(0);

async function timeout<T>(fnOrPromise: Promise<T> | (() => Promise<T>), ms = 1000): Promise<T> {
  return Promise
    .race([
      typeof fnOrPromise === "function" ? fnOrPromise() : fnOrPromise,
      new Promise<T>((resolve, reject) => setTimeout(() => reject("timeout"), ms).unref())
    ]);
}

function createTask<T>(returns: T, delayMs = 100, useMockedClock = false): () => Promise<T> {
  if(useMockedClock) {
    return async() => await new Promise<T>(resolve => clock.setTimeout(() => resolve(returns), delayMs));
  }
  else {
    return async() => await new Promise<T>(resolve => setTimeout(() => resolve(returns), delayMs));
  }
}


test("It should be possible to add tasks to the queue and return the promised result of the task", async t => {
  const queue = new PromiseQueue();
  const result = "result value";
  const taskFullfillmentPromise = queue.addTask(0, createTask(result, 100, true));
  await clock.tickAsync(100);
  t.equal(await timeout(taskFullfillmentPromise), result, "Expected the promise returned by addTask to resolve to the result from the task");
});


test("It should be possible to add tasks to the queue when it is paused without executing the task", async t => {
  const queue = new PromiseQueue();
  queue.pause();

  const taskFullfillmentPromise = queue.addTask(0, createTask(true, 100, true));
  await clock.tickAsync(100);

  const executedTask = await Promise
    .race([
      taskFullfillmentPromise.then(() => true),
      new Promise(resolve => setTimeout(() => resolve(false), 1))
    ]);

  t.notOk(executedTask, "Expected the task not to be executed when the queue is paused");
});

test("It should execute tasks with highest priority first", async t => {
  const queue = new PromiseQueue(1);
  queue.pause();

  const taskA = queue.addTask(1, createTask("A", 100, true));
  const taskB = queue.addTask(0, createTask("B", 100, true));

  queue.resume();
  await clock.tickAsync(100);

  const executedTask = await Promise
    .race([
      taskA, taskB
    ]);

  t.ok(executedTask === "B", "Expected the highest priority task to be executed first");
});

test("It should execute tasks with identical priority in a FIFO manner", async t => {
  const queue = new PromiseQueue(1);
  queue.pause();

  const taskA = queue.addTask(0, createTask("A", 200, true));
  const taskB = queue.addTask(0, createTask("B", 100, true));

  queue.resume();
  await clock.tickAsync(200);

  const executedTask = await Promise
    .race([
      taskA, taskB
    ]);

  t.ok(executedTask === "A", "Expected the first task added to the queue be executed first");
});


test("Tasks should be concurrently executable if 'concurrency' > 1", async t => {
  const queue = new PromiseQueue(2);
  queue.pause();

  const taskA = queue.addTask(0, createTask("A", 200, true));
  const taskB = queue.addTask(0, createTask("B", 200, true));

  queue.resume();
  await clock.tickAsync(200);


  const executedConcurrently = await Promise
    .race([
      Promise.all([taskA, taskB]).then(() => true),
      new Promise(resolve => setTimeout(() => resolve(false), 1))
    ]);

  t.ok(executedConcurrently, "Expected the tasks to be executed concurrently");
});

test("Tasks should not be executed concurrently if 'concurrency' = 1", async t => {
  const queue = new PromiseQueue(1);
  queue.pause();

  const taskA = queue.addTask(0, createTask("A", 200, true));
  const taskB = queue.addTask(0, createTask("B", 200, true));

  queue.resume();
  await clock.tickAsync(200);

  const executedConcurrently = await Promise
    .race([
      Promise.all([taskA, taskB]).then(() => true),
      new Promise(resolve => setTimeout(() => resolve(false), 1))
    ]);

  t.notOk(executedConcurrently, "Expected the tasks not to be executed concurrently");
});


test("It should gracefully handle errors thrown in tasks by rejecting the task promise", async t => {
  const queue = new PromiseQueue(1);

  const task = queue.addTask(0, () => Promise.reject());

  t.ok(await task.then(() => false).catch(() => true), "Expected the failing task to be rejected");
});
