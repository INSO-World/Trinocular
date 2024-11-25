# Registry Service

## Description

The Registry Service manages visualization services. It plays a crucial role in Trinoculars microservice and
micro-frontend architecture. It is responsible for managing (add, delete) visualization service instances and providing
them to subscribers (pub/sub architecture).

## Dockerfile

- The Dockerfile sets up the environment for the Registry Service.
    - Load required modules
    - Copy the source code
    - Expose the port

[//]: # (## Service Instance Management)

[//]: # ()

[//]: # (The Registry Service allows for the management of service instances, including health checks and notifications.)

[//]: # (Additionally, Subscribers can subscribe to notifications to retrieve all available visualizations.)

[//]: # ()

[//]: # (```mermaid)

[//]: # (sequenceDiagram)

[//]: # (    participant Client)

[//]: # (    participant Registry)

[//]: # (    Client ->> Registry: Create Service Instance)

[//]: # (    Registry -->> Client: Instance Created)

[//]: # (```)

## Endpoints

All endpoints are API secured.

### `GET` /service/:name

Retrieve the details of a visualization service.

#### Path parameters:

- `name` Name of the service

#### Response Body:

Array of visualization service data, containing:

```json
  {
  "0": {
    "hostname": "example.com",
    "healthCheck": "/health",
    "data": {}
  },
  "1": {
    "hostname": "example.com",
    "healthCheck": "/health",
    "data": {}
  }
}
```

* id: ID of the visualization service instance (used in following endpoints as :id parameter)
* hostname: Hostname of the visualization service
* healthCheck: Health check endpoint of visualization service
* data: Containing information about the concrete visualizations

`````json
{
  "visualizations": [
    {
      "name": "demo-apples",
      "displayName": "Demo - Apples",
      "framePath": "index.html?show=apples"
    },
    {
      "name": "demo-oranges",
      "displayName": "Demo - Oranges",
      "framePath": "index.html?show=oranges"
    }
  ]
}
````` 

#### Response Codes
* 404: Visualization service not found
* 200: Visualization service found

### `POST` /service/:name

Create a new visualization service instance.

Path parameters:

- `name` Name of the service

#### JSON Body:

```json
  {
  "hostname": "example.com",
  "healthCheck": "/health",
  "data": {
    "visualizations": [
      {
        "name": "demo-apples",
        "displayName": "Demo - Apples",
        "framePath": "index.html?show=apples"
      },
      {
        "name": "demo-oranges",
        "displayName": "Demo - Oranges",
        "framePath": "index.html?show=oranges"
      }
    ]
  }
}
```
* hostname: Hostname of the visualization service
* healthCheck: Health check endpoint of visualization service
* data: Containing information about the concrete visualizations

#### Response Body
````json
{
  "id": 0
}
````

#### Response Codes
* 422: Invalid Body
* 409: Visualization instance already exists
* 200: Visualization service created

### `PUT` /service/:name/:id

Update an existing visualization service instance.

Path parameters:

- `name` Name of the visualization service
- `id` ID of the visualization service instance

#### JSON Body:
[Same as POST /service/:name](#post-servicename)

#### Response Codes
* 404: Visualization service or instance not found
* 422: Invalid Body
* 200: Visualization service updated

### `DELETE` /service/:name/:id

Delete a visualization service instance.

Path parameters:

- `name` Name of the service
- `id` ID of the service instance

#### Response Codes
* 404: Visualization service or instance not found
* 200: Visualization service deleted

### `ALL` /service/:name/broadcast/*
Send a message to all subscribers of a visualization service.

Path parameters:

- `name` Name of the service
- `*` Path to broadcast

#### JSON Body:
Use the correct body for the broadcast path.

#### Response Codes
* 404: Visualization service or instance not found
* 200: Visualization service deleted

### `POST` /service/:name/notify/:subscriber/broadcast/*
Adds a subscriber to a visualization service. This subscriber is notified if new 
visualizations are added.

Path parameters:

- `name` Name of the service
- `*` Path to broadcast

#### JSON Body:
Use the correct body for the broadcast path.

#### Response Codes
* 200: Subscriber added

### `DELETE` /service/:name/notify/:subscriber/broadcast/*
Removes a subscriber from the notify list of a visualization service.

Path parameters:

- `name` Name of the service
- `subscriber` Subscriber to remove
- `*` Ignored

#### Response Codes
* 404: Subscriber or Visualization service not found
* 200: Subscriber removed

## Tutorials

### How to create a new service instance

1. Send a `POST` request to `/service/:name` with the service instance details.
2. The service will validate the request and create a new instance if valid.

### How to update a service instance

1. Send a `PUT` request to `/service/:name/:id` with the updated service instance details.
2. The service will validate the request and update the instance if valid.

## Classes

### `Registry`

Manages the collection of services.

### `Service`

Represents a service with multiple instances and subscribers.

### `ServiceInstance`

Represents an individual service instance with health check capabilities.

### `NotificationSubscriber`

Represents a subscriber to service notifications.