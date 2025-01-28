import { logger } from '../../common/index.js';

import Joi from 'joi';
import { findLogEntries, getTags } from '../lib/database.js';
import { formatDateTimeSimple } from '../../common/index.js';

const logSearchValidator= Joi.object({
  tag: Joi.string().required(),
  search: Joi.string().min(0).max(1000).trim().default(null),
  startDate: Joi.date().iso().empty('').default(null),
  endDate: Joi.date().iso().empty('').default(null),
  levels: Joi.string().valid('error', 'error-warning', 'all').required(),
  pageSize: Joi.number().valid(100, 1000, 10000).required(),
  page: Joi.number().min(0).default(0)
});

function levelOptionToLevels( option ) {
  switch( option ) {
    case 'all': return [];
    case 'error-warning': return ['error', 'warning'];
    case 'error': return ['error'];
    default: return [];
  }
}

export async function getViewerPage(req, res) {
  // Default search parameters that are used when none are provided on first
  // page load, or the provided ones are bad
  let searchParams= {
    tag: 'all',
    search: null,
    page: 0,
    pageSize: 1000,
    levels: 'all',
    startDate: new Date(0),
    endDate: new Date()
  };

  // Validate the query params if we have any set
  if( Object.keys(req.query).length ) {
    const {value, error} = logSearchValidator.validate( req.query );
    if( error ) {
      logger.warning(`Invalid log search: %s`, error);
    } else {
      // Only use the provided params if they checkout as ok
      searchParams= value;
      // Make sure to include all entries within the day
      searchParams.endDate?.setHours(23);
      searchParams.endDate?.setMinutes(59);
      searchParams.endDate?.setSeconds(59);
    }
  }

  const levels= levelOptionToLevels( searchParams.levels );

  // Query the database for log entries
  const [tagNames, {totalRowCount, entries}]= await Promise.all([
    getTags(),
    findLogEntries(
      searchParams.tag,
      searchParams.search,
      searchParams.startDate,
      searchParams.endDate,
      levels,
      searchParams.pageSize,
      searchParams.page
    )
  ]);

  // Prepare the tag names for rendering
  tagNames.push('all');
  tagNames.sort();
  const tags= tagNames.map( tagName => ({name: tagName, selected: searchParams.tag === tagName }));

  // Generate an array of page options for rendering
  const pageCount= Math.ceil( totalRowCount / searchParams.pageSize );
  const pages= [];
  for( let i = 0; i< pageCount && pageCount >= 2; i++ ) {
    pages.push({
      pageIndex: i,
      pageName: i+ 1,
      selected: i === searchParams.page
    });
  }

  // Prepare each log entry for rendering
  for( const entry of entries ) {
    entry.time= formatDateTimeSimple( entry.time );
  }

  // Do the final page render. The form controls are also filled back in for
  // convenience
  res.render('viewer', {
    serviceName: process.env.SERVICE_NAME,
    scriptSource: '/static/viewer.js',
    pages,
    page: Math.min( searchParams.page, pages.length-1 ),
    tags,
    search: searchParams.search,
    startDate: searchParams.startDate?.toISOString().substring(0, 10) || '',
    endDate: searchParams.endDate?.toISOString().substring(0, 10) || '',
    levelsAll: searchParams.levels === 'all',
    levelsErrorWarning: searchParams.levels === 'error-warning',
    levelsError: searchParams.levels === 'error',
    pageSize100: searchParams.pageSize === 100,
    pageSize1000: searchParams.pageSize === 1000,
    pageSize10000: searchParams.pageSize === 10000,
    entries
  });
}
