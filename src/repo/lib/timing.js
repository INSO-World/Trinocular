export class Timing {
  constructor() {
    /** @type{Map<string,Date>} */
    this.times = new Map();
    this.first = null;
    this.last = null;
  }

  /**
   * @param  {...string} names 
   */
  push(...names) {
    for(const name of names) {
      this.times.set(name, new Date());

      if (!this.first) {
        this.first = name;
      }

      this.last = name;
    }
  }

  get(name) {
    const time = this.times.get(name);
    if (!time) {
      throw new Error(`Unknown timing entry '${name}'`);
    }

    return time;
  }

  measure(from, to) {
    return this.get(to).getTime() - this.get(from).getTime();
  }

  totalTime() {
    return this.measure(this.first, this.last);
  }
}
