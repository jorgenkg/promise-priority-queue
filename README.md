# Promise Priority Queue

A promisified bucket priority queue written in Typescript with no external dependencies. 

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

Deep link to the [PromiseQueue class](https://jorgenkg.github.io/promise-priority-queue/classes/lib_PromiseQueue.PromiseQueue.html)

