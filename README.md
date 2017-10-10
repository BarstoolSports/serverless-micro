# serverless-micro

[Serverless framework](https://www.serverless.com) plugin to help manage multiple micro services under one main service.  

A limit of Cloudformation is it can only hold 200 objects.  This becomes problematic when you are dealing with even a medium sized API and the Serverless framework.  This plugin aims to split up the methods outlined in the main Serverless file, to multiple services, and give you the flexibility to deploy those services individually.

## What this doesn't do...yet.

This plugin does not setup a main API Gateway file for you, although it is a major priority.  Currently, this still has to be managed using AWS and API Gateway.

## Structure

To get this plugin working properly, you have to setup your folder structure in a specific way.  Again the goal is to make this more universal so it doesn't matter what folder structure you have setup, but with dependencies be included in the handler files and mixing placement of lambdas, this get's very tricky.

```yaml
my_project:
  serverless.yml
  node_modules
  lib
  tests
  handlers
    service_1.js
    service_2.js
    service_3.js
```

This is something we are focused on making improving, however, separating out the logic this way has worked really well, and enables a really good process.

## Installation

Install the plugin from npm

```bash
$ npm install --save-dev serverless-micro
```

## Usage

Add the plugin to your `serverless.yml`

```yaml
# serverless.yml

plugins:
  - serverless-micro
```

Using the folder structure above, you then add the service name to each of your methods and separate them out.

```yaml
# serverless.yml

functions:

  # Stories

  fetchStories:
    handler: "handlers/service_1.serviceOneMethod"
    events:
      - http:
          path: /serviceOne
          method: get
    service: service_1

  # Podcasts

  fetchPodcasts:
    handler: "handlers/service_2.serviceTwoMethod"
    events:
      - http:
          path: /serviceTwo
          method: get
    service: service_2

  # Videos

  fetchVideos:
    handler: "handlers/service_3.serviceThreeMethod"
    events:
      - http:
          path: /serviceThree
          method: get
    service: service_3

```

Once services are setup deploy using new hook.

```bash
$ sls deploy micro --service stories
$ sls deploy micro --service stories --stage prod
$ sls deploy micro --service stories --stage prod --function fetchStories
```

## Contributing

We welcome pull requests! Please fork the repo and submit your PR.
https://github.com/BarstoolSports/serverless-micro
