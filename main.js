#!/usr/bin/env node

const { print } = require('./helpers.js');
const fs = require('fs');
const pathLib = require('path');

// CLI Options
const program = require('commander');

const Q = require('bluebird');
const packageJson = require('./package.json');

// VARIABLES
const argPath = process.argv[2];
const meteor = require('./meteor.js');

program
  .version(packageJson.version)
  .usage('<output path> [options]')
  .option('-p, --path <path>', 'The path used to link the files, default is "/", pass "" to link relative to the index.html.')
  .option('-t, --template <file path>', 'Provide a custom index.html template. Use {{> head}}, {{> css}} and {{> scripts}} to place the meteor resources.')
  .option('-s, --settings <settings.json>', 'Set optional data for Meteor.settings in your application.')
  .option('-u, --url <url>', 'The Root URL of your app. If "default", Meteor will try to connect to the Server where it was served from. Default is: "" (empty string)')
  .option('-b, --usebuild <path>', 'If this flag is present, meteor-build-client will skip the `meteor build` step and opt for using your manually built <path> or ../build folder by default.', false)
  .option('-D, --debug', 'Build in debug mode (don\'t minify, etc)')
  .option('-v, --verbose', 'Add optional verbose option.')
  .option('-d, --ddp <url>', 'The URL of your Meteor DDP server, e.g. "ddp+sockjs://ddp.myapp.com/sockjs". If you don\'t add any it will also add call "Meteor.disconnect();" to prevent the app from conneting.');

program.on('--help', function(){
  print('  Warning: \r\n');
  print('  The content of the output folder will be deleted before building the new output!');
  print('  Don\'t do something like: meteor-build-client /home !\r\n');
});

program.parse(process.argv);


Q.try(function() {
  if (!argPath) {
    throw new Error('You need to provide a path for the build output, for example:\n\n$ meteor-build-client myBuildFolder');
  }

  if (!fs.lstatSync('./.meteor').isDirectory()) {
    throw new Error('You\'re not in a Meteor app folder or inside a sub folder of your app.');
  }

  if(program.template && !fs.lstatSync(program.template).isFile()) {
    throw new Error(`The template file "${program.template}" doesn't exist or is not a valid template file`);
  }
}).then(function() {
  /**
   * Allow the user to decide whether or not they want to use the
   * meteor-build-client build or their own
  */

  if(program.usebuild && fs.lstatSync(program.usebuild).isDirectory()) {
    print(`Using ${program.usebuild}`);
    print('Generating the index.html...');

    return meteor.move(pathLib.resolve(program.usebuild));
  }
  print('Bundling Meteor app...');

  return meteor.build(program).then(function(){
    print('Generating the index.html...');
    return meteor.move(pathLib.resolve(argPath));
  });
}).then(function() {
  return meteor.addIndexFile(program);
}).then(function() {
  return meteor.cleanUp(program);
}).then(function() {
  print('Done!');
  print('-----');
  print(`You can find webapp files in "${pathLib.resolve(argPath)}".`);
}).catch(function(err) {
  if (err.stderr || err.stdout) {
    print('CAUGHT ERRORS:', err.stdout, err.stderr);
  } else {
    print('CAUGHT ERROR:', err);
  }

  process.exit(-1);
});
