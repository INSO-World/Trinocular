
# Keycloak Service

## Description

The Keycloak service functions as the OpenID provider in our system. It manages all user-related data, including usernames, emails, passwords, 2FA, roles, and other aspects of user management. When the auth service initiates an OpenID login flow, Keycloak handles the authentication process, including validating user credentials and issuing tokens for successful logins. Keycloak serves as the central authority for managing the access control and user identity within the system. It uses a PostreSQL DB as a data storage.


## Tutorials

### How to setup Keycloak
Setup keycloak by creating a new realm with a user and client. For this the instance has to be started via the docker-compose file.

1. Navigate to the admin login page under localhost:8080/keycloak.
2. Login as admin using the keycloak_admin_secret.
3. Create new realm (Button inside the drop down left top) and name it "trinocular"
4. Select the "trinocular" realm in the drop down
5. Create new user in the "trinocular" realm with username, email, firstname, lastname. Also set "email verified" to true.
6. Select the credentials tab of the new user
7. Set Password a new password. Deselect the "temporary" option!
8. Create new client in the "trinocular" realm and name it "trinocular_client". Then go to "next".
9. In the capability config of the client check the "Standard flow" checkbox. Then go to "next".
10. In the login settings of the client set the valid redirect URI to "http://localhost:8080/auth/*". Safe the client.
11. Logout.
12. Keycloak should show the OIDC information as JSON under http://localhost:8080/realms/trinocular/.well-known/openid-configuration


## Official Documentation
The official keycloak documentation can be found here: https://www.keycloak.org/documentation
