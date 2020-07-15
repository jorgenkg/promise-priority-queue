import EventEmitter from 'events';

export default class PromiseQueue extends EventEmitter {
  constructor(bucketCount = 10, concurrency = 1){
    super();

    if( concurrency <= 0 ){
      throw new Error("'concurrency' must be greater than 0");
    }

    this.bucketCount = bucketCount;
    this.concurrency = concurrency;
    this.size = 0;
    this.low  = 0;
    this.PAUSE = false;
    this.bucketQueue  = new Array( bucketCount )
      .fill(0).map(() => []);

    this.initialize();
  }

  initialize(){
    // Initialize an iterator (object) which will yield tasks to execute. The iterator is 
    // async and will be "waiting" on additional tasks to be added to the queue
    const nextTask =  (async function* nextTaskGenerator(){
      while (true){
        if( this.size === 0 ){
          // If there are no tasks on the queue, wait for additional tasks to be added.
          await new Promise(resolve => this.once("new-task", resolve));
        }

        if( this.PAUSE ){
          await new Promise(resolve=>this.once("resume", resolve));
        }

        for(let i=this.low; i<this.bucketCount; i++){
          // Loop the indexes of our priority queue, starting at "low" (the most 
          // important task we've seen)
          if(this.bucketQueue[i].length > 0){
            // When the condition is met, we've found the the new "lower limit" on 
            // task priority. Note that a low priority is better.
            this.low = i; 
            
            this.size -= 1;
            yield this.bucketQueue[i].pop();
            
            // Return to the 'while loop' since the next task to yield might be at a
            // new priority index. That happens if new tasks have added to the queue
            // with a lower priority.
            break; 
          }
        }
      }
    }).bind(this)();

    // This is the "main loop". This is where we pick prioritized tasks from the queue.
    setImmediate(async () => {
      try {
        // "inflight" describes the number of tasks currently being executed
        let inflight = 0;

        // Loop the async iterator "nextTask"
        for await (const {task, resolve, reject} of nextTask) {
          inflight += 1;

          setImmediate(async () => {
            try {
              resolve( await task() );
            }
            catch( error ){
              reject( error );
            }

            inflight -= 1;
            this.emit("complete");
          });

          if( inflight >= this.concurrency ){
            // We're at the threshold of our concurrency limit. We won't process another
            // task until some of the tasks has completed
            await new Promise(resolveEvent => this.once("complete", resolveEvent));
          }
        }
      }
      catch( error ){
        this.emit("error", error);
      }
    });
  }

  pause(){
    this.PAUSE = true;
    this.emit("pause");
  }

  resume(){
    this.PAUSE = false;
    this.emit("resume");
  }

  async addTask(priority, task) {
    if( typeof priority !== 'number' ){
      throw new Error("The task must be added with a numeric priority as the first argument");
    }
    else if (priority > this.bucketCount-1 ){
      throw new Error(`The task priority must be less than the number of buckets`);
    }
    else if( !(task instanceof Function) ){
      throw new Error("The second, task argument must be a function");
    }
    else if( priority > this.bucketCount - 1 ){
      throw new Error(`Priority cannot be higher than 'bucketCount'-1 at ${this.bucketCount-1}.`+
        `Was: ${priority}`);
    }

    return await new Promise((resolve, reject)=>{
      // Add the task to the beginnning of the priority bucket. This behavior will
      // create a FIFO style queue by using pop() to retrieve tasks from the right
      // hand side of the queue.
      this.bucketQueue[priority] = [{task, resolve, reject}, ...this.bucketQueue[priority]];

      this.size += 1; // total queue size. Decreased within the async iterator.

      this.low = Math.min(this.low, priority); // the priority of the most important task in the queue

      this.emit("new-task");
    });
  }
}
