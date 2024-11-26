# Scheduler

## Description

The scheduler handles automatic updates of all stored repositories. This depends on the set schedule,
where the default schedule is once per day.

## Dockerfile

The scheduler service is a standard Node.js application built on an Alpine Linux base image. No additional
volumes or such are needed.

## Endpoints

All endpoints are api secured.

### (API) `GET` /schedule

This endpoint can be used to retrieve the set schedules of all stored repositories. The response 
contains an array of schedules in the form:
```JSON
[
  {
    "repoUuid": "1234-5678-uuid-1",
    "cadence": 86400,
    "state": "updating_api_service"
  },
  {
    "repoUuid": "9876-5432-uuid-2",
    "cadence": 86400,
    "state": "waiting"
  }
]
```

### (API) `POST` /schedule

Set a new schedule for the given repository. The schedule is given by:

```JSON
{
  "uuid": "1234-5678-uuid-1",
  "cadence": 86400,
  "startTime": "2024-11-18T14:23:45.678Z"
}
```
The cadence must be given in seconds, `86400` in the example corresponds to one day. The start time 
is in ISO date format as seen in the example.

### (API) `DELETE` /schedule/:uuid

Delete the schedule of the given repository. The repository will not be updated regularly anymore.

Path parameters:
* `uuid` UUID of the repository

### (API) `POST` /registry/notify

With this endpoint, the currently available visualizations can be fetched from the registry.
This is done at least upon startup of the scheduler service, so that later all visualizations can be 
notified when a snapshot of a repository should be performed.

### (API) `GET` /task

This endpoint can be used to retrieve all pending and running snapshot tasks. The response will be 
of the form:

```JSON
[
  {
    "transactionId": "1234-task-uuid-1",
    "repoUuid": "1234-repo-uuid-1",
    "schedule": { "cadence" : 86400 },
    "state": "updating_visualizations",
    "visualizationProgress": {
      "counter": 2,
      "count": 5
    }
  },
  {
    "transactionId": "1234-task-uuid-2",
    "repoUuid": "1234-repo-uuid-2",
    "schedule": null,
    "state": "pending",
    "visualizationProgress": null
  }
]
```

### (API) `GET` /task/:transactionId

Retrieve a specific task by its transaction uuid. If the task exists, it is returned in the same 
form as the [/task](#api-get-task) endpoint.

Path parameters:
* `transactionId` Transaction UUID of the task

### (API) `POST` /task

With this endpoint a new task can be scheduled, which will be directly queued, even if the schedule 
for the given repository states a different point of time. The request is supposed to look like:
```JSON
{
    "uuid": "some-repo-uuid-1",
    "doneCallback": "http://caller.com/taskDone/notify"
}
```

The response will be a transactionId (UUID). As soon as the task is finished, the caller will be 
notified via the provided callback.

### (API) `POST` /task/:transactionId/callback/:caller

The services that perform a task (API/repo service) call this callback
endpoint to notify if the task could be performed successfully or not. In case one service calls
this endpoint with an error, the scheduler reacts by failing this task as a whole.

Path parameters:
* `transactionId` Transaction UUID of the task
* `caller` Name of the calling service, e.g. "repo" 

Query parameters:
* `status` Status information for callback (either `ok` or `error`)
* `message` e.g. in case of error what exactly went wrong

## Classes

### Scheduler
_TODO_

### Schedule
_TODO_

### UpdateTask
_TODO_
