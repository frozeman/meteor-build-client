// MODULES
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var spinner = require('simple-spinner');

// VARIABLES
var argPath = process.argv[2],
    basePath = './',
    buildPath = basePath + argPath,
    bundleName = path.basename(path.resolve(basePath));

// HELPERS
var _ = {
    endsWith: function(str, arr) {
        for (var i = arr.length - 1; i >= 0; i--) {
            if (str.indexOf(arr[i], str.length - arr[i].length) !== -1) {
                return true;
            }
        }

        return false;
    }
};

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

var deleteBuildFiles = function(buildPath) {
    var files = [];
    if (fs.existsSync(buildPath)) {
        files = fs.readdirSync(buildPath);
        files.forEach(function (file, index) {
            var curPath = buildPath + "/" + file;
            if (_.endsWith(file, ['.css', '.html', '.map', '.js'])) {
                console.log('deleting ' + path.resolve(curPath));
                fs.unlinkSync(curPath);
            }
        });
    }
}


module.exports = {
    build: function(program, remove, callback){
        if (typeof remove === 'undefined') remove = true;

        if (remove) {
            // remove the bundle folder
            deleteFolderRecursive(buildPath);
        } else {
            // remove previous build files only
            deleteBuildFiles(buildPath);
        }

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
            'ROOT_URL': program.url || '',
            'ROOT_URL_PATH_PREFIX': '',
            // 'DDP_DEFAULT_CONNECTION_URL': program.url || '', // will reload infinite if Meteor.disconnect is not called
            // 'appId': process.env.APP_ID || null,
            // 'autoupdateVersion': null, // "ecf7fcc2e3d4696ea099fdd287dfa56068a692ec"
            // 'autoupdateVersionRefreshable': null, // "c5600e68d4f2f5b920340f777e3bfc4297127d6e"
            // 'autoupdateVersionCordova': null
        };
        if(settingsJson.public)
            settings.PUBLIC_SETTINGS = settingsJson.public;

        scripts = scripts.replace('__meteor_runtime_config__', '<script type="text/javascript">__meteor_runtime_config__ = JSON.parse(decodeURIComponent("'+encodeURIComponent(JSON.stringify(settings))+'"));</script>');

        // add Meteor.disconnect() when no server is given
        // if(!program.ddp)
            scripts += '        <script type="text/javascript">Meteor.disconnect();</script>';

        content = content.replace(/{{ *> *scripts *}}/, scripts);

        // write the index.html
        fs.writeFile(path.join(buildPath, 'index.html'), content, callback);
    },
    cleanUp: function(callback) {

        // remove files
        deleteFolderRecursive(path.join(buildPath, 'bundle'));
        fs.unlinkSync(path.join(buildPath, 'program.json'));
        fs.unlinkSync(path.join(buildPath, 'head.html'));

        callback();
    }
}
