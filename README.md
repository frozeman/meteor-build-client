[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/frozeman/meteor-build-client?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

*Note: The meteor package `frozeman:build-client` is only a placeholder package, don't install.*

# Meteor Build Client

This tool builds and bundles the client part of a Meteor app with a simple index.html,
so it can be hosted on any server or even loaded via the `file://` protocol.

## Installation

    $ [sudo] npm install -g meteor-build-client

## Usage

    // cd into you meteor app
    $ cd myApp

    // run meteor-build-client
    $ meteor-build-client ../myOutputFolder

Additionally you can set the `ROOT_URL` of app using the `--url` or `-u` option:

    $ meteor-build-client ../myOutputFolder -u http://myserver.com

    // For all options see
    $ meteor-build-client --help

The content of the output folder could look as follows:

- `index.html`
- `a28817fe16898311635fa73b959979157e830a31.css`
- `aeca2a21c383327235a08d55994243a9f478ed57.js`
- `...` (other files from your public folder)

## Using custom templates

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
DDPConnection = (Meteor.isClient) ? DDP.connect('http://localhost:3000/') : {};

if(Meteor.isClient) {
    // set the new DDP connection to all internal packages, which require one
    Meteor.connection = DDPConnection;
    Accounts.connection = Meteor.connection;
    Meteor.users = new Mongo.Collection('users');
    Meteor.connection.subscribe('users');
}

// When creating a collection use:
posts = new Mongo.Collection("posts", DDPConnection);
// And to subscribe use the DDP connection
DDPConnection.subscribe("mySubscription");
```
