import EventEmitter from 'events';

export default class PromiseQueue {
  constructor({ bucketCount, concurrency = 1, size = Infinity }){
    this.eventEmitter = new EventEmitter();
    this.bucketCount = bucketCount;
    this.concurrency = concurrency;
    this.size = 0;
    this.maxSize = size;
    this.low  = 0;
    this.bucketQueue  = new Array( bucketCount )
      .fill(0).map(() => []);

    this.initialize();
  }

  initialize(){
    const self = this;

    // Initialize an iterator (object) which will yield tasks to execute. The iterator is 
    // async and will be "waiting" on additional tasks to be added to the queue
    const nextTask = {
      [Symbol.asyncIterator]() {

        // The iterator loops over an async generator
        return (async function* nextTaskGenerator(){
          let PAUSE = false;

          self.eventEmitter.on("pause", () => { 
            PAUSE = true; 
          }); 

          // This is a "while true" loop, that can be paused using event signalling
          while (true){
            if( PAUSE ){
              // PAUSE is specified when we want to stop fetching new tasks from the task queue.
              await new Promise((resolve)=>{
                self.eventEmitter.once("resume", () => {
                  PAUSE = false;
                  resolve();
                }); 
              }); 
            }

            if( self.size === 0 ){
              // If there are no tasks on the queue, wait for additional tasks to be added.
              // Everytime a task is added to the queue, we're emitting a "new-task" event.
              // If we receive a pause event, rather than a "new task" event, the PAUSE flag
              // is set and the loop is reset/continued to the top of the loop again.
              const doStop = await new Promise((resolve)=>{
                const stopQueueListener = () => resolve( true );
                self.eventEmitter.once("pause", stopQueueListener); 
                self.eventEmitter.once("new-task", () => {
                  self.eventEmitter.removeListener("pause", stopQueueListener); 
                  resolve( false );
                }); 
              });

              if( doStop ){
                PAUSE = true;
                continue;
              }
            }

            for(let i=self.low; i<self.bucketCount; i++){
              // Loop the indexes of our priority queue, starting at "low" (the most 
              // important task we've seen)
              if(self.bucketQueue[i].length > 0){
                // When the condition is met, we've found the the new "lower limit" on 
                // task priority. Note that a low priority is better.
                self.low = i; 
                
                self.size -= 1;
                yield self.bucketQueue[i].pop();
                
                // Return to the while loop since the next task to yield might be at a
                // new priority index. That happens if new tasks have added to the queue
                // with a lower priority.
                break; 
              }
            }
          }
        }());
      }
    };

    // This is the "main loop". This is where we pick prioritized tasks from the queue.
    (async () => {
      // "inflight" describes the number of tasks currently being executed
      let inflight = 0;

      // Loop the async iterator "nextTask"
      for await (const {task, resolveTask, rejectTask} of nextTask) {
        while( inflight >= this.concurrency ){
          // We're at the threshold of our concurrency limit. We won't process another
          // task until some of the tasks has completed
          await new Promise((resolve) => {
            // Wait for one of the task to complete before executing the next task.
            this.eventEmitter.once("complete", () => resolve());
          });
        }

        setImmediate(async ()=>{
          try {
            // Execute task
            inflight += 1;
            resolveTask( await task() );
          }
          catch( error ){
            rejectTask( error );
          }
          finally {
            inflight -= 1;
            this.eventEmitter.emit("complete");
          }
        });
      }
    })();
  }

  pause(){
    this.eventEmitter.emit("pause");
  }

  resume(){
    this.eventEmitter.emit("resume");
  }

  async addTask(priority, task) {
    if( typeof priority !== 'number' ){
      throw new Error("The task must be added with a numeric priority as the first argument");
    }
    else if (priority > this.bucketCount-1 ){
      throw new Error(`The task priority must be less than the number of buckets`);
    }
    if( !(task instanceof Function) ){
      throw new Error("The second, task argument must be a function");
    }

    let resolveTask, rejectTask;
    const taskPromise = new Promise((resolve, reject)=>{
      resolveTask = resolve;
      rejectTask = reject;
    });

    if( priority > this.bucketCount - 1 ){
      throw new Error(`Priority cannot be higher than 'bucketCount'-1 at ${this.bucketCount-1}.`+
        `Was: ${priority}`);
    }

    // Add the task to the beginnning of the priority bucket. This behavior will
    // create a FIFO style queue by using pop() to retrieve tasks from the right
    // hand side of the queue.
    this.bucketQueue[priority] = [{task, resolveTask, rejectTask}]
      .concat(...this.bucketQueue[priority]);

    this.size += 1; // total queue size. Decreased within the async iterator.

    this.low = Math.min(this.low, priority); // the priority of the most important task in the queue

    this.eventEmitter.emit("new-task");

    return await taskPromise;
  }
}
