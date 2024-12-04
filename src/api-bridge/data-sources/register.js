import { Members } from './members.js';
import { Details } from './details.js';
import { Issues } from './issues.js';
import { Milestones } from './milestones.js';
import { TimeLogs } from './timelogs.js';

export function registerDataSources(registerFunction) {
  registerFunction(new Members());
  registerFunction(new Details());
  registerFunction(new Issues());
  registerFunction(new Milestones());
  registerFunction(new TimeLogs());
}
