# Promise Priority Queue
This is an implementation of a promisified [bucket priority queue](https://en.wikipedia.org/wiki/Bucket_queue) written as an ES6 module with no external dependencies.

## Requirements

`node >= 10.0`

## Installation

```bash
npm i -S promise-priority-queue
```

## Usage
```javascript
import PromiseQueue from 'promise-priority-queue';

(async ()=>{
  const queue = new PromiseQueue({ 
    bucketCount: 10
  });

  const taskReturnValue = {};
  const priority = 1;
  const task = async () => {
    return await new Promise(resolve => {
      setTimeout(() => {
        console.log("Task executed");
        resolve( taskReturnValue );
      }, 100);
    });
  };

  await queue.addTask( priority, task ); // --> Promise <taskReturnValue>
})()
  .catch(console.error);
```


## Documentation
The library exports a queue class that accepts a `bucketCount` and the optional parameter `concurrency`.

```javascript
import PromiseQueue from 'promise-priority-queue';

const queue = new PromiseQueue({ 
  bucketCount: 10, 
  concurrency: 1 // default value
});
```

The `bucketCount` argument represents the number of different task priority levels that may be added to the queue. 
The `concurrency` argument describes the number of promises that may be simultaneously pending. This argument may be used to throttle the execution of tasks.

```javascript
queue.addTask( priority, task ) // --> Promise<task result>
```

The `async addTask()` function is resolved with the return value of the executed task. All tasks must have a `priority` less or equal to than `bucketCount-1` , and the tasks with the lowest priority value will be executed first.

```javascript
queue.pause()	
queue.resume()
```

The `queue.pause()` function will pause the execution of further tasks until `queue.resume()` is called. 
