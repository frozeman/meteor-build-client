Package.describe({
  name: 'frozeman:build-client',
  summary: 'Placeholder package for meteor-build-client (npm). Do not install!',
  version: '1.0.0',
  git: 'https://github.com/frozeman/meteor-build-client'
});

Package.onUse(function (api) {
  api.versionsFrom('1.2');
  api.use('standard-minifiers');
});
