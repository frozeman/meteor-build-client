// MODULES
const { print } = require('./helpers.js');
const fs = require('fs-extra');
const path = require('path');
const _ = require('underscore');
const Q = require('bluebird');
const spawn = require('buffered-spawn');

Q.promisifyAll(fs);

// VARIABLES
const argPath = process.argv[2];
const basePath = './';
const outputPath = path.resolve(argPath);
let buildPath = path.resolve(argPath);
// const bundleName = path.basename(path.resolve(basePath));

const RE = {
  scripts: {
    template: /{{ *> *scripts *}}/,
    tag: /<meteor-bundled-js *\/>/
  },
  styles: {
    template: /{{ *> *css *}}/,
    tag: /<meteor-bundled-css *\/>/,
    url: /{{ *url-to-meteor-bundled-css *}}/
  },
  templates: {
    head: /{{ *> *head *}}/,
    body: /{{ *> *body *}}/
  },
  fileName: {
    js: /^[a-z0-9]{40}\.js$/,
    css: /^[a-z0-9]{40}\.css$/
  },
  path: {
    app: /^app\//
  }
};

// execute shell scripts
const execute = (command) => {
  return new Q(function(resolve, reject) {
    const cmd = spawn(command[0], command.slice(1), {
      cwd: basePath
    }, function(err, stdout, stderr) {
      if (err){
        print('[execute] ERROR:', err.message);
        reject(err);
      } else {
        resolve({
          stdout: stdout,
          stderr: stderr,
        });
      }
    });
    cmd.stdout.pipe(process.stdout);
    cmd.stderr.pipe(process.stderr);
  });
};

