/**
 * Promisifyed version of memcached
 * Taken from MIT licensed project 'DSE24' by @PreyMa
 * https://github.com/PreyMaTU/DSE24/blob/main/src/control_service/promiseMemcached.js
 */


import Memcached from 'memcached';
import { waitFor } from './util.js';


export class PromiseMemcached {
  static StopLockAttemptsFlag= Symbol('StopLockAttemptsFlag');

  constructor( hosts, options ) {
    this.memcached= new Memcached( hosts, options );
  }

  async touch( key, lifetime ) {
    return new Promise((res, rej) => {
      this.memcached.touch( key, lifetime, err => {
        if( err ) {
          rej( err );
        } else {
          res();
        }
      });
    });
  }

  async get( key ) {
    return new Promise((res, rej) => {
      this.memcached.get( key, (err, data) => {
        if( err ) {
          rej( err );
        } else {
          res( data );
        }
      });
    });
  }

  async gets( key ) {
    return new Promise((res, rej) => {
      this.memcached.gets( key, (err, data) => {
        if( err ) {
          rej( err );
        } else {
          res( data );
        }
      });
    });
  }

  async set( key, value, lifetime ) {
    return new Promise((res, rej) => {
      this.memcached.set( key, value, lifetime, err => {
        if( err ) {
          rej( err );
        } else {
          res();
        }
      });
    });
  }

  async cas( key, value, cas, lifetime ) {
    return new Promise((res, rej) => {
      this.memcached.cas( key, value, cas, lifetime, (err, success) => {
        if( err ) {
          rej( err );
        } else {
          res( success );
        }
      });
    });
  }

  /**
   * Adds a key-value-pair to the cache if the key does not exist yet
   * @param {string} key 
   * @param {string} value 
   * @param {number} lifetime 
   * @returns {Promise<boolean>} Whether the key-value-pair was added
   */
  async add( key, value, lifetime ) {
    return new Promise((res, rej) => {
      this.memcached.add( key, value, lifetime, err => {
        if( err && !err.notStored ) {
          rej( err );
        } else {
          res( err ? !err.notStored : true );
        }
      });
    });
  }

  async del( key ) {
    return new Promise((res, rej) => {
      this.memcached.del( key, err => {
        if( err ) {
          rej( err );
        } else {
          res();
        }
      });
    });
  }

  /**
   * Uses optimistic locking to let a function work exclusively on a key-value-pair.
   * The method reads the value and lets the function map it to a new one. The new
   * value is attempted to be written back together with the CAS value. In case of
   * failure the procedure is attempted again until a specified number of attempts
   * is reached. The provided mapping function hence must be able to tolerate 
   * multiple invocations and consider side-effects.
   * The mapping function can also break out of the loop by returning a magic value.
   * @param {string} key 
   * @param {number} lifetime 
   * @param {function(string):string|symbol} cb Callback function to map the current value to a new one
   * @param {number} attempts 
   */
  async optimisticLock( key, lifetime, cb, attempts= 10 ) {
    await this.add( key, null, lifetime );

    while( attempts > 0 ) {
      const { cas, [key]: value }= await this.gets( key );

      const newValue= cb( value );
      if( typeof newValue === 'undefined' ) {
        throw Error('Cannot store undefined');
      }
      if( newValue === PromiseMemcached.StopLockAttemptsFlag ) {
        return;
      }

      const success= await this.cas( key, newValue, cas, lifetime );
      if( success ) {
        return;
      }

      attempts--;

      if( attempts > 0 ) {
        const waitTime= Math.random()* 30;
        await waitFor( waitTime );
      }
    }

    throw Error(`Could not update memcached key '${key}'`);
  }
}
