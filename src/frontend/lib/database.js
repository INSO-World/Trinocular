
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

let getAllTablesStatement;
export function dumpAllTables( limit= 100 ) {
  if( !getAllTablesStatement ) {
    getAllTablesStatement= database.prepare(`SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'`);
  }

  // Get the name of all tables and views
  const tableNames= getAllTablesStatement.pluck().all();

  // Select data and column names from each table
  const tables= [];
  for( const name of tableNames ) {
    try {
      // SQLite does not allow table names to be a prepared parameter
      const dumpTableStatement= database.prepare(`SELECT * FROM ${name} LIMIT ${limit}`).raw(true);
      const rows= dumpTableStatement.all();
      const columns= dumpTableStatement.columns();

      tables.push({name, rows, columns});

    } catch( e ) {
      console.error(`Could not dump table '${name}'`, e);
    }
  }

  return tables;
}

