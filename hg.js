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
    return function(code,out){
        console.log();
        console.log(name+':\n  |code:<<<'+code+'>>>\n  |out:<<<'+out+'>>>');
        //console.log(out);
        next();
    };
};
var script = [
    function(){driver.get_encoding(result_printer("get_encoding"))},
    function(){driver.run_command("summary", result_printer("run_command('summary')"))},
    function(){driver.run_command("stat", result_printer("run_command('stat')"))},
    function(){add(['test','2','3']); next();},
    function(){add(['test','2','3'], true); next();},
    function(){add(['test','2','3'], true,true); next();},
    function(){add(['test','2','3'], true,true,true); next();},
    function(){add(['test','2','3'], true,true,true,true); next();},
]

next();

/*
Add the specified files on the next commit.
If no files are given, add all files to the repository.
dryrun - do no perform actions
subrepos - recurse into subrepositories
include - include names matching the given patterns
exclude - exclude names matching the given patterns

Return whether all given files were added.
*/
function add(files, dry_run, subrepos, include, exclude) {
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
}
exports.add = add
