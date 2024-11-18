
import { randomUUID } from 'node:crypto';
import Joi from 'joi';
import { createToken } from '../lib/csrf.js';
import { ErrorMessages } from '../lib/error-messages.js';
import { submitSchedulerTask } from '../lib/requests.js';
import { setRepositoryImportingStatus } from '../lib/currently-importing.js';
import {apiAuthHeader} from "../../common/index.js";
import {addNewRepository} from "../lib/database.js";

const newRepositoryValidator= Joi.object({
  name: Joi.string().trim().min(0).required().label('Name'), // The name may be empty, so we try to load it via the API
  url: Joi.string().uri().required().label('URL'),
  authToken: Joi.string().trim().required().label('Authentication Token'),
  type: Joi.string().valid('github', 'gitlab').required().label('Type')
}).unknown(true).required(); // Allow unknown fields for other stuff like csrf tokens

function renderNewRepoPage(req, res, name, url, authToken, errorMessage) {
  // FIXME: This (and the hbs-template) does not have support for different repo types
  res.render('new', {
    user: req.user,
    csrfToken: createToken( req.sessionID ),
    errorMessage,
    name, url, authToken
  });
}

export function getNewRepoPage(req, res) {
  // Just render the page with empty input fields
  renderNewRepoPage( req, res );
}

export async function postNewRepo(req, res) {
  
  if( req.csrfError ) {
    // As we have an csrf error we need to use the unsafeBody object instead
    const {name, url, authToken}= req.unsafeBody;
    return renderNewRepoPage( req, res, name, url, authToken, ErrorMessages.CSRF() );
  }

  // Validate provided data
  const {value, error}= newRepositoryValidator.validate( req.body );
  if( error ) {
    const {name, url, authToken}= req.body;
    return renderNewRepoPage( req, res, name, url, authToken, ErrorMessages.Invalid('repository', error.message) );
  }

  const {name, url, authToken, type}= value;

  const uuid= randomUUID();
  
  const resp= await fetch(`http://api-bridge/repository`, apiAuthHeader({
    method: 'POST',
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({name,url,authToken,type,uuid})
  }));

  if (!resp.ok) {
    const message = await resp.text();
    return renderNewRepoPage( req, res, name, url, authToken, `Could not submit new repository to API service: ${message}` );
  }
  // new name is set in the response if none is given with create
  const repo = await resp.json();

  try{
    await addNewRepository(repo.name, repo.uuid);
  } catch( error) {
    return renderNewRepoPage( req, res, name, url, authToken, `Could not persist new Repository: ${error.message}`);
  }

  //default schedule
  // cadence is given in seconds, default one day cadence
  const defaultSchedule = {uuid,'cadence': 24*60*60, 'startTime': new Date().toISOString() };
  const scheduleResp= await fetch(`http://scheduler/schedule`, apiAuthHeader({
    method: 'POST',
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(defaultSchedule)
  }));

  if(!scheduleResp.ok) {
    const message = await scheduleResp.text();
    return renderNewRepoPage( req, res, name, url, authToken, `Could not submit schedule for regular snapshots: ${message}` );

  }


  // Run scheduler task now with HTTP callback URL and get the transaction ID
  const transactionId= await submitSchedulerTask( uuid, `http://${process.env.FRONTEND_NAME}/api/notify/import?repo=${uuid}` );
  if( !transactionId ) {
    return renderNewRepoPage( req, res, name, url, authToken, `Could not submit import task` );
  }

  // Mark the repository as currently importing
  setRepositoryImportingStatus( uuid, true, transactionId );

  // Redirect to the waiting page
  res.redirect(`/wait/${uuid}`);
}
