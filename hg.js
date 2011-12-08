/*
This library mostly implements the same interface as Python-hglib
Accordingly, I've just copied a lot of the documentation.
*/
var driver = require('./driver.js');
exports.setup = function(settings){
    if ('cwd' in settings)
        driver.setup(settings.cwd);
};
exports.teardown = function(callback){
    driver.teardown(callback);
};

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
function add(callback, files, dry_run, subrepos, include, exclude) {
    if (typeof(files) === "string") {
        files = [files];
    }

    var cmd = driver.command_builder("add", files,
    {
        n:dry_run,
        S:subrepos,
        I:include,
        X:exclude,
    });
    driver.run_structured_command(cmd,callback);
}
// This one calls the callback with a JSON object as the argument.
// this allows us to parse the output if need be.
function addJSON(callback, files, dry_run, subrepos, include, exclude) {
    add(plain_json_output_wrapper(callback), files, dry_run, subrepos, include, exclude);
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
function commit(callback, message, logfile, addremove, closebranch, date, user, include, exclude) {
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
    });
    driver.run_structured_command(cmd, callback);
}
function commitJSON(callback, message, logfile, addremove, closebranch, date, user, include, exclude) {
    var wrapped_callback = function(code, out, err) {
        if (code !== 0 || err.length > 0) {
            // FIXME need to verify all the possible failure modes by looking at the mercurial code.
            // I wouldn't expect this to get done anytime soon.
            callback({
                code:code,
                out:out.toString().trim(),
                err:err.toString().trim(),
            });
        } else if (out.length > 0) {
            var outputs = out.toString().trim().split("\n");
            var changeset = /committed changeset (\d+):(.+)/.exec(outputs.pop());

            callback({
                code:code,
                out:out,
                err:err,
                files:outputs,
                changeset_num:parseInt(changeset[1]),
                changeset_id :changeset[2],
            });
        } else {
            throw Error("Unexpected return from mercurial. hg.js is broken! Please notify the devs. State: "
             + JSON.stringify(wrapper_object(code,out,err)));
        }
    };
    commit(wrapped_callback, message, logfile, addremove, closebranch, date, user, include, exclude);
}
exports.commit = commit;
exports.commitJSON = commitJSON;

// TODO config
// TODO copy
// TODO diff
// TODO export
function forget(callback, files, include, exclude) {
    if (typeof(files) === "string") {
        files = [files];
    }
    var cmd = driver.command_builder("forget",files,{I:include,X:exclude});
    driver.run_structured_command(cmd,callback);
}
// TODO forgetJSON
exports.forget = forget;


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

/*
Pull changes from a remote repository.

This finds all changes from the repository specified by source and adds
them to this repository. If source is omitted, the 'default' path will be
used. By default, this does not update the copy of the project in the
working directory.

Returns True on success, False if update was given and there were
unresolved files.

update - update to new branch head if changesets were pulled
force - run even when remote repository is unrelated
rev - a (list of) remote changeset intended to be added
bookmark - (list of) bookmark to pull
branch - a (list of) specific branch you would like to pull
ssh - specify ssh command to use
remotecmd - specify hg command to run on the remote side
insecure - do not verify server certificate (ignoring web.cacerts config)
tool - specify merge tool for rebase
*/
function pull(callback,source,rev,update,force,bookmark,branch,ssh,remotecmd,insecure,tool){
    var cmd = driver.command_builder('pull',source,{
        r:rev,
        u:update,
        f:force,
        B:bookmark,
        b:branch,
        e:ssh,
        remotecmd:remotecmd,
        insecure:insecure,
        t:tool,
    });
    driver.run_structured_command(cmd,callback);
}
function pullJSON(callback,source,rev,update,force,bookmark,branch,ssh,remotecmd,insecure,tool){
    var wrapped_callback = function(code, out, err) {
        if (code !== 0 || err.length > 0) {
            // FIXME need to verify all the possible failure modes by looking at the mercurial code.
            // I wouldn't expect this to get done anytime soon.
            callback({
                code:code,
                out:out.toString().trim(),
                err:err.toString().trim(),
            });
        } else if (out.length > 0) {
            var outputs = out.toString().trim().split("\n");
            var repo = outputs.shift();
            repo = /pulling from (.*)/.exec(repo);
            var update_procedure = outputs.pop();
            var pulled_changes = true;
            if (update_procedure === "(run 'hg update' to get a working copy)"){
                update_procedure = "UPDATE";
            } else if (update_procedure === "no changes found") {
                update_procedure = "NONE";
                pulled_changes   = false;
            } else {
                throw Error("Unexpected return from mercurial. hg.js is broken! Please notify the devs. State: "
                 + JSON.stringify(wrapper_object(code,out,err)));
            }

            var result_obj = {
                code:code,
                out :out.toString().trim(),
                err :err.toString().trim(),
                repo:repo[1],
                need_update:(update_procedure === "UPDATE"),
            };

            if (pulled_changes) {
                var changeset = outputs.pop();
                changeset = /added (\d+) changesets with (\d+) changes to (\d+) files.*/.exec(changeset);
                result_obj.changeset_count    = parseInt(changeset[1]);
                result_obj.changes_count      = parseInt(changeset[2]);
                result_obj.changed_file_count = parseInt(changeset[3]);
            }

            callback(result_obj);

        } else {
            throw Error("Unexpected return from mercurial. hg.js is broken! Please notify the devs. State: "
             + JSON.stringify(wrapper_object(code,out,err)));
        }
    };
    pull(wrapped_callback,source,rev,update,force,bookmark,branch,ssh,remotecmd,insecure,tool);
}
exports.pull = pull;
exports.pullJSON = pullJSON;

