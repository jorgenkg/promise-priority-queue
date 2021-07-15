import assert = require("assert");
import { EventEmitter } from "events";
import StrictEmitter from "strict-event-emitter-types";

type BucketQueueEntry<T = any> = {
  resolve: (taskResult: T) => void,
  reject: (error: Error) => void,
  task: () => Promise<T>
}

export class PromiseQueue extends EventEmitter implements StrictEmitter<EventEmitter, {
  error: (error: Error) => void
}> {
  size = 0;
  inflight = 0;
  PAUSE = false;

  readonly bucketQueue: BucketQueueEntry[][] = [];
  readonly #emitter: StrictEmitter<EventEmitter, {
    "new-task": () => void,
    "complete": () => void,
    "resume": () => void,
    "pause": () => void,
  }> = new EventEmitter();

  constructor(
    readonly concurrency = 1
  ) {
    super();

    assert(concurrency > 0, "'concurrency' must be greater than 0");

    this.#emitter.on("new-task", this.#processTasks.bind(this));
    this.#emitter.on("complete", this.#processTasks.bind(this));
    this.#emitter.on("resume", () => {
      // The queue may process multiple tasks concurrently upon resuming.
      const availableCapacity = this.concurrency - this.inflight;
      for(let i = 0;i < availableCapacity;i++) {
        void this.#processTasks();
      }
    });
  }

  async #processTasks(): Promise<void> {
    try {
      if (
        this.PAUSE ||
      this.inflight >= this.concurrency
      ) {
        return;
      }

      this.inflight += 1;

      const priorityIndex = this.bucketQueue
        .findIndex(entries => entries.length);

      if(priorityIndex >= 0 && this.bucketQueue[priorityIndex]?.length) {
        const priorityItems = this.bucketQueue[priorityIndex];
        this.size -= 1;
        const { task, resolve, reject } = priorityItems.shift() as BucketQueueEntry;
        await task().then(resolve, reject);

        this.inflight -= 1;
        this.#emitter.emit("complete");
      }
    }
    catch(error) {
      this.emit("error", error);
    }
  }

  /** Pause queue execution */
  pause(): void {
    this.PAUSE = true;
    this.#emitter.emit("pause");
  }

  /** Resume queue execution */
  resume(): void {
    this.PAUSE = false;
    this.#emitter.emit("resume");
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

      this.#emitter.emit("new-task");
    });
  }
}
