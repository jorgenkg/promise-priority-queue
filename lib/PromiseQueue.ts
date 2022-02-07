import * as assert from "assert";
import { EventEmitter } from "events";
import type { BucketQueueEntry } from "./@types/BucketQueueEntry.js";
import type StrictEmitter from "strict-event-emitter-types";

export class PromiseQueue {
  /** Number of tasks currently in the queue and awaiting completion. */
  private size = 0;
  /** Flag indicating the queue is currently processing tasks. */
  private paused = false;
  /** Number of tasks currently being executed. */
  private inflight = 0;
  /** Number of promises that may be awaited simultaneously. */
  private readonly concurrency: number;

  private readonly bucketQueue: Array<Array<BucketQueueEntry>> = [];

  /** Internal signalling. Used to trigger queue processing. */
  private readonly emitter: StrictEmitter<EventEmitter, {
    "new-task": () => void,
    "complete": () => void,
    "resume": () => void
  }> = new EventEmitter();

  constructor({ concurrency = 1 }: {
    /** The number of tasks that will be executed concurrently.
     * Note that if concurrency > 1, the queue cannot guarantee FIFO since the tasks' execution times may vary. */
    concurrency?: number
  } = {}) {
    assert(concurrency > 0, "'concurrency' must be greater than 0");

    this.concurrency = concurrency;

    this.emitter.on("new-task", this.processTasks.bind(this));
    this.emitter.on("complete", this.processTasks.bind(this));
    this.emitter.on("resume", () => {
      // The queue may process multiple tasks concurrently upon resuming.
      const availableCapacity = this.concurrency - this.inflight;
      for(let i = 0;i < availableCapacity;i++) {
        void this.processTasks();
      }
    });
  }

  /** Pick and execute the highest priority task. */
  private processTasks(): void {
    if (
      this.paused || this.inflight >= this.concurrency || this.size === 0
    ) {
      return;
    }

    // Find the lowest index (ie highest priority) task.
    const priorityIndex = this.bucketQueue.findIndex(entries => entries.length);

    assert(priorityIndex >= 0, `Expected the queue to contain entries since the queue size is: ${this.size}`);

    this.inflight += 1;

    // Pick task from a FIFO queue
    const nextTask = this.bucketQueue[priorityIndex].shift();

    this.size -= 1;

    assert(nextTask, "Expected the item list to contain an entry since findIndex() returned != -1");

    const { task, resolve, reject } = nextTask;

    // Intentionally not using the await keyword to prevent TS from generating
    // unnecessarily complex ES3 compatible code.
    task()
      .then(resolve, reject)
      // Mimic .finally() by chaining .catch().then()
      .catch(() => void 0)
      .then(() => {
        this.inflight -= 1;
        this.emitter.emit("complete");
      });
  }

  /** Pause queue execution */
  pause(): void {
    this.paused = true;
  }

  /** Resume queue execution */
  resume(): void {
    this.paused = false;
    this.emitter.emit("resume");
  }

  /** Whether the task processing is currently paused. */
  isPaused(): boolean {
    return this.paused;
  }

  /** Returns the number of uncompleted tasks on the queue. */
  getSize(): number {
    return this.size;
  }

  /** Returns the number of tasks that are currently inflight. */
  getInflight() {
    return this.inflight;
  }

  /** Add a prioritized task to the queue.
   * Note that a lower priority number means that the task will be prioritized.
   * Ie.: `0` is the highest priority value.
   */
  addTask<T>(priority: number, task: () => Promise<T>): Promise<T> {
    assert(priority >= 0, "Priority must be >= 0.");

    // If the priority references a bucket that hasn't been initialized we must
    // initialize all the buckets at indices 0 -> priority.
    if(priority >= this.bucketQueue.length) {
      const fillers = new Array(priority - this.bucketQueue.length + 1)
        .fill(0)
        .map(() => []);

      this.bucketQueue.push(...fillers);
    }

    return new Promise((resolve, reject) => {
      this.bucketQueue[priority].push({ task, resolve, reject });

      this.size += 1;

      this.emitter.emit("new-task");
    });
  }
}
