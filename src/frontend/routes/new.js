import { randomUUID } from 'node:crypto';
import Joi from 'joi';
import { createToken } from '../lib/csrf.js';
import { ErrorMessages } from '../lib/error-messages.js';
import {
  createDefaultSchedule,
  createRepositoryOnApiBridge,
  createRepositoryOnRepoService,
  submitSchedulerTask
} from '../lib/requests.js';
import { setRepositoryImportingStatus } from '../lib/currently-importing.js';
import { addNewRepository } from '../lib/database.js';

const newRepositoryValidator = Joi.object({
  name: Joi.string().trim().min(0).label('Name'), // The name may be empty, so we try to load it via the API
  url: Joi.string().trim().uri().required().label('URL'),
  authToken: Joi.string().trim().required().label('Authentication Token'),
  type: Joi.string().valid('github', 'gitlab').required().label('Type')
})
  .unknown(true)
  .required(); // Allow unknown fields for other stuff like csrf tokens

function renderNewRepoPage(req, res, name, url, authToken, errorMessage) {
  // FIXME: This (and the hbs-template) does not have support for different repo types
  res.render('new', {
    user: req.user,
    csrfToken: createToken(req.sessionID),
    errorMessage,
    name,
    url,
    authToken
  });
}

export function getNewRepoPage(req, res) {
  // Just render the page with empty input fields
  renderNewRepoPage(req, res);
}

export async function postNewRepo(req, res) {
  if (req.csrfError) {
    // As we have a csrf error we need to use the unsafeBody object instead
    const { name, url, authToken } = req.unsafeBody;
    return renderNewRepoPage(req, res, name, url, authToken, ErrorMessages.CSRF());
  }

  // Validate provided data
  const { value, error } = newRepositoryValidator.validate(req.body);
  if (error) {
    const { name, url, authToken } = req.body;
    return renderNewRepoPage(
      req,
      res,
      name,
      url,
      authToken,
      ErrorMessages.Invalid('repository', error.message)
    );
  }

  let { name, url, authToken, type } = value;
  if (name === '') {
    name = null;
  }

  const uuid = randomUUID();
  const gitUrl = url + '.git'; // <- TODO: Is this always right?

  // Create repo on api bridge service
  // Get the repository data which includes the new name if we did not provide one
  const { error: apiBridgeError, repo } = await createRepositoryOnApiBridge(
    name,
    url,
    authToken,
    type,
    uuid
  );
  if (apiBridgeError) {
    return renderNewRepoPage(req, res, name, url, authToken, apiBridgeError);
  }

  // Create repo on repo service
  const repoServiceError = await createRepositoryOnRepoService(
    repo.name,
    type,
    gitUrl,
    uuid,
    authToken
  );
  if (repoServiceError) {
    return renderNewRepoPage(req, res, name, url, authToken, repoServiceError);
  }

  try {
    await addNewRepository(repo.name, repo.uuid);
  } catch (error) {
    return renderNewRepoPage(
      req,
      res,
      name,
      url,
      authToken,
      `Could not persist new Repository: ${error.message}`
    );
  }

  // Set default schedule
  const schedulerError = await createDefaultSchedule(uuid);
  if (schedulerError) {
    return renderNewRepoPage(req, res, name, url, authToken, schedulerError);
  }

  // Run scheduler task now with HTTP callback URL and get the transaction ID
  const transactionId = await submitSchedulerTask(
    uuid,
    `http://${process.env.SERVICE_NAME}/api/notify/import?repo=${uuid}`
  );
  if (!transactionId) {
    return renderNewRepoPage(req, res, name, url, authToken, `Could not submit import task`);
  }

  // Mark the repository as currently importing
  setRepositoryImportingStatus(uuid, true, transactionId);

  // Redirect to the waiting page
  res.redirect(`/wait/${uuid}`);
}
