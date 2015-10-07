// MODULES
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var spinner = require('simple-spinner');

// VARIABLES
var argPath = process.argv[2],
    basePath = './',
    buildPath = path.resolve(argPath),
    bundleName = path.basename(path.resolve(basePath));

// execute shell scripts
var execute = function(command, name, complete) {
    var exec = require('child_process').exec;

    var completeFunc = (typeof complete === 'function') ? complete : console.log;

    spinner.start();
    exec(command, {
        cwd: basePath
    },function(err, res) {
        spinner.stop();

        //process error
        if(err){
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
    build: function(program, callback){
        // remove the bundle folder
        deleteFolderRecursive(buildPath);

        var command = 'meteor build '+ argPath + ' --directory';

        if(program.url)
             command += ' --server '+ program.url;

         // if(program.settings)
         //     command += ' --mobile-settings '+ program.settings;

         // console.log('Running: '+ command);

        execute(command, 'build the app, are you in your meteor apps folder?', callback);
    },
    move: function(callback){

        try {
            _.each([
                '/bundle/programs/web.browser',
                '/bundle/programs/web.browser/app'
            ], function(givenPath){
                var clientPath = path.join(buildPath, givenPath);
                var rootFolder = fs.readdirSync(clientPath);
                rootFolder = _.without(rootFolder, 'app');

                rootFolder.forEach( function (file) {
                    var curSource = path.join(clientPath, file);

                    fs.renameSync(path.join(clientPath, file), path.join(buildPath, file));
                });
            });
        } catch(e) {

        }

        callback();
    },
    addIndexFile: function(program, callback){
        var starJson = require(path.resolve(buildPath) + '/bundle/star.json');
        var settingsJson = program.settings ? require(path.resolve(program.settings)) : {};

        var content = fs.readFileSync(program.template || path.resolve(__dirname, 'index.html'), {encoding: 'utf-8'});
        var head;
        try{
            head = fs.readFileSync(path.join(buildPath, 'head.html'), {encoding: 'utf8'});
        } catch(e) {
            head = '';
            console.log('No <head> found in Meteor app...');
        }
        // ADD HEAD
        content = content.replace(/{{ *> *head *}}/,head);

        // get the css and js files
        var files = {};
        _.each(fs.readdirSync(buildPath), function(file){
            if(/^[a-z0-9]{40}\.css$/.test(file))
                files['css'] = file;
            if(/^[a-z0-9]{40}\.js$/.test(file))
                files['js'] = file;
        });

        // MAKE PATHS ABSOLUTE
        if(_.isString(program.path)) {

            // fix paths in the CSS file
            var cssFile = fs.readFileSync(path.join(buildPath, files['css']), {encoding: 'utf8'});
            cssFile = cssFile.replace(/url\(\'\//g, 'url(\''+ program.path).replace(/url\(\//g, 'url('+ program.path);
            fs.unlinkSync(path.join(buildPath, files['css']));
            fs.writeFileSync(path.join(buildPath, files['css']), cssFile, {encoding: 'utf8'});

            files['css'] = program.path + files['css'];
            files['js'] = program.path + files['js'];
        } else {
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
            // 'DDP_DEFAULT_CONNECTION_URL': program.url || '', // will reload infinite if Meteor.disconnect is not called
            // 'appId': process.env.APP_ID || null,
            // 'autoupdateVersion': null, // "ecf7fcc2e3d4696ea099fdd287dfa56068a692ec"
            // 'autoupdateVersionRefreshable': null, // "c5600e68d4f2f5b920340f777e3bfc4297127d6e"
            // 'autoupdateVersionCordova': null
        };
        // on url = "default", we dont set the ROOT_URL, so Meteor chooses the app serving url for its DDP connection
        if(program.url !== 'default')
            settings.ROOT_URL = program.url || '';


        if(settingsJson.public)
            settings.PUBLIC_SETTINGS = settingsJson.public;

        scripts = scripts.replace('__meteor_runtime_config__', '<script type="text/javascript">__meteor_runtime_config__ = JSON.parse(decodeURIComponent("'+encodeURIComponent(JSON.stringify(settings))+'"));</script>');
        
        // add Meteor.disconnect() when no server is given
        if(!program.url)
            scripts += '        <script type="text/javascript">Meteor.disconnect();</script>';

        content = content.replace(/{{ *> *scripts *}}/, scripts);

        // write the index.html
        fs.writeFile(path.join(buildPath, 'index.html'), content, callback);
    },
    cleanUp: function(callback) {

        // remove files
        deleteFolderRecursive(path.join(buildPath, 'bundle'));
        fs.unlinkSync(path.join(buildPath, 'program.json'));
        try{
            fs.unlinkSync(path.join(buildPath, 'head.html'));
        } catch (e){
            console.log("Didn't unlink head.html; doesn't exist.");
        }
        callback();
    }
}