#!/usr/bin/env node

var fs = require('fs');

// CLI Options
var program = require('commander');

var Q = require('bluebird');

var packageJson = require('./package.json');

// VARIABLES
var argPath = process.argv[2];
var meteor = require('./meteor.js');

program
    .version(packageJson.version)
    .usage('<output path> [options]')
    .option('-p, --path <path>', 'The path used to link the files, default is "/", pass "" to link relative to the index.html.')
    .option('-t, --template <file path>', 'Provide a custom index.html template. Use {{> head}}, {{> css}} and {{> scripts}} to place the meteor resources.')
    .option('-s, --settings <settings.json>', 'Set optional data for Meteor.settings in your application.')
    .option('-u, --url <url>', 'The Root URL of your app. If "default", Meteor will try to connect to the Server where it was served from. Default is: "" (empty string)')
    .option('-b, --usebuild', 'If this flag is present, meteor-build-client will skip the `meteor build` step and opt for using your manually built ../build folder.')
    .option('-D, --debug', 'Build in debug mode (don\'t minify, etc)')
    .option('-v, --verbose', 'Add optional verbose option.')
    .option('-hide, --hideSpinner', 'Hide spinner on command while executing within the option. Default is: true');
    // .option('-d, --ddp <url>', 'The URL of your Meteor DDP server, e.g. "ddp+sockjs://ddp.myapp.com/sockjs". If you don\'t add any it will also add call "Meteor.disconnect();" to prevent the app from conneting.');

program.on('--help', function(){
    console.log('  Warning:');
    console.log('');
    console.log('  The content of the output folder will be deleted before building the new output!');
    console.log('  Don\'t do something like: meteor-build-client /home !');
    console.log('');
});

program.parse(process.argv);


Q.try(function() {
    if (!argPath) {
        throw new Error("You need to provide a path for the build output, for example:\n\n$ meteor-build-client myBuildFolder");
    }  
      
    if (!fs.lstatSync('./.meteor').isDirectory()) {
        throw new Error('You\'re not in a Meteor app folder or inside a sub folder of your app.');
    }
    
    if(program.template && !fs.lstatSync(program.template).isFile()) {
        throw new Error('The template file "'+ program.template +'" doesn\'t exist or is not a valid template file');
    }
})
.then(function() {
  /** 
   * Allow the user to decide whether or not they want to use the 
   * meteor-build-client build or their own
  */

  console.log(program.usebuild,program);
  if(program.usebuild && fs.lstatSync('../build').isDirectory()){
    console.log('Using ../build');
    console.log('Generating the index.html...');
    
    return meteor.move();
  }else{
    console.log('Bundling Meteor app...'); 
    
    return meteor.build(program)
      .then(function(){
        console.log('Generating the index.html...');
        
        return meteor.move();
      });
  }
})
.then(function() {
    return meteor.addIndexFile(program);
})
.then(function() {
    return meteor.cleanUp();
})
.then(function() {
    console.log('Done!');
    console.log('-----');
    console.log('You can find your files in "'+ require('path').resolve(argPath) +'".');    
})
.catch(function(err) {
    if (err.stderr || err.stdout) {
        console.error(err.stdout, err.stderr);
    } else {
        console.error(err);
    }
  
    process.exit(-1);
});
