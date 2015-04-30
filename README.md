[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/frozeman/meteor-build-client?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

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

## Using custom templates

If you want to provide a custom template for the initial HTML provide an HTML file with the `--template` or `-t` option:

    $ meteor-build-client -t ../myTemplate.html

The template file need to contain 3 placholders: `{{> head}}`, `{{> css}}` and `{{> scripts}}`.
See the following example, which adds a simepl loading text to the HTML file:

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
By linking a file from your `public` folder (e.g. `loadingScreen.css`) and moving the `{{> css}}` and `{{> scripts}}` placeholder top the end of the body
you can simply style your loading screen.
As the small CSS file and the body content will be loaded before the Meteor app script is loaded.

## Connecting to a Meteor server

In order to connect to a Meteor servers DDP connection you can use `DDP.connect()` as seen in the following example:

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
