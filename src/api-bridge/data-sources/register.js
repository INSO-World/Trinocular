import { Members } from './members.js';
import { Details } from './details.js';
import { Issues } from './issues.js';
import {Milestones} from './milestones.js';

export function registerDataSources(registerFunction) {
  registerFunction(new Members());
  registerFunction(new Details());
  registerFunction(new Issues());
  registerFunction(new Milestones());
}
