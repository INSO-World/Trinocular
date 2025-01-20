# Disclaimer

This demo project demonstrates the creation of a new visualization service using Node.js.
The tech stack used for the implementation is open for the developer to choose.

The developer only needs to provide a webpage, which is embedded into an iframe in the Fronted
service, and needs to register the visualizations at the registry.
Data for the visualizations can be fetched from the Api-Bridge and the Repo Service.

## Implementation details without demo visualization

This will briefly mention all things that need to be done in order to create a new visualization in
any tech stack.

* Register the visualization at the registry
* Create a database schema
* Fetch data from the Api-Bridge and Repo Service
* Create a snapshot for the visualization
* Implement the graph
* Provide a webpage

# Visualization Demo

This documentation should provide a brief overview of the task that need to be done in order to
create a new visualization. The demo project already includes _TODOs_ which should guide you through
the process.

## Service Structure

The implementation of a visualization can conceptually be divided into three parts, the
visualization
and the data storage and default.

### Default

#### File Description

- index.js: Sets up middlewares, db access and registers the visualization
- Dockerfile: Contains the docker configuration for the visualization service
- .env: Contains the environment variables for the visualization service
- package.json: Contains the dependencies for the visualization service

### Visualization part

The visualization part contains everything that will be executed in the browser.

#### File Description

- public: Contains all files that will be served to the client
  - demo-chart.js: Contains the main logic for the visualization
  - main.js: Contains the logic for switching and setting up the different charts
  - styles.css: Contains the styles for the visualization
- views
  - index.template.html: Contains the html for the demo chart

### Data Storage

The data storage part contains everything that is necessary to store the data that will be used by
the visualization.

#### File Description

- lib: Contains all helper functions for the other files
  - database.js: Contains the database access functions
  - demo-utils.js: Utility function for the demo-chart (other charts should create their own)
  - request.js: Contains request for the API-Bridge
- routes
  - api->snapshot.js: Creates the snapshot for the visualization service
  - demo-chart.js: Methods for handling access to demo chart data
  - routes.js
- scripts
  - schema.js: Database schema

### Implementation Guide

This section will guide you through the process of creating a new visualization. Note each file
contains _TODOs_ which should guide you through the process. Therefore, this is only a course
structure you could follow to implement all _TODOs_.

1. Copy this folder and then rename it to the name of the visualization you want to create.
2. Replace all occurrences of `demo` with the name of the visualization in all default files.
3. Start by implementing the data storage part in the following order
  * Implement the database schema in `scripts/schema.js`
  * Implement the database access functions in `lib/database.js`
  * Implement the snapshot creation in `routes/api/snapshot.js`

4. As you need add helper files in `lib`
5. Implement the visualization part in the following order
  * Add the visualization in `public/main.js`
  * Implement the visualization in `public/demo-chart.js`

