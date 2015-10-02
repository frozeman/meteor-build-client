[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/frozeman/meteor-build-client?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

*Note: The meteor package `frozeman:build-client` is only a placeholder package, don't install.*

# Meteor Build Client

This tool builds and bundles the client part of a Meteor app with a simple index.html,
so it can be hosted on any server or even loaded via the `file://` protocol.

## Installation

    $ [sudo] npm install -g meteor-build-client

## Usage

    // cd into your meteor app
    $ cd myApp

    // run meteor-build-client
    $ meteor-build-client ../myOutputFolder

### Output

The content of the output folder could look as follows:

- `index.html`
- `a28817fe16898311635fa73b959979157e830a31.css`
- `aeca2a21c383327235a08d55994243a9f478ed57.js`
- `...` (other files from your "public" folder)

For a list of options see:

    $ meteor-build-client --help

### Passing a settings.json

You can pass an additional settings file using the `--settings` or `-s` option:

    $ meteor-build-client ../myOutputFolder -s ../settings.json

**Note** Only the `public` property of that JSON file will be add to the `Meteor.settings` property.


### App URL

Additionally you can set the `ROOT_URL` of your app using the `--url` or `-u` option:

    $ meteor-build-client ../myOutputFolder -u http://myserver.com

If you pass `"default"`, your app will try to connect to the server where the application was served from.

If this option was not set, it will set the server to `""` (empty string) and will add a `Meteor.disconnect()` after Meteor was loaded.

### Absolute or relative paths

If you want to be able to start you app by simply opening the index.html (using the `file://` protocol),
you need to link your files relative. You can do this by setting the `--path` or `-p` option:

    $ meteor-build-client ../myOutputFolder -p ""

The default path value is `"/"`.

*Note* When set a path value, it will also replace this path in you Meteor CSS file, so that fonts etc link correctly.

### Using custom templates

If you want to provide a custom template for the initial HTML provide an HTML file with the `--template` or `-t` option:

    $ meteor-build-client ../myOutputFolder -t ../myTemplate.html

The template file need to contain the following placholders: `{{> head}}`, `{{> css}}` and `{{> scripts}}`.
The following example adds a simple loading text to the initial HTML file (Your app should later take care of removing the loading text):

```html
<!DOCTYPE html>
<html>
    <head>
        {{> head}}
        <link rel="stylesheet" type="text/css" href="/loadingScreen.css">
    </head>
    <body>
        <h1>Loading...</h1>

        {{> css}}
        {{> scripts}}
    </body>
</html>
```
By linking a file from your `public` folder (e.g. `loadingScreen.css`) and moving the `{{> css}}` and `{{> scripts}}` placeholder to the end of the `<body>` tag,
you can simply style your loading screen.
Because the small CSS file (`loadingScreen.css`) and the body content will be loaded *before* the Meteor app script, the the user sees the nice Loading text.

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

To be able to open URLs and let them be handled by the client side JavaScript, you need to rewrite URLs on the server side, so they point always to your index.html.

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
