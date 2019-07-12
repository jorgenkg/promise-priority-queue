import PromiseQueue from './index.mjs';
import tape from "tape";

async function timeout(fn, {time = 10000} = {}){
  return await new Promise(async (resolve, reject) => {
    let resolved = false;

    const timeoutHandle = setTimeout(()=>{
      if( !resolved ){
        resolved = true;
        reject(Object.assign(new Error(),{ timeout: true }));
      }
    }, time);

    try {
      const result = await fn();  
      if(!resolved) {
        resolved = true;
        clearTimeout(timeoutHandle);
        resolve( result );
      }
    }
    catch( error ){
      resolved = true;
      reject( error );
    }
  });
};


const testConstructorDecorator = (testConstructor) => (description, testFn) => {
  testConstructor(description, async (t) => {
    try {
      await testFn(t);
      t.end();
    }
    catch( error ){
      t.fail( error );
    }
  });
};

const test = Object.assign(testConstructorDecorator(tape), {
  only: testConstructorDecorator(tape.only),
  skip: testConstructorDecorator(tape.skip)
});


test("It should be possible to add tasks to the queue", (t)=>{
  const queue = new PromiseQueue({ bucketCount: 10, concurrency: 1 });
  const taskFullfillmentPromise = queue.addTask( 1, async () => {} );
  t.ok( taskFullfillmentPromise instanceof Promise, "Expected the return value to be a promise");
  t.equal( queue.size, 1, "Expected the queue size to be one" );
});

test("The queue should start processing tasks automatically", async (t) => {
  const queue = new PromiseQueue({ bucketCount: 10, concurrency: 1 });
  let testFlag = false;

  const taskFullfillmentPromise = queue.addTask( 1, async () => {
    return await new Promise(resolve => {
      setTimeout(()=>{
        testFlag = true;  
        resolve( testFlag );
      }, 1);
    });
  });

  const taskResult = await (async ()=>{
    try {
      return await timeout(async () => await taskFullfillmentPromise, {
        time: 100
      });
    }
    catch( error ){
      if( error.timeout === true ){
        return { timeout: true };
      }
      throw error;
    }
  })();

  t.ok( taskResult.timeout !== true, "Expected the task to be resolved automatically");
  t.equal( taskResult, testFlag, "Expected the task to be resolved with the return value of the task fn");
});
