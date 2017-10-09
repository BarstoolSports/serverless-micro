# serverless-micro

[Serverless framework](https://www.serverless.com) plugin to help manage multiple micro services under one main service.  

A limit of Cloudformation is it can only hold 200 objects.  This becomes problematic when you are dealing with even a medium sized API and the Serverless framework.  This plugin aims to split up the methods outlined in the main Serverless file, to multiple services, and give you the flexibility to deploy those services individually.

## What this doesn't do...yet.

This plugin does not setup a main API Gateway file for you, although it is a major priority.  Currently, this still has to be managed using AWS and API Gateway.

Additionally, you have to setup your folder structure in a specific way.  Again the goal is to make this more universal so it doesn't matter what folder structure you have setup.

```yaml
my_project:
  serverless.yml
  node_modules
  lib
  tests
  handlers
    stories.js
    podcasts.js
    videos.js
```

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

Add the service name to each of your methods.

```yaml
# serverless.yml

functions:

  # Stories

  fetchStories:
    handler: "handlers/stores.fetchStories"
    events:
      - http:
          path: /stories
          method: get
    service: stories

  # Podcasts

  fetchPodcasts:
    handler: "handlers/podcasts.fetchPodcasts"
    events:
      - http:
          path: /podcasts
          method: get
    service: podcasts

  # Videos

  fetchVideos:
    handler: "handlers/videos.fetchVideos"
    events:
      - http:
          path: /videos
          method: get
    service: videos

```

Once services are setup deploy using new hook.

```bash
$ sls deploy micro --service stories
$ sls deploy micro --service stories --stage prod
$ sls deploy micro --service stories --stage prod --function fetchStories
```

## Contributing

We welcome pull requests! Please fork the repo and submit your PR.
http://mcsorleys.barstoolsports.com/feed/the-podfathers
