/**
 * @param { boolean } condition
 * @param { string | function():string } message
 */
export function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    if (typeof message === 'function') {
      message = message();
    }

    throw Error(message);
  }
}
