export const ErrorMessages = {
  CSRF: () => 'Your session has expired. Changes have not been saved!',
  Invalid: (entityName, error) => `Could not process ${entityName} due to invalid data. ${error}`,
  NotFound: what => `404 Could not find ${what}`,
  ImportFailed: message => `Importing repository data failed` + (message ? ` due to: ${message}` : '')
};
