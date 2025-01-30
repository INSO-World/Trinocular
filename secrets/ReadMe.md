# Secrets Directory

Any `.txt` file in this directory is ignored via the `.gitignore` file. Make sure to
put your secrets into a text file and check that it does not get committed/pushed 
accidentally.

When editing secret files check that your editor did not add any whitespace like newlines
at the end, when automatic formatting is enabled. The file must only contain the secret
string, otherwise some services include the whitespace as part of the secret and get confused.

## Secrets

- __auth\_client:__ Secret to authenticate the auth service as a client with keycloak. Only
  used by the auth service and keycloak.

- __fluentbit\_db:__ Secret for the fluentbit log database. Used by fluentbit, the fluentbit 
  database and the logs service.

- __internal\_api:__ Secret to authenticate HTTP request internally between services. As some
  services are publicly reachable it must be ensured that they can only be used by either
  logged-in users or trusted internal services. As services cannot log themselves in easily
  via keycloak they cannot use the same session authentication mechanism. Instead for internal
  APIs basic bearer authentication is used with this secret. Used by all NodeJS services.

- __keycloak\_admin:__ Password of the keycloak admin user. Only used by keycloak.

- __postgres:__ Password for the postgres database admin user. Used by all services that
  required access to the database: keycloak, repo service, api-bridge service.

- __session:__ Session secret to encrypt user session cookies. Used by all services that have
  publicly available endpoints or web pages and hence need to check whether a user is logged
  in: auth service, frontend service, logs service, all visualizations
