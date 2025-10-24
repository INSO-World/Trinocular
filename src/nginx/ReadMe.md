# NGINX

## Description

[NGINX](https://nginx.org/en/) can act as a webserver, loadbalancer and many proxy services.
Trinocular uses it as a reverse proxy/api-gateway to offer a common entry point for all services, by routing different paths to the
correct service.

## Dockerfile

The Dockerfile is used to copy the nginx-configuration files into the image. Alternatively, this could be done in the
docker-compose file via mounting.

## Routes

Trinocular offers following routes to the outside world:

* `/` - The main entry point for the frontend
* `/auth` - The authentication service
* `/keycloak` - The keycloak service
* `/logs` - The logs service

## Tutorials

NGINX can be configured using the `templates/*.conf.tempalte` files. The main config file is `default.conf.template`. In the config file we can define what nginx should do with the incoming traffic.

For easier parameterization the nginx docker image support environment variable substitution (hence the `.template` name). Variables provided in the `.env` file are automatically string interpolated on startup.

For the usage in Trinocular the most important configuration blocks are:

* http: Tells NGINX how to handle HTTP traffic
* server: Defines the configuration for a specific server
* location: Defines the routes

### Changing Server Configuration

The following can be changed in the server block to configure the server:

``listen`` tells NGINX on which port it should listen.
``server_name`` is the domain name of the server.

### Adding new route

To add a new route, you need to add a new location block.
The location block takes many parameters to set headers etc. but the most important one is the `proxy_pass` parameter.
To add a new location that forwards the traffic from http://localhost:8080/new_service the following block needs to be
added:

````text
location /new_service {
    proxy_pass http://localhost:8080;
}
````

#### Other location parameters

* proxy_set_header Host $host; - Sets the host header to the host of the incoming request
* proxy_set_header X-Real-IP $remote_addr; - Sets the real IP of the client
* proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; - Sets the forwarded for header
