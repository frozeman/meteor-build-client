module.exports = {
  print(...args) {
    console.info.apply(console, args);
  }
};
