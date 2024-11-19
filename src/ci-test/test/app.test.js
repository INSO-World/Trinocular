let expect;

before(async () => {
  const chai = await import('chai');
  expect = chai.expect;
});

const { add } = require('../src/app');

describe('Addition Function', () => {
  it('should return the sum of two numbers', () => {
    expect(add(2, 3)).to.equal(5);
  });

  it('should return a negative number when adding negatives', () => {
    expect(add(-2, -3)).to.equal(-5);
  });
});
