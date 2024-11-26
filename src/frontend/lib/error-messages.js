export const ErrorMessages = {
  CSRF: () => 'Your session has expired. Changes have not been saved!',
  Invalid: (entityName, error) => `Could not process ${entityName} due to invalid data. ${error}`
};
