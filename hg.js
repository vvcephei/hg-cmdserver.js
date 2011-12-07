/*
This library mostly implements the same interface as Python-hglib
Accordingly, I've just copied a lot of the documentation.
*/
var driver = require('./driver.js');

function next() {
    if (script.length !== 0)
        script.shift()();
}
var result_printer = function(name, json_format) {
    if (json_format) {
        return function(obj) {
            console.log();
            console.log(name+":");
            console.log(obj);
            next();
        };
    } else {
        return function(code,out,err){
            console.log();
            console.log(name+':\n  |code:<<<'+code+'>>>\n  |out:<<<'+JSON.stringify(out.toString())+'>>>\n  |err:<<<'+JSON.stringify(err.toString())+'>>>');
            //console.log(out);
            next();
        };
    }
};
var script = [
    function(){driver.get_encoding(result_printer("get_encoding"))},
    function(){driver.run_command("summary", result_printer("run_command('summary')"))},
    function(){driver.run_command("stat", result_printer("run_command('stat')"))},
    function(){add(['test', 'test2'],result_printer("add_function(['test','test2'])"),true)},
    function(){add(['test', 'test2'],result_printer("add_function(['test','test2'])"))},
    function(){add(['test'],result_printer("add_function(['test'])"))},
    function(){add(['test2'],result_printer("add_function(['test2'])"))},
    function(){addJSON('test',result_printer("addJSON('test')", true))},
    function(){commit('commit message',result_printer('commit'))},
    //function(){add(['test', 'test2'])}, // no callback defined: will hang, since we can't call the next command.
    function(){process.exit()},
]

next();

function wrapper_object(code, out, err) { return {code:code,out:out.toString(),err:err.toString()} }
function plain_json_output_wrapper(callback) {
    return function(code, out, err){
        callback(wrapper_object(code,out,err));
        };
}

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
// This one calls the callback with a JSON object as the argument.
// this allows us to parse the output if need be.
function addJSON(files, callback, dry_run, subrepos, include, exclude) {
    add(files, plain_json_output_wrapper(callback), dry_run, subrepos, include, exclude);
}
exports.add = add;
exports.addJSON = addJSON;


// TODO addremove
// TODO annotate
// TODO archive
// TODO backout
// TODO bookmark
// TODO bookmarks
// TODO branch
// TODO branches
// TODO bundle
// TODO cat
// TODO clone    *


/*
Commit changes reported by status into the repository.

message - the commit message
logfile - read commit message from file
addremove - mark new/missing files as added/removed before committing
closebranch - mark a branch as closed, hiding it from the branch list
date - record the specified date as commit date
user - record the specified user as committer
include - include names matching the given patterns
exclude - exclude names matching the given patterns
*/
function commit(message, callback, logfile, addremove, closebranch, date, user, include, exclude) {
    if (! message && ! logfile) {
        throw Error("must provide message or logfile");
    } else if (message && logfile) {
        throw Error("cannot provide both message and logfile");
    }
    var cmd = driver.command_builder("commit",[],{
        debug: true,
        m    : message,
        A    : addremove,
        close_branch: closebranch,
        d    : date,
        u    : user,
        l    : logfile,
        I    : include,
        X    : exclude,
        keys : "debug m A close_branch d u l I X".split(" ")
    });
    driver.run_structured_command(cmd, callback);
}
function commitJSON(message, callback, logfile, addremove, closebranch, date, user, include, exclude) {
    var wrapped_callback = function(code, out, err) {
        if (code !== 0) {
            // not sure about the failure modes right now. just passing though. FIXME
            callback(wrapper_object(code,out,err));
        } else if (out.length > 0) {
            var outputs = out.toString().split("\n");
            var changeset = /commited changeset (\d+):(.+)/.exec(outputs.pop());
            callback({
                code:code,
                out:out,
                err:err,
                files:outputs,
                changeset_num:changeset[1],
                changeset_id :changeset[2],
            });
        } else if (err.length > 0) {
        } else {
            throw Error("unexpected return from mercurial. hg.js is broken! Please notify the devs");
        }
    };
    commit(message, wrapped_callback, logfile, addremove, closebranch, date, user, include, exclude);
}





// TODO config
// TODO copy
// TODO diff
// TODO export
// TODO forget
// TODO grep
// TODO heads
// TODO identity
// TODO import
// TODO incoming
// TODO log
// TODO manifest
// TODO merge    *
// TODO move
// TODO outgoing
// TODO parents
// TODO paths
// TODO pull     *
// TODO push     *
// TODO remove
// TODO resolve
// TODO revert
// TODO root
// TODO status   *
// TODO tag
// TODO tags
// TODO summary
// TODO tip
// TODO update
// TODO version
