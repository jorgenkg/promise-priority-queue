import assert = require("assert");
import PromiseQueue from "../index.js";

(async() => {
  const queue = new PromiseQueue(1);

  // Pause the queue execution for testing purposes to prevent it from processing the tasks.
  queue.pause();

  // Add a task that returns "A" after 100ms
  const taskA = queue.addTask(1, async() => await new Promise(resolve => setTimeout(() => resolve("A"), 100)));
  // Add a higher priority task that returns "B" after 200ms.
  const taskB = queue.addTask(0, async() => await new Promise(resolve => setTimeout(() => resolve("B"), 200)));

  // Restart the queue now that the elements have been added.
  queue.resume();

  // We expect "B" to be the first promise to resolve, since it has a higher priority.
  const firstResult = await Promise
    .race([
      taskA, taskB
    ]);

  assert(firstResult === "B");
})()
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
