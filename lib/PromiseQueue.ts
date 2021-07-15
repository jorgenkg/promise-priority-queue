import assert = require("assert");
import { EventEmitter } from "events";

type BucketQueueEntry<T = any> = {
  resolve: (taskResult: T) => void,
  reject: (error: Error) => void,
  task: () => Promise<T>
}

export class PromiseQueue extends EventEmitter {
  size = 0;
  PAUSE = false;

  readonly bucketQueue: BucketQueueEntry[][] = [];

  readonly #taskGenerator: AsyncGenerator<BucketQueueEntry> = (async function* (this: PromiseQueue) {
    while (true) {
      if (this.size === 0) {
        // If there are no tasks on the queue, wait for additional tasks to be added.
        await new Promise(resolve => this.once("new-task", resolve));
      }

      if (this.PAUSE) {
        await new Promise(resolve => this.once("resume", resolve));
      }

      const priorityIndex = this.bucketQueue
        .findIndex(entries => entries.length);

      if(priorityIndex >= 0 && this.bucketQueue[priorityIndex]?.length) {
        const priorityItems = this.bucketQueue[priorityIndex];
        this.size -= 1;
        yield priorityItems.shift() as BucketQueueEntry;
      }

    }
  }).bind(this)();

  constructor(
    readonly concurrency = 1
  ) {
    super();

    assert(concurrency > 0, "'concurrency' must be greater than 0");

    // This is the "main loop" prioritized tasks are picked from the queue.
    setImmediate(async() => {
      try {
        // "inflight" describes the number of tasks currently being executed
        let inflight = 0;

        // Loop the async iterator "nextTask"
        for await (const { task, resolve, reject } of this.#taskGenerator) {
          inflight += 1;

          // Intentionally not awaiting this promise chain such that multiple
          // tasks may be started concurrently.
          void task()
            .then(resolve, reject)
            .then(() => {
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

  /** Pause queue execution */
  pause(): void {
    this.PAUSE = true;
    this.emit("pause");
  }

  /** Resume queue execution */
  resume(): void {
    this.PAUSE = false;
    this.emit("resume");
  }

  /** Add a prioritized task to the queue. */
  async addTask<T extends(...args: any[]) => Promise<unknown>>(
    priority: number,
    task: T
  ): Promise<T extends (...args: any[]) => Promise<infer r> ? r : never> {
    assert(priority >= 0, "Priority must be >= 0.");

    // If the priority references a bucket that hasn't been initialized we must
    // initialize all the buckets at indices 0 -> priority.
    if(priority >= this.bucketQueue.length) {
      const fillers = new Array(priority - this.bucketQueue.length + 1)
        .fill(0)
        .map(() => []);

      this.bucketQueue.push(...fillers);
    }

    return await new Promise((resolve, reject) => {
      this.bucketQueue[priority].push({ task, resolve, reject });

      this.size += 1; // total queue size. Decreased within the async iterator.

      this.emit("new-task");
    });
  }
}