/*
Push changesets from this repository to the specified destination.

This operation is symmetrical to pull: it is identical to a pull in the
destination repository from the current one.

Returns True if push was successful, False if nothing to push.

rev - the (list of) specified revision and all its ancestors will be pushed
to the remote repository.

force - override the default behavior and push all changesets on all
branches.

bookmark - (list of) bookmark to push
branch - a (list of) specific branch you would like to push
newbranch - allows push to create a new named branch that is not present at
the destination. This allows you to only create a new branch without
forcing other changes.

ssh - specify ssh command to use
remotecmd - specify hg command to run on the remote side
insecure - do not verify server certificate (ignoring web.cacerts config)
*/
function push(callback, dest, rev, force, bookmark, branch, newbranch, ssh, remotecmd, insecure){
    if (! dest) {
        dest = [];
    }
    var cmd = driver.command_builder('push', dest, {
        r:rev,
        f:force,
        B:bookmark,
        b:branch,
        new_branch:newbranch,
        e:ssh,
        remotecmd:remotecmd,
        insecure:insecure,
    });
    driver.run_structured_command(cmd,callback);
}
function pushJSON(callback, dest, rev, force, bookmark, branch, newbranch, ssh, remotecmd, insecure){
    var wrapped_callback = function(code, out, err) {
        if (code !== 0 || err.length > 0) {
            // FIXME need to verify all the possible failure modes by looking at the mercurial code.
            // I wouldn't expect this to get done anytime soon.
            callback({
                code:code,
                out:out.toString().trim(),
                err:err.toString().trim(),
            });
        } else if (out.length > 0) {
            var outputs = out.toString().trim().split("\n");
            var repo = outputs.shift();
            repo = /pushing to (.*)/.exec(repo);
            var changeset = outputs.pop();
            changeset = /added (\d+) changesets with (\d+) changes to (\d+) file.*/.exec(changeset);

            callback({
                code:code,
                out :out.toString().trim(),
                err :err.toString().trim(),
                repo:repo[1],
                changeset_count   :parseInt(changeset[1]),
                changes_count     :parseInt(changeset[2]),
                changed_file_count:parseInt(changeset[3]),
            });
        } else {
            throw Error("Unexpected return from mercurial. hg.js is broken! Please notify the devs. State: "
             + JSON.stringify(wrapper_object(code,out,err)));
        }
    };
    push(wrapped_callback, dest, rev, force, bookmark, branch, newbranch, ssh, remotecmd, insecure);
}
exports.push = push;
exports.pushJSON = pushJSON;
// TODO remove
// TODO resolve
// TODO revert
// TODO root
// TODO status   *
// TODO tag
// TODO tags
// TODO summary
// TODO tip
// TODO update   *
// TODO version
