/*
This library mostly implements the same interface as Python-hglib
Accordingly, I've just copied a lot of the documentation.
*/
var driver = require('./driver.js');

function next() {
    if (script.length !== 0)
        script.shift()();
}
var result_printer = function(name) {
    return function(code,out,err){
        console.log();
        console.log(name+':\n  |code:<<<'+code+'>>>\n  |out:<<<'+JSON.stringify(out.toString())+'>>>\n  |err:<<<'+JSON.stringify(err.toString())+'>>>');
        //console.log(out);
        next();
    };
};
var script = [
    function(){driver.get_encoding(result_printer("get_encoding"))},
    function(){driver.run_command("summary", result_printer("run_command('summary')"))},
    function(){driver.run_command("stat", result_printer("run_command('stat')"))},
    function(){add(['test', 'test2'],result_printer("add_function(['test','test2'])"),true)},
    function(){add(['test', 'test2'],result_printer("add_function(['test','test2'])"))},
    function(){add(['test'],result_printer("add_function(['test'])"))},
    function(){add(['test2'],result_printer("add_function(['test2'])"))},
    //function(){add(['test', 'test2'])}, // no callback defined: will hang, since we can't call the next command.
    function(){process.exit()},
]

next();

/*
Add the specified files on the next commit.
If no files are given, add all files to the repository.
callback - function(exit_code,out,err){}
           run this function when the command completes.
           'out' and 'err' are the captured data (Buffer) from running the command
           NOTE: this is not part of the Python-hglib
dryrun - do no perform actions
subrepos - recurse into subrepositories
include - include names matching the given patterns
exclude - exclude names matching the given patterns

Return whether all given files were added.
*/
function add(files, callback, dry_run, subrepos, include, exclude) {
    if (typeof(files) === "string") {
        files = [files];
    }

    var cmd = driver.command_builder("add", files,
    {
        n:dry_run,
        S:subrepos,
        I:include,
        X:exclude,
        keys:['n','S','I','X'],
    });
    console.log(cmd);
    driver.run_structured_command(cmd,callback);
}
exports.add = add
