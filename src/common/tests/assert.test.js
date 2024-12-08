import { expect } from 'chai';
import {assert} from '../assert.js';

describe('Assert', () => {

  it('does not throw when condition is met', () => {
      expect(() => assert(true)).to.not.throw;
  });

  it('throws when condition is met', () => {
    expect(() => assert(false)).to.throw('Assertion failed');
  });

  it('throws with custom message', () => {
    const customMessage= 'My custom error message';
    expect(() => assert(false, customMessage)).to.throw(customMessage);
  });

  it('produces custom message from function', () => {
    const customMessageProducer= () => 'Produced custom error message';
    expect(() => assert(false, customMessageProducer)).to.throw(customMessageProducer());
  });
});
