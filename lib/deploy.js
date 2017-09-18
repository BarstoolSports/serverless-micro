
'user string';

const _       = require('lodash'),
      fs      = require('fs'),
      exec    = require('child_process').exec,
      async   = require('async');

class Deploy {

  constructor(serverless, dir) {
    this.serverless = serverless;
    this.directory = dir;
  }

  runExecute(file, additional) {
    this.serverless.cli.log(`Deploying Service '${file}' with ${additional}`);
    return new Promise(function(resolve, reject) {
      exec(`cd ./.services/${file}; serverless deploy ${additional}`, (error, stdout, stderr) => {
        if (error) {
          return reject(`exec error: ${error} ${stdout}`);
        }
        return resolve(stdout);
      });
    })
  }

  deploy(service, func, stage, all) {
    const _this = this;
    func = (func) ? `function -f ${func}` : '';
    stage = (stage) ? ` --stage ${stage}` : '';
    return new Promise(function(resolve, reject) {
      if ( service && !all ) {
        _this.runExecute(service, func + stage + ' --force')
          .then(function(results) {
            console.log(`stdout: ${results}`);
            return Promise.resolve();
          });
      } else {
        fs.readdir( './.services/', function( err, files ) {
          if( err ) {
            console.error( "Could not list the directory.", err );
            process.exit( 1 );
          }
          async.eachSeries(files, function (file, callback) {
            if ( file === '.proxy' && !all ) {
              callback();
            } else {
              _this.runExecute(file, func + stage + ' --force')
                .then(function(results) {
                  console.log(`stdout: ${results}`);
                  callback();
                });
            }
          }, function (err) {
            if (err) {
              return Promise.reject(err);
            }
            return Promise.resolve();
          });
        });
      }
      return Promise.resolve();
    });
  }

  deployProxy(service, func) {
    const _this = this;
    return new Promise(function(resolve, reject) {
      _this.runExecute('.proxy', '')
        .then(function(results) {
          console.log(`stdout: ${results}`);
          return Promise.resolve();
        });
    });
  }

  getStackInfo(stackName) {

    this.provider = this.serverless.getProvider('aws');

    let endpoint = false;

    stackName = (stackName) ? stackName : this.provider.naming.getStackName(this.options.stage);

    return this.provider.request('CloudFormation',
      'describeStacks',
      { StackName: stackName },
      this.options.stage,
      this.options.region)
    .then((result) => {
      let outputs;
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

}

module.exports = Deploy;
