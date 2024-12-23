# Test-Guidelines

## Test frameworks:

- [Sinon](https://sinonjs.org/) \
  Used for testing external function calls or API dependencies by creating spies for tracking calls,
  stubs for replacing dependencies, and mocks for simulating interactions.
- [Chai](https://www.chaijs.com/) \
  Used for writing assertions to verify test outcomes, such as validating values, objects, or API
  responses.
- [Supertest](https://github.com/ladjs/supertest) \
  Used for testing HTTP endpoints by sending requests to a server and verifying the responses,
  primarily in integration and API testing scenarios.

## Unit Tests

### Endpoint Tests

The endpoints of each service will be tested to validate if they exists if they correctly
configured regarding query and path parameters. Further, the authentication management will be
tested.

### Data Processing

Important processing that alters the data in any way (filter, remove, add or change data layout)
needs tests to verify the correct behavior.

### Persistence

Any requests to a database need to have the correct format and expected value types. The persistence
in the database itself will not necessarily be tested.

## Component Tests

The necessary workflows that are required by Trinocular should be tested (manually or
automatically).

Examples include:
 - Creating a new datasource on the api-bridge and requesting a snapshot
 - Creating a new repository on the repo service and requesting a snapshot
 - Registering a service at the registry
 - Scheduling a task at the scheduler


## UI Tests

The UI of the frontend service and the implemented visualization services will be manually tested in
the course of a [system test](#system-test). Errors will be noted in
the [test protocol](#test-protocol).

## System Test

The test cases for manual system tests are specified on the corresponding 
[Wiki page](https://reset.inso.tuwien.ac.at/repo/2024ws-ase-pr-group/24ws-ase-pr-qse-07/-/wikis/Home/Testing/system-test-specifications).

### Test protocol


For a manual system test a test protocol is written and uploaded to the Wiki, 
the template can be chosen when creating a new Wiki page.

The protocol should contain:

* Name of team member testing
* Date
* Branch
* Current commit

For each test case from the document [System Test Specifications](https://reset.inso.tuwien.ac.at/repo/2024ws-ase-pr-group/24ws-ase-pr-qse-07/-/wikis/Home/Testing/system-test-specifications) should be given in a table

* Number of test case
* Result (colored):
  * Correct result (green)
  * Error (red)
* Difference to expected result (filled-in in case of an error)

