export function sortIssuesBy(data, sortOrder) {
  switch (sortOrder) {
    case 'time_spent':
      data.sort((a, b) => a.total_time_spent - b.total_time_spent);
      return;
    case 'created_at':
    default: // Fallback to chronological order
      data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return;
  }
}

/**
 *
 * @param data
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {*}
 */
export function filterIssuesByCreationDate(data, startDate, endDate) {
  const start = startDate;
  const end = endDate;

  return data.filter(issue => {
    const created = new Date(issue.created_at);
    return created >= start && created <= end;
  });
}

/**
 * @typedef {{spent_week: string, cumulative_spent: number, user_id: number, username: string, name: string, email: string? }} DataItem
 * @param {DataItem[]} data
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @returns {DataItem[]}
 */
export function filterTimelogsBySpentDate(data, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  /**
   * Helper function that updates a min-max-entry with a data item, so that the entry
   * stores the min and max points for all items. If no entry is provided a new one is created.
   * @typedef {{newestDate: Date, newestItem: any, oldestDate: Date, oldestItem: any}} MinMaxEntry
   * @param {MinMaxEntry?} minmax 
   * @param {DataItem} item 
   * @returns {MinMaxEntry}
   */
  function updateMinMax( minmax, item ) {
    const created= new Date(item.spent_week);

    if( !minmax ) {
      return {
        newestDate: created,
        newestItem: item,
        oldestDate: created,
        oldestItem: item
      };
    }

    if( minmax.newestDate < created ) {
      minmax.newestDate= created;
      minmax.newestItem= item;
    }

    if( minmax.oldestDate > created ) {
      minmax.oldestDate= created;
      minmax.oldestItem= item;
    }

    return minmax;
  }

  // Filter all items in the selected start-end-time-span
  const filtered= data.filter(item => {
    const created = new Date(item.spent_week);
    return created >= start && created <= end;
  });

  // Find the newest and oldest item for each author, and the dates of the newest and oldest
  // items in the filtered dataset
  /** @type {Map<number, MinMaxEntry>} */
  const authors= new Map();
  let timespanMinMax= null;
  for( const item of filtered ) {
    timespanMinMax= updateMinMax( timespanMinMax, item );
    authors.set(item.user_id, updateMinMax(authors.get(item.user_id), item) );
  }

  // Add dummy values to stretch the data if the time span is larger than
  // a week in one of the directions
  const sixDays= 6 * 24 * 60 * 60 * 1000;
  if( timespanMinMax && (end - timespanMinMax.newestDate) > sixDays ) {
    authors.forEach( authorMinMax => {
      filtered.push({...authorMinMax.newestItem, spent_week: end.toISOString()});
    });
  }

  if( timespanMinMax && (timespanMinMax.oldestDate - start) > sixDays ) {
    authors.forEach( authorMinMax => {
      filtered.push({...authorMinMax.oldestItem, spent_week: start.toISOString()});
    });
  }

  return filtered;
}

