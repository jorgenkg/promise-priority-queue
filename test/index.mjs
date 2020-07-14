import PromiseQueue from '../index.mjs';
import {test} from "./test.mjs";


test("It should be possible to add tasks to the queue and return the promised result of the task", async (t)=>{
  const queue = new PromiseQueue();
  const result = {};
  const taskFullfillmentPromise = queue.addTask( 1, async () => await new Promise(resolve => setTimeout(() => resolve(result), 100)));
  t.ok( taskFullfillmentPromise instanceof Promise, "Expected the return value to be a promise");
  t.equal( await taskFullfillmentPromise, result, "Expected the promise returned by addTask to resolve to the result from the task" );
});


test("It should be possible to add tasks to the queue when it is paused without executing the task", async (t)=>{
  const queue = new PromiseQueue();
  queue.pause();

  const taskFullfillmentPromise = queue.addTask( 1, async () => await new Promise(resolve => setTimeout(() => resolve(true), 100)));

  const executedTask = await Promise
    .race([
      taskFullfillmentPromise.then(() => true ),
      new Promise(resolve => setTimeout(() => resolve(false), 200))
    ]);

  t.notOk( executedTask, "Expected the task not to be executed when the queue is paused" );
});

test("It should execute tasks with highest priority first", async (t)=>{
  const queue = new PromiseQueue({ concurrency: 1 });
  queue.pause();

  const taskA = queue.addTask( 2, async () => await new Promise(resolve => setTimeout(() => resolve("A"), 100)));
  const taskB = queue.addTask( 1, async () => await new Promise(resolve => setTimeout(() => resolve("B"), 200)));

  queue.resume();

  const executedTask = await Promise
    .race([
      taskA, taskB
    ]);

  t.ok( executedTask === "B", "Expected the highest priority task to be executed first" );
});

test("It should execute tasks with identical priority in a FIFO manner", async (t)=>{
  const queue = new PromiseQueue({ concurrency: 1 });
  queue.pause();

  const taskA = queue.addTask( 1, async () => await new Promise(resolve => setTimeout(() => resolve("A"), 200)));
  const taskB = queue.addTask( 1, async () => await new Promise(resolve => setTimeout(() => resolve("B"), 100)));

  queue.resume();

  const executedTask = await Promise
    .race([
      taskA, taskB
    ]);

  t.ok( executedTask === "A", "Expected the first task added to the queue be executed first" );
});
