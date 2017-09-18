'use strict';

const _       = require('lodash'),
      Build   = require('./lib/build'),
      Deploy  = require('./lib/deploy');

class ServerlessMicroServicesPlugin {

  constructor(serverless, options) {

    this.serverless = serverless;
    this.options = options;

    const DIRECTORY = './.services/';

    this.build = new Build(this.serverless, this.options, DIRECTORY);
    this.deploy = new Deploy(this.serverless, DIRECTORY);

    this.commands = {
      deploy: {
        usage: 'Helps you manage, build, and deploy multiple microservices under one primary service.',
        lifecycleEvents: [
          'micro'
        ],
        commands: {
          micro: {
            usage: 'Helps you manage, build, and deploy multiple microservices under one primary service.',
            lifecycleEvents: [
              'micro'
            ],
            options: {
              service: {
                usage: 'Specify the service you want to deploy (e.g. "--service \'My Service\'" or "-v \'My Service\'")',
                required: false,
                shortcut: 'v'
              },
              function: {
                usage: 'Specify the function you want to deploy (e.g. "--function myAwesomeFunction" or "-f myAwesomeFunction")',
                required: false,
                shortcut: 'f'
              },
              stage: {
                usage: 'Specify the stage you want to deploy (e.g. "--stage prod or "-s prod")',
                required: false,
                shortcut: 's'
              },
              gateway: {
                usage: 'Specify the stage you want to deploy (e.g. "--stage prod or "-s prod")',
                required: false,
                shortcut: 'g'
              }
            }
          }
        }
      }
    };

    this.hooks = {
      'deploy:micro:micro': this.deployService.bind(this)
    };

  }

  // Calls

  deployService() {

    const _this = this,
          service = (typeof(this.options.service) !== 'undefined') ? this.options.service : false,
          func = (typeof(this.options.function) !== 'undefined') ? this.options.function : false,
          stage = (typeof(this.options.stage) !== 'undefined') ? this.options.stage : 'dev',
          gateway = (typeof(this.options.gateway) !== 'undefined') ? true : false;

    if (!service) {
      console.log('ERROR: You must supply a service.');
      return;
    }

    this.build.buildServices(service, stage, gateway)
      .then(function() {
        _this.deploy.deploy(service, func, stage, false)
          .then(function() {
            console.log('Finished deploying');
          });
      });

  }

}

module.exports = ServerlessMicroServicesPlugin;
