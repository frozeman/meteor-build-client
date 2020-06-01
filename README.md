[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/frozeman/meteor-build-client?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

*Note: The meteor package `frozeman:build-client` is only a placeholder package, don't install.*

# Meteor Build Client

This tool builds and bundles the client part of a Meteor app with a simple `index.html`, so it can be hosted on any server or even loaded via the `file://` protocol.

## Installation

```shell
npm install -g meteor-build-client
```

## Usage

```shell
// cd into your meteor app
cd myApp

// run meteor-build-client
meteor-build-client ../myOutputFolder
```

## Important notes:

- __Warning__: the content of the output folder will be deleted before building the new output! So don't do things like `meteor-build-client /home`!
- __Do not use dynamic imports!__ e.g. `import('/eager/file');`;
- By default this package link __legacy__ ES5 bundle build.

### Output

The content of the output folder could look as follows:

- `index.html`
- `a28817fe16898311635fa73b959979157e830a31.css`
- `aeca2a21c383327235a08d55994243a9f478ed57.js`
- `...` (other files from your "public" folder)

For a list of options see:

```shell
meteor-build-client --help
```

### Passing a settings.json

You can pass an additional settings file using the `--settings` or `-s` option:

```shell
meteor-build-client ../myOutputFolder -s ../settings.json
```

**Note** Only the `public` property of that JSON file will be add to the `Meteor.settings` property.

### App URL

Additionally you can set the `ROOT_URL` of your app using the `--url` or `-u` option:

```shell
meteor-build-client ../myOutputFolder -u http://myserver.com
```

If you pass `"default"`, your app will try to connect to the server where the application was served from. If this option was not set, it will set the server to `""` (empty string) and will add a `Meteor.disconnect()` after Meteor was loaded.

### Absolute or relative paths

If you want to be able to start you app by simply opening the index.html (using the `file://` protocol), you need to link your files relative. You can do this by setting the `--path` or `-p` option:

```shell
meteor-build-client ../myOutputFolder -p ""
```

The default path value is `"/"`.

*Note* When set a path value, it will also replace this path in you Meteor CSS file, so that fonts etc link correctly.

### Using your own build folder

To use pre-build Meteor application, built using `meteor build` command manually, specify the `--usebuild <path-to-build>` flag and `meteor-build-client` will not run the `meteor build` command.

### Recommended packages for client-only build

If you're building server-less standalone web application we recommend to replace `meteor-base` with `meteor` and `webapp` packages.

```diff
@@ .meteor/packages
- meteor-base
+ meteor
+ webapp
```

### Template

Following Meteor's recommended usage of `<meteor-bundled-css />` and `<meteor-bundled-js/>` this tags will be replaced with links to generated CSS and JS files respectively. Optionally, use `{{url-to-meteor-bundled-css}}` as a placeholder for URL to generated CSS file. We encourage to use `static-html` (*for non-Blaze projects*) or `blaze-html-templates` (*for Blaze projects*) package for creating bare HTML template in your app, minimal example:

```html
<!-- client/head.html -->
<head>
  <meta charset="UTF-8">
  <meta name="fragment" content="!">

  <title>My Meteor App</title>
  <link rel="preload" href="{{url-to-meteor-bundled-css}}" as="style">
  <meteor-bundled-css />
</head>
```

Where `<meteor-bundled-css />` will be replaced with `<link />` element to generated CSS file(s) and `{{url-to-meteor-bundled-css}}` will be replaced with URL to generated CSS file.

```html
<!-- client/body.html -->
<body>
  <meteor-bundled-js />
</body>
```

Where `<meteor-bundled-js />` will be replaced with `<script />` element(s) to generated JS file(s).

## Connecting to a Meteor server

In order to connect to a Meteor servers, create DDP connection by using `DDP.connect()`, as seen in the following example:

```js
// This Should be in both server and client in a lib folder
DDPConnection = (Meteor.isClient) ? DDP.connect("http://localhost:3000/") : {};

// When creating a new collection on the client use:
if(Meteor.isClient) {
  posts = new Mongo.Collection("posts", DDPConnection);

  // set the new DDP connection to all internal packages, which require one
  Meteor.connection = DDPConnection;
  Accounts.connection = Meteor.connection;
  Meteor.users = new Mongo.Collection('users');
  Meteor.connection.subscribe('users');

  // And then you subscribe like this:
  DDPConnection.subscribe("mySubscription");
}
```

## Making routing work on a non Meteor server

To be able to open URLs and let them be handled by the client side JavaScript, you need to rewrite URLs on the server side, so they point always to `index.html`

### Apache

For apache a `.htaccess` with `mod_rewrite` could look as follow:

```bash
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

### nginx:

```conf
server {
  listen 80;
  listen [::]:80;
  index index.html;
  server_name myapp.com;
  root /var/www/myapp;

  error_page 404 =200 /index.html;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```
