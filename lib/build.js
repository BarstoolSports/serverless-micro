
'use strict';

const _       = require('lodash'),
      async   = require('async'),
      YAML    = require('yamljs'),
      write   = require('write'),
      copy    = require('copy');

class Build {

  constructor(serverless, options, dir) {
    this.serverless = serverless;
    this.options = options;
    this.directory = dir;
  }

  // Helpers

  removePlugin(payload) {
    var i, itm;
    var len = payload.plugins.length,
        arr = [];
    for(i = 0; i < len; i++) {
      itm = payload.plugins[i];
      if (itm !== 'serverless-micro') arr.push(itm)
    }
    payload.plugins = arr;
    return payload;
  }

  getYAMLObject(svc, service_id, functions, stage) {
    var payload = {
      service: `${svc.service}-${service_id}`,
      provider: svc.provider,
      custom: {
        stage: '${opt:stage, self:provider.stage}',
        prefix: '${self:service}-${self:provider.stage}'
      },
      plugins: svc.plugins,
      package: {
        include: [ '../../lib/**', '../../node_modules/**' ]
      },
      functions: functions
    };
    payload.provider.stage = stage;
    return this.removePlugin(payload);
  }

  addService(arr, type, item_id, item) {
    if (typeof(arr[type]) === 'undefined') arr[type] = {};
    item.name = item.name.replace(this.serverless.service.custom.prefix, '${self:custom.prefix}-'); // TODO: Remove the dash here...
    delete item.service;
    arr[type][item_id] = JSON.parse(JSON.stringify(item));
    return arr;
  }

  getServiceTypes() {
    let itms = this.getAllFunctions();
    let final = {};
    for (let i = 0; i < itms.length; i++) {
      let itm = this.serverless.service.functions[itms[i]];
      if (typeof(itm.service) !== 'undefined') {
        final = this.addService(final, itm.service, itms[i], itm);
      }
    }
    return final;
  }

  getAllFunctions() {
    return this.serverless.service.getAllFunctions()
  }

  copyHandler(service_id) {
    const _this = this;
    return new Promise(function(resolve, reject) {
      copy(`./handlers/${service_id}.js`, `${_this.directory}${service_id}/`, function(err, files) {
        if (err) return reject(err);
        return resolve();
      });
    })
  }

  buildServiceYML(service_id, functions, stage) {
    let yamlString = YAML.stringify(this.getYAMLObject(this.serverless.service, service_id, functions, stage), 6, 2);
    return write(`./.services/${service_id}/serverless.yml`, yamlString);
  }

  // Proxy

  findHTTPEvent(events) {
    let i;
    let len = events.length;
    for(i = 0; i < len; i++) {
      if ( !events.hasOwnProperty(i) ) return;
      if (typeof(events[i].http) !== 'undefined') return events[i].http;
    }
    return false;
  }

  getYAMLObjectForProxy(svc, functions) {
    return {
      service: `${svc.service}-proxy`,
      provider: {
        name: `${svc.provider.name}`,
        runtime: `${svc.provider.runtime}`
      },
      custom: {
        stage: '${opt:stage, self:provider.stage}',
        prefix: '${self:service}-${self:provider.stage}'
      },
      package: {
        include: [ '../../lib/**', '../../node_modules/**' ]
      },
      functions: functions
    };
  }

  getYAMLObjectForProxyMethod(name, func, endpoint) {
    const http = this.findHTTPEvent(func.events);
    return {
      handler: `handler.hello`,
      name: `proxy-${name}`,
      events: [
        {
          http: {
            path: http.path,
            method: http.method,
            integration: 'http-proxy',
            request: {
              uri: `${endpoint}${http.path}`
            }
          }
        }
      ]
    };

    /*
    handler: handler.hello
    events:
    - http:
        path: test/stories
        method: get
        integration: http-proxy # or http-proxy
        request:
          uri: http://union-staging.barstoolsports.com/v1/stories # required
          */
  }

  getStackInfo(stackName) {

    let outputs;
    let endpoint = false;

    this.provider = this.serverless.getProvider('aws');

    stackName = (stackName) ? stackName : this.provider.naming.getStackName(this.options.stage);

    return this.provider.request('CloudFormation',
      'describeStacks',
      { StackName: stackName },
      this.options.stage,
      this.options.region)
    .then((result) => {
      if (result) {
        outputs = result.Stacks[0].Outputs;
        const serviceEndpointOutputRegex = this.provider.naming.getServiceEndpointRegex();
        outputs.filter(x => x.OutputKey.match(serviceEndpointOutputRegex))
          .forEach(x => {
            endpoint = x.OutputValue;
          });
      }
      return Promise.resolve(endpoint);
    });
  }

  buildProxyFunctionsForService(funcs, endpoint) {
    const _this = this;
    return new Promise(function(resolve, reject) {
      let i;
      let arr = {};
      for(i in funcs) {
        if ( !funcs.hasOwnProperty(i) ) return;
        arr[i] = _this.getYAMLObjectForProxyMethod(i, funcs[i], endpoint);
      }
      return resolve(arr);
    })
  }

  removeEventsFromFunctions(functions) {
    const _this = this;
    return new Promise(function(resolve, reject) {
      let i;
      for(i in functions) {
        if ( !functions.hasOwnProperty(i) ) return;
        delete functions[i].events;
      }
      return resolve(functions);
    })
  }

  // Calls

  buildServices(service, stage, gateway) {
    const _this = this;
    return new Promise(function(resolve, reject) {
      let services = _this.getServiceTypes();
      async.forEachOf(services, function (functions, service_id, callback) {
        if ( service_id === 'proxy' ) {
          callback();
        } else {
          if (( service && (service === service_id) ) || (!service)) {
            // NOTE: Should we make this optional???
            // if (!gateway) {
            //
            // } else {
            //
            // }
            _this.removeEventsFromFunctions(functions)
              .then(function(functions) {
                _this.copyHandler(service_id)
                  .then(function() {
                    _this.buildServiceYML(service_id, functions, stage)
                      .then(function() {
                        console.log(`Finished building ${service_id} service`);
                        callback();
                      });
                  });
              });
          } else {
            callback();
          }
        }
      }, function (err) {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  }

  buildProxy() {
    let stack_id, yamlString;
    const _this = this,
          services = _this.getServiceTypes(),
          methods = {};
    return new Promise(function(resolve, reject) {
      async.forEachOf(services, function (functions, service_id, callback) {
        if ( service_id === 'proxy' ) {
          callback();
        } else {
          stack_id = `union-${service_id}-dev`
          _this.getStackInfo(stack_id)
            .then(function(endpoint) {
              console.log(`${service_id} - ${endpoint}`);
              _this.buildProxyFunctionsForService(functions, endpoint)
                .then(function(objects) {
                  _.extend(methods, objects);
                  callback();
                })
            })
        }
      }, function (err) {
        if (err) {
          return reject(err);
        }
        yamlString = YAML.stringify(_this.getYAMLObjectForProxy(_this.serverless.service, methods), 8, 2);
        return write(`./.services/.proxy/serverless.yml`, yamlString);
      });
    })
  }

}

module.exports = Build;
