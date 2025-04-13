/**
 * Promisifyed version of memcached
 * Taken from MIT licensed project 'DSE24' by @PreyMa
 * https://github.com/PreyMaTU/DSE24/blob/main/src/control_service/promiseMemcached.js
 */


import Memcached from 'memcached';
import { waitFor } from './util.js';


export class PromiseMemcached {
  static StopLockAttemptsFlag= {};

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

  async optimisticLock( key, lifetime, cb, attempts= 3 ) {
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
