import assert = require("assert");
import { EventEmitter } from "events";

type BucketQueueEntry<T = any> = {
  resolve: (taskResult: T) => void,
  reject: (error: Error) => void,
  task: () => Promise<T>
}

export class PromiseQueue extends EventEmitter {
  readonly bucketCount: number;
  readonly concurrency: number;
  bucketQueue: BucketQueueEntry[][];
  size: number;
  low: number;
  PAUSE: boolean;

  constructor(bucketCount = 10, concurrency = 1) {
    super();

    assert(concurrency > 0, "'concurrency' must be greater than 0");
    assert(bucketCount > 0, "'bucketCount' must be greater than 0");

    this.bucketCount = bucketCount;
    this.concurrency = concurrency;
    this.size = 0;
    this.low = 0;
    this.PAUSE = false;
    this.bucketQueue = new Array(bucketCount).fill(0).map(() => []);

    // This is the "main loop" prioritized tasks are picked from the queue.
    setImmediate(async() => {
      try {
        // "inflight" describes the number of tasks currently being executed
        let inflight = 0;

        // Loop the async iterator "nextTask"
        for await (const { task, resolve, reject } of this.#getTaskGenerator()) {
          inflight += 1;

          setImmediate(async() => {
            try {
              resolve(await task());
            }
            catch (error) {
              reject(error);
            }

            inflight -= 1;
            this.emit("complete");
          });

          if (inflight >= this.concurrency) {
            // We're at the threshold of our concurrency limit. We won't process another
            // task until some of the tasks has completed
            await new Promise(resolveEvent => this.once("complete", resolveEvent));
          }
        }
      }
      catch (error) {
        this.emit("error", error);
      }
    });
  }

  /** Initialize an iterator (object) which will yield tasks to execute. The iterator is
   * async and will be "waiting" on additional tasks to be added to the queue.
   */
  #getTaskGenerator(): AsyncGenerator<BucketQueueEntry> {
    return (async function* (this: PromiseQueue) {
      while (true) {
        if (this.size === 0) {
          // If there are no tasks on the queue, wait for additional tasks to be added.
          await new Promise(resolve => this.once("new-task", resolve));
        }

        if (this.PAUSE) {
          await new Promise(resolve => this.once("resume", resolve));
        }

        for (let i = this.low; i < this.bucketCount; i++) {
          // Loop the indexes of our priority queue, starting at "low" (the most
          // important task we've seen)
          if (this.bucketQueue[i].length) {
            // When the condition is met, we've found the the new "lower limit" on
            // task priority. Note that a low priority is better.
            this.low = i;
            this.size -= 1;

            yield this.bucketQueue[i].pop() as BucketQueueEntry;

            // Return to the 'while loop' since the next task to yield might be at a
            // new priority index. That happens if new tasks have added to the queue
            // with a lower priority.
            break;
          }
        }
      }
    }).bind(this)();
  }

  pause() {
    this.PAUSE = true;
    this.emit("pause");
  }

  resume() {
    this.PAUSE = false;
    this.emit("resume");
  }

  async addTask<T extends(...args: any[]) => Promise<unknown>>(
    priority: number,
    task: T
  ): Promise<T extends (...args: any[]) => Promise<infer r> ? r : never> {
    if (typeof priority !== "number") {
      throw new Error("The task must be added with a numeric priority as the first argument");
    }
    else if (priority > this.bucketCount - 1 || priority < 0) {
      throw new Error("The task priority must be less than the number of buckets");
    }
    else if (!(task instanceof Function)) {
      throw new Error("The second, task argument must be a function");
    }

    return await new Promise((resolve, reject) => {
      // Add the task to the beginning of the priority bucket. This behavior will
      // create a FIFO style queue by using pop() to retrieve tasks from the right
      // hand side of the queue.
      this.bucketQueue[priority] = [{ task, resolve, reject }, ...this.bucketQueue[priority]];

      this.size += 1; // total queue size. Decreased within the async iterator.

      this.low = Math.min(this.low, priority); // the priority of the most important task in the queue

      this.emit("new-task");
    });
  }
}
