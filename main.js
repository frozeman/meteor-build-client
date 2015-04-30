#!/usr/bin/env node

var fs = require('fs');

// CLI Options
var program = require('commander');
// Queue
var Queue = require('./queue');
// Build queue syncron
var queue = new Queue();

var packageJson = require('./package.json');

// VARIABLES
var path = process.argv[2];
var meteor = require('./meteor.js');

program
    .version(packageJson.version)
    .option('-t, --template <name>', 'Provide an custom index.html template use {{> head}}, {{> css}} and {{> scripts}} to place the meteor resources.')
    .option('-s, --server <url>', 'The Root URL of your app.')
    // .option('-d, --ddp <url>', 'The URL of your Meteor DDP server, e.g. "ddp+sockjs://ddp.myapp.com/sockjs". If you don\'t add any it will also add call "Meteor.disconnect();" to prevent the app from conneting.')
    .parse(process.argv);


// RUN TASKS
// console.log(process.cwd());
// process.chdir('new cwd')

if(!path) {
    console.error('You need to provide a path for the build output, for example:');
    console.error('$ meteor-client-only myBuildFolder');

} else {

    (function(){

        if(program.template) {
            try {
                if(!fs.lstatSync(program.template).isFile())
                    throw new Error();
                
            } catch(e) {
                console.error('The template file "'+ program.template +'" doesn\'t exist or is not a valid template file');
                return;  
            }
        }

        // build meteor
        queue.add(meteor.build);

        // unpack the bundle
        queue.add(meteor.unpack);

        // move the files into the build folder
        queue.add(meteor.move);

        // create the index.html
        queue.add(function(callback){
            meteor.addIndexFile(program, callback);
        });

        // delete unecessary fiels
        queue.add(meteor.cleanUp);

        queue.run();
    })()
}





