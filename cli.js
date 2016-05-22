#!/usr/bin/env node

var fs = require('fs');
var meteorBuildClient = require('./index.js');
var packageJson = require('./package.json');

// CLI Options
var program = require('commander');

// VARIABLES
var argPath = process.argv[2];


program
    .version(packageJson.version)
    .usage('<output path> [options]')
    .option('-i, --input <path>', 'The path to the meteor project.')
    .option('-p, --path <path>', 'The path used to link the files, default is "/", pass "" to link relative to the index.html.')
    .option('-t, --template <file path>', 'Provide a custom index.html template. Use {{> head}}, {{> css}} and {{> scripts}} to place the meteor resources.')
    .option('-s, --settings <settings.json>', 'Set optional data for Meteor.settings in your application.')
    .option('-u, --url <url>', 'The Root URL of your app. If "default", Meteor will try to connect to the Server where it was served from. Default is: "" (empty string)')
    // .option('-d, --ddp <url>', 'The URL of your Meteor DDP server, e.g. "ddp+sockjs://ddp.myapp.com/sockjs". If you don\'t add any it will also add call "Meteor.disconnect();" to prevent the app from conneting.')
    .parse(process.argv);


// RUN TASKS

if(!argPath) {
    console.error('You need to provide a path for the build output, for example:');
    console.error('$ meteor-build-client myBuildFolder');

} else {

    // start building the meteor client
    meteorBuildClient({
        input: program.input,
        output: argPath,
        template: program.template,
        settings: program.settings,
        url: program.url,
        path: program.path,
        feedback: true,
    }, function(err) {
        if (err) {
            console.error(err);
        }
    });
}





