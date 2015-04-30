// MODULES
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var spinner = require('simple-spinner');

// VARIABLES
var argPath = process.argv[2],
    basePath = './app/',
    buildPath = basePath + argPath;

// execute shell scripts
var execute = function(command, name, complete) {
    var exec = require('child_process').exec;

    var completeFunc = (typeof complete === 'function') ? complete : console.log;

    spinner.start();
    exec(command, {
        cwd: basePath
    },function(err) {
        spinner.stop();

        //process error
        if(err){
          completeFunc('Could not ' + name);

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
    build: function(callback){
        console.log('Building your app...');

        // remove the bundle folder
        deleteFolderRecursive(buildPath);

        execute('meteor build '+ argPath, 'build the app, are you in your meteor apps folder?', callback);
    },
    unpack: function(callback){
        var targz = require('tar.gz');

        console.log('Extracting the bundle...');

        spinner.start();
        new targz().extract(buildPath +'/app.tar.gz', buildPath, function(err){
            spinner.stop();

            if(err)
                console.log(err);

            callback();
        });
    },
    move: function(callback){
        console.log('Moving files into place...');

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

        callback();
    },
    addIndexFile: function(program, callback){
        var starJson = require(buildPath + '/bundle/star.json');

        console.log('Creating the index.html...');

        var content = fs.readFileSync(program.template || path.dirname(process.argv[1]) + '/index.html', {encoding: 'utf-8'});
        var head = fs.readFileSync(path.join(buildPath, 'head.html'), {encoding: 'utf8'});

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


        // ADD CSS
        var css = '<link rel="stylesheet" type="text/css" class="__meteor-css__" href="'+ files['css'] +'?meteor_css_resource=true">';
        content = content.replace(/{{ *> *css *}}/, css);

        // ADD the SCRIPT files
        var scripts = '__meteor_runtime_config__'+ "\n"+
        '        <script type="text/javascript" src="'+ files['js'] +'"></script>'+ "\n";

        // add the meteor runtime config
        settings = {
            'meteorRelease': starJson.meteorRelease,
            'ROOT_URL': program.server || '',
            'ROOT_URL_PATH_PREFIX': '',
            'DDP_DEFAULT_CONNECTION_URL': program.ddp || '',
            'appId': process.env.APP_ID || null,
            'autoupdateVersion': null, // "ecf7fcc2e3d4696ea099fdd287dfa56068a692ec"
            'autoupdateVersionRefreshable': null, // "c5600e68d4f2f5b920340f777e3bfc4297127d6e"
            'autoupdateVersionCordova': null
        };
        scripts = scripts.replace('__meteor_runtime_config__', '<script type="text/javascript">__meteor_runtime_config__ = JSON.parse(decodeURIComponent("'+encodeURIComponent(JSON.stringify(settings))+'"));</script>');
        
        // add Meteor.disconnect() when no server is given
        if(!program.ddp)
            scripts += '        <script type="text/javascript">Meteor.disconnect();</script>';

        content = content.replace(/{{ *> *scripts *}}/, scripts);

        // write the index.html
        fs.writeFile(path.join(buildPath, 'index.html'), content, callback);
    },
    cleanUp: function(callback) {

        // remove files
        deleteFolderRecursive(path.join(buildPath, 'bundle'));
        fs.unlinkSync(path.join(buildPath, 'program.json'));
        fs.unlinkSync(path.join(buildPath, 'app.tar.gz'));
        fs.unlinkSync(path.join(buildPath, 'head.html'));

        console.log('Done!');
        console.log('Go to "'+ path.resolve(buildPath) +'" and check your files :)');

        callback();
    }
}