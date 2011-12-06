var driver = require('./driver.js');

var result_printer = function(name) {
    return function(code,out){
        console.log();
        console.log(name+':\n  |code:<<<'+code+'>>>\n  |out:<<<'+out+'>>>');
        //console.log(out);
        if (script.length !== 0)
            script.shift()();
    };
};
var script = [
    function(){driver.get_encoding(result_printer("get_encoding"))},
    function(){driver.run_command("summary", result_printer("run_command('summary')"))},
    function(){driver.run_command("stat", result_printer("run_command('stat')"))},
]

script.shift()();
