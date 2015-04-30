var spinner = require('./spinner');

function test1() {
  spinner.start();
  setTimeout(function() {
    spinner.stop();
    test2();
  }, 1000);
}

function test2() {
  spinner.change_sequence(["0o0", "o0o"]);
  spinner.start();
  setTimeout(function() {
    spinner.stop();
  }, 1000);
}

test1();
