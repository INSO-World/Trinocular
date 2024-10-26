
# Trinocular

## Setup
Follow the steps below to setup the project on your machine for development.
You only need to do this once.

1. Pull the repo from GitLab
2. Take a look at the `secrets` section of the `docker-compose.yml`. You need to create each text file
   and fill it with a secret string. Make sure not to include any whitespace (including newlines) when
   saving the file if your editor has autoformatting configured. For more details check out the ReadMe
   in the secrets directory.
3. In the base directory of the repo run `docker-compose build`.
4. In the base directory of the repo run `docker-compose up`. Now the project should start up for the 
   first time. For now it should not matter if some errors get printed. Check that the nginx, postgres
   and keycloak services started up and are healthy.
5. Setup keycloak by creating a new realm with a user and client.
   1. Navigate to the admin login page under `localhost:8080/keycloak`.
   2. Login as `admin` using the `keycloak_admin_secret`.
   3. Create new realm (Button inside the drop down left top) and name it "trinocular"
   4. Select the "trinocular" realm in the drop down
   5. Create new user in the "trinocular" realm with username, email, firstname, lastname. Also set
      "email verified" to true.
   6. Select the credentials tab of the new user
   7.  Set Password a new password. Deselect the "temporary" option!
   8.  Create new client in the "trinocular" realm and name it "trinocular_client". Then go to "next".
   9.  In the capability config of the client check the "Standard flow" checkbox. Then go to "next".
   10. In the login settings of the client set the valid redirect URI to "http://localhost:8080/auth/*". Safe the client.
   11. Logout.
   12. Keycloak should show the OIDC information as JSON under `http://localhost:8080/realms/trinocular/.well-known/openid-configuration`
6.  Hit `Ctrl-C` and wait for everything to shutdown. This should only take a few seconds.
7.  Start the system again with `docker compose up`. Now, no errors should be visible in the log.
8.  Navigate to `http://localhost:8080` and click `login`. You should now be able to login via keycloak.
9.  To gain better editor support for eg. types and autocomplete, install the node dependencies for the
   services. Run `npm i` (or better `pnpm i`) in each service directory that has a `package.json`.

## Commit namespace
Each commit summary must be prefixed with a namespace, to make it easy
to see what part of the system was changed. Below are a few examples.

```
Doc: Added section about commits in the ReadMe

Postgres: Added a health check

Docker: Moved secret files to '/secrets'

Fronted: Prevent the navbar from overflowing on mobile
```

The following namespaces exist for general parts of the project:
- Doc: Anything related to documentation and non source files used for description of the project.
- Docker: Anything related to containerization, that is not specific to a certain container or container internals.

Each service has its own commit namespace:
- Nginx
- Keycloak
- Memcached
- Postgres
- Auth
- Frontend
- Registry

Visualization services have their name as the commit namespace.
- Demo: The demo visualization service.

## Services

- ___nginx:___ Proxy server that routes incoming web requests to the respective service based on the
  request path.

- ___keycloak:___ O-Auth provider that handles user authentication and initiates user sessions. It allows
  users to login and handles everything related to security. It also allows for user management, 
  verification and roles.

- ___memcached:___ Simple in-memory key-value-store database. It stores all active user sessions and 
  makes it possible for other servives to check whether a request is authenticated.

- ___postgres:___ Relational SQL database.

- ___auth:___ Authentication service that handles the communication with the O-Auth provider and creates
  user sessions.

- ___frontend:___ Delivers the frontend website to the browser. Communicates and proxies requests to the
  visualization services that hook into the system.

- ___registry:___ Acts as a simple notification service based on HTTP pub/sub. Services can register 
  themselves and advertise their abilities with additional data fields. Visualizations use the registry
  to add themselves to the system on startup, while the frontend listens for notifications.

