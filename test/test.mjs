import tape from "tape";

const testConstructorDecorator = (testConstructor) => (description, testFn) => {
  testConstructor(description, async (t) => {
    try {
      await testFn(t);
      t.end();
    }
    catch( error ){
      t.end( error );
    }
  });
};

export const test = Object.assign(testConstructorDecorator(tape), {
  only: testConstructorDecorator(tape.only),
  skip: testConstructorDecorator(tape.skip)
});