const deleteFolderRecursive = (_path) => {
  let files = [];
  if(fs.existsSync(_path)) {
    files = fs.readdirSync(_path);
    files.forEach((file) => {
      const curPath = `${_path}/${file}`;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(_path);
  }
};

module.exports = {
  build(program){
    return Q.try(function() {
      deleteFolderRecursive(buildPath);

      var command = ['meteor', 'build', argPath, '--directory'];
      if (program.debug) {
        command.push('--debug');
      }

      if (program.verbose) {
        command.push('--verbose');
      }

      if (program.url) {
        command.push('--server');
        command.push(program.url);
      }

      if (program.debug) {
        print('[build()] DEBUG:', command.join(' '));
      }

      return execute(command, 'build the app, are you in your meteor apps folder?');
    });
  },
  move(_path){
    buildPath = _path;
    return Q.try(function() {
      try {
        const modernDirs = ['/bundle/programs/web.browser', '/bundle/programs/web.browser/app'];
        const legacyDirs = ['/bundle/programs/web.browser.legacy', '/bundle/programs/web.browser.legacy/app'];
        const dataPaths = fs.lstatSync(path.join(buildPath, legacyDirs[0])).isDirectory() ? legacyDirs : modernDirs;

        _.each(dataPaths, (givenPath) => {
          const clientPath = path.join(buildPath, givenPath);
          let rootFolder = fs.readdirSync(clientPath);
          rootFolder = _.without(rootFolder, 'app');
          rootFolder.forEach((file) => {
            fs.copySync(path.join(clientPath, file), path.join(outputPath, file));
          });
        });
      } catch(e) {
        print('[move()] Exception:', e);
        // do nothing
      }
    });
  },
  addIndexFile(program) {
    return Q.try(function() {
      const starJson = require(`${path.resolve(buildPath)}/bundle/star.json`);
      const settingsJson = program.settings ? require(path.resolve(program.settings)) : {};

      let content = fs.readFileSync(program.template || path.resolve(__dirname, 'index.html'), {encoding: 'utf-8'});
      let body = '';
      let head = '<meta charset="UTF-8">';

      try{
        head = fs.readFileSync(path.join(outputPath, 'head.html'), {encoding: 'utf8'});
      } catch(e) {
        print('FYI: No <head> found in Meteor app...');
      }

      try{
        body = fs.readFileSync(path.join(outputPath, 'body.html'), {encoding: 'utf8'});
      } catch(e) {
        print('FYI: No <body> found in Meteor app...');
      }

      // ADD HEAD
      content = content.replace(RE.templates.head, head);
      content = content.replace(RE.templates.body, body);

      // get the css and js files
      const files = {
        css: [],
        js: []
      };

      _.each(fs.readdirSync(outputPath), (file) => {
        if (RE.fileName.js.test(file)) {
          files.js.push(file);
        } else if (RE.fileName.css.test(file)) {
          files.css.push(file);
        }
      });

      let primaryCSSfile = files.css[0];

      // --debug case
      if (program.debug) {
        const json = fs.readFileSync(path.resolve(path.join(outputPath, 'program.json')), {encoding: 'utf-8'});
        const prog = JSON.parse(json);

        _.each(prog.manifest, (item) => {
          if (item.type === 'js' && item.url) {
            files.js.push(item.path.replace(RE.path.app, '') + '?hash=' + item.hash);
          } else if (item.type === 'css' && item.url) {
            // for css file cases, do not append hash.
            files.css.push(item.path.replace(RE.path.app, ''));

            if (item.url.includes('meteor_css_resource=true')) {
              primaryCSSfile = item.path.replace(RE.path.app, '');
            }
          }
        });

        print('[DEBUG] Files:', files, {primaryCSSfile});
      }

      // MAKE PATHS ABSOLUTE
      if(_.isString(program.path)) {
        // fix paths in the CSS file
        if(!_.isEmpty(files.css)) {
          _.each(files.css, (css, i) =>  {
            var cssFile = fs.readFileSync(path.join(outputPath, css), { encoding: 'utf8' });
            cssFile = cssFile.replace(/url\(\'\//g, `url('${program.path}`).replace(/url\(\//g, `url(${program.path}`);
            fs.unlinkSync(path.join(outputPath, css));
            fs.writeFileSync(path.join(outputPath, css), cssFile, { encoding: 'utf8' });

            files.css[i] = `${program.path}${css}`;
          });
        }

        if(!_.isEmpty(files.js)) {
          _.each(files.js, (jsFile, i) =>  {
            files.js[i] = `${program.path}${jsFile}`;
          });
        }

        if (primaryCSSfile) {
          primaryCSSfile = `${program.path}${primaryCSSfile}`;
        }
      } else {
        if(!_.isEmpty(files.css)) {
          _.each(files.css, (cssFile, i) =>  {
            files.css[i] = `/${cssFile}`;
          });
        }

        if(!_.isEmpty(files.js)) {
          _.each(files.js, (jsFile, i) =>  {
            files.js[i] = `/${jsFile}`;
          });
        }

        if (primaryCSSfile) {
          primaryCSSfile = `/${primaryCSSfile}`;
        }
      }

      // ADD CSS
      var css = [];
      _.each(files.css, (cssFile) => {
        css.push(`<link rel="stylesheet" type="text/css" href="${cssFile}">`);
      });
      css = css.join('');

      if (RE.styles.template.test(content)) {
        content = content.replace(RE.styles.template, css);
      } else if (RE.styles.tag.test(content)) {
        content = content.replace(RE.styles.tag, css);
      }

      if (RE.styles.url.test(content) && primaryCSSfile) {
        content = content.replace(RE.styles.url, primaryCSSfile);
      }

      // ADD the SCRIPT files
      var scripts = ['__meteor_runtime_config__'];
      _.each(files.js, (jsFile) => {
        scripts.push(`<script type="text/javascript" src="${jsFile}"></script>`);
      });
      scripts = scripts.join('');

      // add the meteor runtime config
      const settings = {
        'meteorRelease': starJson.meteorRelease,
        'ROOT_URL_PATH_PREFIX': process.env.ROOT_URL_PATH_PREFIX || '',
        meteorEnv: {
          NODE_ENV: 'production'
        },
        autoupdate: { versions: {}},
        // 'DDP_DEFAULT_CONNECTION_URL': program.url || '', // will reload infinite if Meteor.disconnect is not called
        // 'appId': process.env.APP_ID || null,
        // 'autoupdateVersion': null, // "ecf7fcc2e3d4696ea099fdd287dfa56068a692ec"
        // 'autoupdateVersionRefreshable': null, // "c5600e68d4f2f5b920340f777e3bfc4297127d6e"
        // 'autoupdateVersionCordova': null
      };

      // on url = "default", we dont set the ROOT_URL, so Meteor chooses the app serving url for its DDP connection
      if (program.url !== 'default') {
        settings.ROOT_URL = program.url || '';
      }

      if (settingsJson.public) {
        settings.PUBLIC_SETTINGS = settingsJson.public;
      }

      scripts = scripts.replace('__meteor_runtime_config__', `<script type="text/javascript">__meteor_runtime_config__ = JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(settings))}"));</script>`);

      // add Meteor.disconnect() when no server is given
      if (!program.url) {
        scripts += '<script type="text/javascript">Meteor && Meteor.disconnect ? Meteor.disconnect() : void 0;</script>';
      }

      if (RE.scripts.template.test(content)) {
        content = content.replace(RE.scripts.template, scripts);
      } else if (RE.scripts.tag.test(content)) {
        content = content.replace(RE.scripts.tag, scripts);
      }

      // write the index.html
      return fs.writeFileAsync(path.join(outputPath, 'index.html'), content).then(() => {
        if (!program.url) {
          return fs.mkdirAsync(path.join(outputPath, 'sockjs'))
            .then(() => fs.writeFileAsync(path.join(outputPath, 'sockjs/info'), '{"websocket": false}', { encoding: 'utf8' })).catch(() => {
              print('sockjs/info not created or already exists');
              return true;
            });
        }
        return true;
      });
    });
  },
  cleanUp(program) {
    return Q.try(function() {
      // remove files
      if (!program.usebuild) {
        deleteFolderRecursive(path.join(buildPath, 'bundle'));
      }

      try {
        fs.unlinkSync(path.join(outputPath, 'program.json'));
      } catch (e){
        print('FYI: Didn\'t unlink program.json; doesn\'t exist.');
      }

      try{
        fs.unlinkSync(path.join(outputPath, 'head.html'));
      } catch (e){
        print('FYI: Didn\'t unlink head.html; doesn\'t exist.');
      }

      try{
        fs.unlinkSync(path.join(outputPath, 'body.html'));
      } catch (e){
        print('FYI: Didn\'t unlink body.html; doesn\'t exist.');
      }
    });
  }
};
