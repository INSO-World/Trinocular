import { Members } from './members.js';
import {Details} from "./details.js";


export function registerDataSources( registerFunction ) {
  registerFunction( new Members() );
  registerFunction( new Details() );
}
