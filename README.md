# Promise Priority Queue

A promisified bucket priority queue ([wikipedia](https://en.wikipedia.org/wiki/Bucket_queue)) written in Typescript with no external dependencies. 

This queue might help you to execute high volumes of work, while prioritizing certain events like answering a health check from Kubernetes.

## Requirements

* `node >= 12.0`

## Installation

```bash
npm i -S promise-priority-queue
```

## Usage

```typescript
import PromiseQueue from 'promise-priority-queue';

const concurrency = 10;
const queue = new PromiseQueue( concurrency /** optional */ );
const priority = 1;
const task = async (): number => {
  // do work
  return 1;
};

const result: number = await queue.addTask( priority, task ); // resolves with the task result
```


## API

#### [Documentation is available here](https://jorgenkg.github.io/promise-priority-queue/)

