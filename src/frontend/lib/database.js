
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export let database= null;

export function initDatabase( dbFile, initScriptFile ) {
  if( database ) {
    throw Error(`SQLite Database already initialized`);
  }

  database= new Database( dbFile, {verbose: console.log} );
  database.pragma('journal_mode = WAL');

  if( initScriptFile ) {
    initScriptFile= path.resolve(initScriptFile);
    console.log(`Running database init script: '${initScriptFile}'`);

    const initScript= fs.readFileSync( initScriptFile, 'utf-8' );

    database.transaction(() => {
      database.exec( initScript );
    })();
  }
}

