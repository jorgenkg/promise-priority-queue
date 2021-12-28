import assert = require("assert");
import { EventEmitter } from "events";
import type StrictEmitter from "strict-event-emitter-types";

type BucketQueueEntry<T = any> = {
  resolve: (taskResult: T) => void,
  reject: (error: Error) => void,
  task: () => Promise<T>
}

export class PromiseQueue extends EventEmitter implements StrictEmitter<EventEmitter, {
  error: (error: Error) => void
}> {
  /** Number of tasks currently in the queue and awaiting completion. */
  #size = 0;
  /** Flag indicating the queue is currently processing tasks. */
  #paused = false;
  /** Number of tasks currently being executed. */
  #inflight = 0;

  readonly #bucketQueue: BucketQueueEntry[][] = [];

  /** Internal signalling. Used to trigger queue processing. */
  readonly #emitter: StrictEmitter<EventEmitter, {
    "new-task": () => void,
    "complete": () => void,
    "resume": () => void
  }> = new EventEmitter();

  constructor(
    /** The number of tasks that will be executed concurrently.
     * Note that if concurrency > 1, the queue cannot guarantee FIFO since the tasks' execution times may vary. */
    readonly concurrency = 1
  ) {
    super();

    assert(concurrency > 0, "'concurrency' must be greater than 0");

    this.#emitter.on("new-task", this.#processTasks.bind(this));
    this.#emitter.on("complete", this.#processTasks.bind(this));
    this.#emitter.on("resume", () => {
      // The queue may process multiple tasks concurrently upon resuming.
      const availableCapacity = this.concurrency - this.#inflight;
      for(let i = 0;i < availableCapacity;i++) {
        void this.#processTasks();
      }
    });
  }

  /** Pick and execute the highest priority task. */
  async #processTasks(): Promise<void> {
    try {
      if (
        this.#paused || this.#inflight >= this.concurrency || this.#size === 0
      ) {
        return;
      }

      // Find the lowest index (ie highest priority) task.
      const priorityIndex = this.#bucketQueue.findIndex(entries => entries.length);

      assert(priorityIndex >= 0, `Expected the queue to contain entries since the queue size is: ${this.#size}`);

      this.#inflight += 1;

      const nextTask = this.#bucketQueue?.[priorityIndex]?.shift() as BucketQueueEntry;

      this.#size -= 1;

      assert(nextTask, "Expected the item list to contain an entry since findIndex() returned != -1");

      const { task, resolve, reject } = nextTask;

      try {
        resolve(await task());
      }
      catch(error: any) {
        reject(error);
      }

      this.#inflight -= 1;
      this.#emitter.emit("complete");
    }
    catch(error) {
      this.emit("error", error);
    }
  }

  /** Pause queue execution */
  pause(): void {
    this.#paused = true;
  }

  /** Resume queue execution */
  resume(): void {
    this.#paused = false;
    this.#emitter.emit("resume");
  }

  /** Whether the task processing is currently paused. */
  isPaused(): boolean {
    return this.#paused;
  }

  /** Returns the number of uncompleted tasks on the queue. */
  getSize(): number {
    return this.#size;
  }

  /** Add a prioritized task to the queue.
   * Note that a lower priority number means that the task will be prioritized.
   * Ie.: `0` is the highest priority value.
   */
  async addTask<T>(priority: number, task: () => Promise<T>): Promise<T> {
    assert(priority >= 0, "Priority must be >= 0.");

    // If the priority references a bucket that hasn't been initialized we must
    // initialize all the buckets at indices 0 -> priority.
    if(priority >= this.#bucketQueue.length) {
      const fillers = new Array(priority - this.#bucketQueue.length + 1)
        .fill(0)
        .map(() => []);

      this.#bucketQueue.push(...fillers);
    }

    return await new Promise((resolve, reject) => {
      this.#bucketQueue[priority].push({ task, resolve, reject });

      this.#size += 1;

      this.#emitter.emit("new-task");
    });
  }
}
