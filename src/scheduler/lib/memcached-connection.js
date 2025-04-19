import { assert, PromiseMemcached } from '../../common/index.js';

/** @type {PromiseMemcached?} */
export let memcachedInstance= null;

export function initMemcached(hosts, options) {
  assert( !memcachedInstance, 'Memcached instance already initialized');

  memcachedInstance= new PromiseMemcached(hosts, options);
}
