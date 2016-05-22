// MODULES
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var spinner = require('simple-spinner');
var exec = require('child_process').exec;


// execute shell scripts
var execute = function(config, command, name, complete) {
    var completeFunc = (typeof complete === 'function') ? complete : function(){};

    if (config.feedback)
        spinner.start();

    exec(command, {
        cwd: config.input
    },function(err, res) {
        if (config.feedback)
            spinner.stop();

        //process error
        if(err){
            if (config.feedback)
                console.log(err.message);
            completeFunc(err);

        } else {
            completeFunc();
        }
    });
};

var deleteFolderRecursive = function(path) {
    var files = [];
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};



module.exports = {
    build: function(config, callback){
        // remove the bundle folder
        deleteFolderRecursive(config.output);

        var command = 'meteor build '+ config.output + ' --directory';

        if(config.url)
             command += ' --server '+ config.url;

         // if(config.settings)
         //     command += ' --mobile-settings '+ config.settings;

         // console.log('Running: '+ command);

        execute(config, command, 'build the app, are you in your meteor apps folder?', callback);
    },
    move: function(config, callback){
        try {
            _.each([
                '/bundle/programs/web.browser',
                '/bundle/programs/web.browser/app'
            ], function(givenPath){
                var clientPath = path.join(config.output, givenPath);
                if (!fs.existsSync(clientPath)) return;
                var rootFolder = fs.readdirSync(clientPath);
                rootFolder = _.without(rootFolder, 'app');

                rootFolder.forEach( function (file) {
                    var curSource = path.join(clientPath, file);

                    fs.renameSync(path.join(clientPath, file), path.join(config.output, file));
                });
            });
        } catch(e) {

        }

        callback();
    },
    addIndexFile: function(config, callback){
        var starJson = require(path.resolve(config.output) + '/bundle/star.json');
        var settingsJson;
        if (!config.settings) {
            settingsJson = {};
        } else if (_.isString(config.settings)) {
            settingsJson = require(path.resolve(config.settings));
        } else {
            settingsJson = _.clone(config.settings);
        }

        var content = fs.readFileSync(config.template || path.resolve(__dirname, 'index.html'), {encoding: 'utf-8'});
        var head;
        try{
            head = fs.readFileSync(path.join(config.output, 'head.html'), {encoding: 'utf-8'});
        } catch(e) {
            head = '';
            if (config.feedback)
                console.log('No <head> found in Meteor app...');
        }
        // ADD HEAD
        content = content.replace(/{{ *> *head *}}/,head);

        // get the css and js files
        var files = {};
        _.each(fs.readdirSync(config.output), function(file){
            if(/^[a-z0-9]{40}\.css$/.test(file))
                files['css'] = file;
            if(/^[a-z0-9]{40}\.js$/.test(file))
                files['js'] = file;
        });

        // MAKE PATHS ABSOLUTE
        if(_.isString(config.path)) {

            // fix paths in the CSS file
            if(!_.isEmpty(files['css'])) {

                var cssFile = fs.readFileSync(path.join(config.output, files['css']), {encoding: 'utf-8'});
                cssFile = cssFile.replace(/url\(\'\//g, 'url(\''+ config.path).replace(/url\(\//g, 'url('+ config.path);
                fs.unlinkSync(path.join(config.output, files['css']));
                fs.writeFileSync(path.join(config.output, files['css']), cssFile, {encoding: 'utf-8'});

                files['css'] = config.path + files['css'];
            }
            files['js'] = config.path + files['js'];
        } else {
            if(!_.isEmpty(files['css']))
                files['css'] = '/'+ files['css'];
            files['js'] = '/'+ files['js'];
        }


        // ADD CSS
        var css = '<link rel="stylesheet" type="text/css" class="__meteor-css__" href="'+ files['css'] +'?meteor_css_resource=true">';
        content = content.replace(/{{ *> *css *}}/, css);

        // ADD the SCRIPT files
        var scripts = '__meteor_runtime_config__'+ "\n"+
        '        <script type="text/javascript" src="'+ files['js'] +'"></script>'+ "\n";

        // add the meteor runtime config
        settings = {
            'meteorRelease': starJson.meteorRelease,
            'ROOT_URL_PATH_PREFIX': '',
            meteorEnv: { NODE_ENV: 'production' },
            // 'DDP_DEFAULT_CONNECTION_URL': config.url || '', // will reload infinite if Meteor.disconnect is not called
            // 'appId': process.env.APP_ID || null,
            // 'autoupdateVersion': null, // "ecf7fcc2e3d4696ea099fdd287dfa56068a692ec"
            // 'autoupdateVersionRefreshable': null, // "c5600e68d4f2f5b920340f777e3bfc4297127d6e"
            // 'autoupdateVersionCordova': null
        };
        // on url = "default", we dont set the ROOT_URL, so Meteor chooses the app serving url for its DDP connection
        if(config.url !== 'default')
            settings.ROOT_URL = config.url || '';


        if(settingsJson.public)
            settings.PUBLIC_SETTINGS = settingsJson.public;

        scripts = scripts.replace('__meteor_runtime_config__', '<script type="text/javascript">__meteor_runtime_config__ = JSON.parse(decodeURIComponent("'+encodeURIComponent(JSON.stringify(settings))+'"));</script>');

        // add Meteor.disconnect() when no server is given
        if(!config.url)
            scripts += '        <script type="text/javascript">Meteor.disconnect();</script>';

        content = content.replace(/{{ *> *scripts *}}/, scripts);

        // write the index.html
        fs.writeFile(path.join(config.output, 'index.html'), content, callback);
    },
    cleanUp: function(config, callback) {
        // remove files
        deleteFolderRecursive(path.join(config.output, 'bundle'));
        fs.unlinkSync(path.join(config.output, 'program.json'));
        try{
            fs.unlinkSync(path.join(config.output, 'head.html'));
        } catch (e){
            if (config.feedback)
                console.log("Didn't unlink head.html; doesn't exist.");
        }
        callback();
    },
}
