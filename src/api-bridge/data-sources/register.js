import { Members } from './members.js';


export function registerDataSources( registerFunction ) {
  registerFunction( new Members() );
  // registerFunction( new Issues() );
}
