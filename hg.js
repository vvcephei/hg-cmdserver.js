var hg_util = require('./hg_util.js');

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
    function(){hg_util.get_encoding(result_printer("get_encoding"))},
    function(){hg_util.run_command("summary", result_printer("run_command('summary')"))},
    function(){hg_util.run_command("stat", result_printer("run_command('stat')"))},
]

script.shift()();
