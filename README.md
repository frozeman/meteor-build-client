# Meteor Build Client

Builder and bundler for the client part of a Meteor application. As a result it would generate simple `index.html`, so it can be hosted on any server or even loaded via the `file://` protocol.

## ToC:

- [Installation](https://github.com/frozeman/meteor-build-client#installation)
- [Important notes](https://github.com/frozeman/meteor-build-client#important-notes)
- [Bundler output](https://github.com/frozeman/meteor-build-client#output)
- [Usage and examples](https://github.com/frozeman/meteor-build-client#usage)
  - [Pass `settings.json`](https://github.com/frozeman/meteor-build-client#passing-a-settingsjson)
  - [Pass `ROOT_URL`](https://github.com/frozeman/meteor-build-client#app-url)
  - [Use absolute or relative URLs](https://github.com/frozeman/meteor-build-client#absolute-or-relative-paths)
  - [Use pre-build bundle](https://github.com/frozeman/meteor-build-client#using-your-own-build-folder)
- [Tips'n tricks](https://github.com/frozeman/meteor-build-client#best-practices)
  - [Recommended `.meteor/packages`](https://github.com/frozeman/meteor-build-client#recommended-packages-for-client-only-build)
  - [Templating](https://github.com/frozeman/meteor-build-client#template)
  - [Connect to server](https://github.com/frozeman/meteor-build-client#connecting-to-a-meteor-server)
- [HTTP Server/Proxy usage](https://github.com/frozeman/meteor-build-client#making-routing-work-on-a-non-meteor-server)
  - [Apache](https://github.com/frozeman/meteor-build-client#apache)
  - [Nginx](https://github.com/frozeman/meteor-build-client#nginx)
- Get help:
  - [GitHub issues](https://github.com/frozeman/meteor-build-client/issues)
  - [Gitter Chat](https://gitter.im/frozeman/meteor-build-client)

## Installation

```shell
npm install -g meteor-build-client
```

## Important notes:

- __The Meteor/Atmosphere package `frozeman:build-client` is just a placeholder package, there's no need to install it__;
- __Warning__: the content of the output folder will be deleted before building the new output! So don't do things like `meteor-build-client /home`!
- __Do not use dynamic imports!__ e.g. `import('/eager/file');`;
- By default this package link __legacy__ ES5 bundle build; For ES6/Modern scripts build an app with `meteor build <path> --exclude-archs web.browser.legacy --directory` flag and pass it to `--usebuild <path>`, [see docs](https://github.com/frozeman/meteor-build-client#using-your-own-build-folder)

## Output

The content of the output folder could look as follows:

- `index.html`
- `a28817fe16898311635fa73b959979157e830a31.css`
- `aeca2a21c383327235a08d55994243a9f478ed57.js`
- `...` (other files from project's `/public` directory)

## Usage

Things you need to know before exporting your project

### Define where stylesheet links & script links will land
`meteor-build-client` looks for the `<meteor-bundled-css />` tag in your `<head>` section and the `<meteor-bundled-js />` tag in the `<body>` section.

Example:
```html
<head>
  <!-- your header stuff... -->
  <!-- then typically add the css link at the bottom of the head -->
  <meteor-bundled-css />
</head>

<body>
  <!-- typically want to load all the js code at the top -->
  <meteor-bundled-js />
  <!-- The rest of your body stuff... -->
</body>
```

**Note**: this does not work for blaze projects. For blaze projects you can only set `<meteor-bundled-css />` in your header.  It is invalid to set `<meteor-bundled-js />` in your body, simply leave it out and the right thing will happen.

### Command line usage
List all available options and show docs:

```shell
meteor-build-client --help
```

Usage examples:

```shell
# cd to meteor app
cd /my/app

# run meteor-build-client
meteor-build-client ../output/directory

# build meteor app as usual
meteor build ../build-directory --directory
# bundle client-only assets with meteor-build-client
meteor-build-client ../build-directory-client --url https://example.com --usebuild ../build-directory
```

### Passing a settings.json

Pass Meteor's `settings.json` settings file via `--settings` or `-s` option:

```shell
meteor-build-client ../output/directory -s ../settings.json
```

__Note:__ Only the `public` property of that JSON file will be add to the `Meteor.settings` property.

### App URL

Set the `ROOT_URL` of the application via `--url` or `-u` option:

```shell
meteor-build-client ../output/directory -u https://myserver.com
```

By passing `"default"`, application will try to connect to the server from where the application was served. If this option was not set, it will set the server to `""` (empty string) and will add a `Meteor.disconnect()` after Meteor was loaded.

### Absolute or relative paths

To serve application via `file://` protocol (by opening the `index.html`) set `--path` or `-p` option to `""` (*empty string*). This would generate relative paths for assets across the application:

```shell
meteor-build-client ../output/directory -p ""
```

The default path value is `"/"`.

__Note:__ "path" value will replace paths in generated CSS file. Use it to link fonts and other assets correctly.

### Using your own build folder

To use pre-build Meteor application, built using `meteor build` command manually, specify the `--usebuild <path-to-build>` flag and `meteor-build-client` will not run the `meteor build` command.

## Best practices

Tips'n tricks using client bundle

### Recommended packages for client-only build

When building server-less standalone web application we recommend to replace `meteor-base` with `meteor` and `webapp` packages.

```diff
@@ .meteor/packages
- meteor-base
+ meteor
+ webapp
```

## Connecting to a Meteor server

In order to connect to a Meteor servers, create DDP connection by using `DDP.connect()`, as seen in the following example:

```js
// This Should be in both server and client in a lib folder
DDPConnection = (Meteor.isClient) ? DDP.connect('http://localhost:3000/') : {};

// When creating a new collection on the client use:
if(Meteor.isClient) {
  posts = new Mongo.Collection('posts', DDPConnection);

  // set the new DDP connection to all internal packages, which require one
  Meteor.connection = DDPConnection;
  Accounts.connection = Meteor.connection;
  Meteor.users = new Mongo.Collection('users');
  Meteor.connection.subscribe('users');

  // Subscribe like this:
  DDPConnection.subscribe('mySubscription');
}
```

## Making routing work on a non Meteor server

To enforce JavaScript routing, all requests should point to `index.html`. See below "rewrite" instructions for various http/proxy servers.

### Apache

Create `.htaccess` for Apache with `mod_rewrite` rules:

```apacheconf
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Always pass through requests for files that exist
  # Per http://stackoverflow.com/a/7090026/223225
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule . - [L]

  # Send all other requests to index.html where the JavaScript router can take over
  # and render the requested route
  RewriteRule ^.*$ index.html [L]
</IfModule>
```

### Nginx

Use `try_files` and `error_page` to redirect all requests to non-existent files to `index.html`. Static files will be served by nginx itself.

```nginxconf
server {
  listen 80;
  listen [::]:80;
  server_name myapp.com;

  index index.html;
  root /var/www/myapp;

  error_page 404 =200 /index.html;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```
