// FIFO
module.exports = function() {
  var self = this;
  var invokations = [];
  var paused = true;
  var maxLength = 0;
  
  self.progress = function(count, total) {
    // console.log(count + ' of ' + total);
  };

  self.reset = function() {
    paused = true;
    invokations = [];
  };

  self.add = function(f) {
    if (paused) {
      if (typeof f !== 'function') {
        throw new Error('queue requires function');
      }
      invokations.push(f);
    }
  };

  self.next = function(text) {
    if (text) {
      self.reset();
      console.log(' ' + text.red);
    }
    
    if (!paused) {


      if (invokations.length) {
        var f = invokations.shift();
        // Update the progress
        self.progress(invokations.length, maxLength);
        setTimeout(function() {
          // Run function
          f(self.next);
        }, 0);
      }

    }
  };

  self.run = function() {
    paused = false;
    maxLength = invokations.length;
    // Update the progress
    self.progress(invokations.length, maxLength);
    self.next();
  };
};