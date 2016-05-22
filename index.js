var fs = require('fs');
var path = require('path');
var Queue = require('./queue');
var meteor = require('./meteor.js');
var _ = require('underscore');

function meteorBuildClient(config, done) {
  config = _.clone(config || {});
  done = _.isFunction(done) ? done : function(){};

  _.defaults(config, {
    input: './',
    output: './.meteor-build',
    template: null,
    settings: null, // path or object
    url: null,
    path: "/",
    feedback: false, // output console messages
  });

  config.input = path.resolve(config.input);
  config.output = path.resolve(config.output);

  if (_.isString(config.template))
    config.template = path.resolve(config.template);
  if (_.isString(config.settings))
    config.settings = path.resolve(config.settings);

  config.bundleName = path.basename(config.input);

  // Build queue syncron
  var queue = new Queue();


  // check if in meteor folder
  try {
      if(!fs.lstatSync(path.join(config.input, '.meteor')).isDirectory())
          throw new Error();

  } catch(e) {
      done('You\'re not in a Meteor app folder or inside a sub folder of your app.');
      return;
  }

  // check template file
  if(config.template) {
      try {
          if(!fs.lstatSync(config.template).isFile())
              throw new Error();

      } catch(e) {
          done('The template file "'+ config.template +'" doesn\'t exist or is not a valid template file');
          return;
      }
  }

  // build meteor
  queue.add(function(callback){
      if (config.feedback)
        console.log('Bundling Meteor app...');
      meteor.build(config, callback);
  });

  // move the files into the build folder
  queue.add(function(callback){
      if (config.feedback)
        console.log('Generating the index.html...');
      meteor.move(config, callback);
  });

  // create the index.html
  queue.add(function(callback){
      meteor.addIndexFile(config, callback);
  });

  // delete unecessary fiels
  queue.add(function(callback){
      meteor.cleanUp(config, function(){
          if (config.feedback) {
            console.log('Done!');
            console.log('-----');
            console.log('You can find your files in "'+ config.output +'".');
          }
          callback();
      });
  });

  // done
  queue.add(function() {
    done(null);
  });

  queue.run();
}

module.exports = meteorBuildClient;