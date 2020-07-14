# Promise Priority Queue

A promisified [bucket priority queue](https://en.wikipedia.org/wiki/Bucket_queue) written as an ES6 module with no external dependencies. This queue might help you to execute high volumes of work, while prioritizing certain events like answering a health check from Kubernetes.

## Requirements

`node >= 10.0`

## Installation

```bash
npm i -S promise-priority-queue
```

## Usage

```javascript
import PromiseQueue from 'promise-priority-queue';

const queue = new PromiseQueue();
const priority = 1;
const task = async () => {
  // do work
};

const result = await queue.addTask( priority, task ); // returns the task promise
```


## API

### Constructor | new PromiseQueue( bucketCount?, concurrency? )

##### bucketCount

Type: `number`

Default value: `10`

The number of priority levels the queue will support. The value must be greater than 0. 

> Note: Performance will degrade linearly with the number of buckets.

##### concurrency

Type: `number`

Default value: `1`

The number of promises that will be executed / pending simultaneously. This argument may be used to throttle the execution of tasks.

### Properties

##### size

Type: `number`

The size of the queue.

### Methods

#### addTask( priority, task ) --> Promise

##### priority

Type: `number`

The `priority` must be less than or equal to `bucketCount-1` . The task with the lowest priority value will be executed first.

##### task

Type: `Function`

#### pause() --> void

The `queue.pause()` function will pause the execution of further tasks until `queue.resume()` is called. 

#### resume() --> void

Resumes execution of the queue.

