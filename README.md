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
  const queue = new PromiseQueue();

  const taskReturnValue = {};
  const priority = 1;
  const task = async () => await new Promise(resolve => setTimeout(() => resolve( taskReturnValue ), 100));

  const result = await queue.addTask( priority, task ); // awaits until the task has executed
})()
  .catch(console.error);
```


## Documentation
The library exports a queue class that accepts the optional parameters `bucketCount` and `concurrency`.

```javascript
import PromiseQueue from 'promise-priority-queue';

const queue = new PromiseQueue({ 
  bucketCount: 10, // default value
  concurrency: 1 // default value
});
```

`bucketCount` represents the number of task priority levels. 
`concurrency` describe the number of promises that may be simultaneously executed. This argument may be used to throttle the execution of tasks.

```javascript
queue.addTask( priority, task ) // --> Promise<task result>
```

The `addTask` function is resolved with the return value of the executed task. 

All tasks must have a `priority` less or equal to than `bucketCount-1` , and the tasks with the lowest priority value will be executed first.

The `queue.pause()` function will pause the execution of further tasks until `queue.resume()` is called. 

```javascript
queue.pause()	
queue.resume()
```
