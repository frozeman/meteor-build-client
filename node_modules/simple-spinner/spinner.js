/***********
 * Spinner *
 ***********/
var spinner = (function() {
	//var util = require('util');
	var sequence = ["|","/","-","\\"]; //[".", "o", "0", "@", "*"];
	var index = 0;
	var timer;
	
	function start(inv) {
		inv = inv || 250;
		index = 0;
		//util.print(sequence[index]);
		process.stdout.write(sequence[index]);
		timer = setInterval(function() {
			//util.print(sequence[index].replace(/./g,"\r"));
			process.stdout.write(sequence[index].replace(/./g,"\r"));
			index = (index < sequence.length - 1) ? index + 1 : 0;
			//util.print(sequence[index]);
			process.stdout.write(sequence[index]);
		},inv);
	}
	
	function stop() {
		clearInterval(timer);
		//util.print(sequence[index].replace(/./g,"\r"));
		process.stdout.write(sequence[index].replace(/./g,"\r"));
	}
	
	function change_sequence(seq) {
		if(Array.isArray(seq)) {
			sequence = seq;
		}
	}
	
	return {
		start: start,
		stop: stop,
		change_sequence: change_sequence
	};
})();

module.exports = spinner;
