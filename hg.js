/*
This library mostly implements the same interface as Python-hglib
Accordingly, I've just copied a lot of the documentation.
*/
    //cmd.push('-0'); TODO NOTE: this appears to make the cmdserver delimit lines with \0 instead of \n
var driver = require('./driver.js');
var dataLog = function(name, data){
    console.log('\n'+name+': ----')
    console.log(data);
    console.log('^^^^^ '+name+'\n')
};

function Hg(config_obj) {
    this.config_obj = config_obj;
    this.hg_driver = driver.get_driver(config_obj);
}
exports.createServer = function(config_obj) {
    dataLog('createServer',config_obj);
    return new Hg(config_obj);
}

Hg.prototype.info = function(){return this.hg_driver.hello};
Hg.prototype.teardown = function(callback){
    this.hg_driver.teardown(callback);
};

function wrapper_object(code, out, err) { return {code:code,out:out.toString(),err:err.toString()} };

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
Hg.prototype.add = function(callback, files, dry_run, subrepos, include, exclude) {
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
    this.hg_driver.run_structured_command(cmd,callback);
}
// This one calls the callback with a JSON object as the argument.
// this allows us to parse the output if need be.
Hg.prototype.addJSON = function(callback, files, dry_run, subrepos, include, exclude) {
    this.add(function(code, out, err){
        callback(wrapper_object(code,out,err));
        }, files, dry_run, subrepos, include, exclude);
}


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
/*
Create a copy of an existing repository specified by source in a new
directory dest.

If dest isn't specified, it defaults to the basename of source.

branch - clone only the specified branch
updaterev - revision, tag or branch to check out
revrange - include the specified changeset
*/
Hg.prototype.clone = function(callback, source, dest, branch, updaterev, revrange) {
    if (source === undefined) {
        source = process.cwd();
    }
    var cmd = driver.command_builder('clone', [source, dest], {
        b:branch,
        u:updaterev,
        r:revrange,
    });
    this.hg_driver.run_structured_command(cmd,callback);
}
// TODO cloneJSON   **

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
Hg.prototype.commit = function(callback, message, logfile, addremove, closebranch, date, user, include, exclude) {
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
    this.hg_driver.run_structured_command(cmd, callback);
}
Hg.prototype.commitJSON = function(callback, message, logfile, addremove, closebranch, date, user, include, exclude) {
    var wrapped_callback = function(code, out, err) {
        if ((code === 0 || code === 1 && out.toString().trim() === "nothing changed") && err.length === 0 && out.length > 0) {
            var stat,
                changeset_num = undefined,
                changeset_id  = undefined,
                outputs = undefined;
            if (out.toString().trim() === "nothing changed") {
                stat = "OK:unchanged";
            } else {
                stat = "OK:changed";
                outputs = out.toString().trim().split("\n");
                var changeset = /committed changeset (\d+):(.+)/.exec(outputs.pop());
                changeset_num = parseInt(changeset[1]);
                changeset_id  = changeset[2];
            }

            var result = {
                code:code,
                out:out,
                err:err,
                files:outputs,
                changeset_num:changeset_num,
                changeset_id :changeset_id,
                status:stat
            };
            dataLog('commitJSON',result);
            callback(result);
        } else if (err.length > 0) {
            // FIXME need to verify all the possible failure modes by looking at the mercurial code.
            // I wouldn't expect this to get done anytime soon.
            callback({
                code:code,
                out:out.toString().trim(),
                err:err.toString().trim(),
                status:"error"
            });
        } else {
            throw Error("Unexpected return from mercurial. hg.js is broken! Please notify the devs. State: "
             + JSON.stringify(wrapper_object(code,out,err)));
        }
    };
    this.commit(wrapped_callback, message, logfile, addremove, closebranch, date, user, include, exclude);
}

// TODO config
// TODO copy
// TODO diff
// TODO export
Hg.prototype.forget = function(callback, files, include, exclude) {
    if (typeof(files) === "string") {
        files = [files];
    }
    var cmd = driver.command_builder("forget",files,{I:include,X:exclude});
    this.hg_driver.run_structured_command(cmd,callback);
}
// TODO forgetJSON


// TODO grep
// TODO heads
// TODO identity
// TODO import
/*
 * Return new changesets found in the specified path or the default pull
 * location.
 * 
 * When bookmarks=True, return a list of (name, node) of incoming bookmarks.
 * 
 * revrange - a remote changeset or list of changesets intended to be added
 * force - run even if remote repository is unrelated
 * newest - show newest record first
 * bundle - avoid downloading the changesets twice and store the bundles into
 * the specified file.
 * 
 * bookmarks - compare bookmarks (this changes the return value)
 * branch - a specific branch you would like to pull
 * limit - limit number of changes returned
 * nomerges - do not show merges
 * ssh - specify ssh command to use
 * remotecmd - specify hg command to run on the remote side
 * insecure- do not verify server certificate (ignoring web.cacerts config)
 * subrepos - recurse into subrepositories
 */
Hg.prototype.incoming = function (args,callback) {
    var revrange = args.revrange,
        path = args.path,
        force = args.force,
        newest = args.newest,
        bundle = args.bundle,
        bookmarks = args.bookmarks,
        branch = args.branch,
        limit  = args.limit,
        nomerges = args.nomerges,
        subrepos = args.subrepos;

        var cmd = driver.command_builder('incoming',path, {
            template:'{rev}\\0{node}\\0{tags}\\0{branch}\\0{author}\\0{desc}\\n',
            r: revrange,
            f: force,
            n: newest,
            bundle: bundle,
            B: bookmarks,
            b: branch,
            l: limit,
            M: nomerges,
            S: subrepos,
        });

        this.hg_driver.run_structured_command(cmd,callback);
};

Hg.prototype.incomingJSON = function(args,callback) {
    var wrapped_callback = function(code,out,err) {
        var results = [];
        var lines = out.toString().trim().split('\n'),
            split_line,
            i;
        if (lines[2] === 'no changes found') {
            results = [];
        } else {
            for (i = 2; i < lines.length; i++) {
                split_line = lines[i].split('\0');
                results.push({
                    rev:split_line[0],
                    node:split_line[1],
                    tags:split_line[2],
                    branch:split_line[3],
                    author:split_line[4],
                    desc:split_line[5],
                });
            }
        }
        var result = {
            code:code,
            out:out.toString().trim(),
            err:err.toString().trim(),
            result:results,
        };
        dataLog('incomingJSON',result);
        callback(result);
    };
    this.incoming(args,wrapped_callback);
};

// TODO log
// TODO manifest
/*
Merge working directory with rev. If no revision is specified, the working
directory's parent is a head revision, and the current branch contains
exactly one other head, the other head is merged with by default.

The current working directory is updated with all changes made in the
requested revision since the last common predecessor revision.

Files that changed between either parent are marked as changed for the
next commit and a commit must be performed before any further updates to
the repository are allowed. The next commit will have two parents.

force - force a merge with outstanding changes
tool - can be used to specify the merge tool used for file merges. It
overrides the HGMERGE environment variable and your configuration files.

cb - controls the behaviour when Mercurial prompts what to do with regard
to a specific file, e.g. when one parent modified a file and the other
removed it. It can be one of merge.handlers, or a function that gets a
single argument which are the contents of stdout. It should return one
of the expected choices (a single character).
*/
var merge_handlers = { // FIXME Weirdly, hg is not working for me the way the doc says it should.
    die: this.teardown,     // merge is not prompting, but update is, but then it is not /really/ prompting...
    yes: function(stdout){return 'y';}, //not sure if this is appropriate
};
Hg.prototype.merge = function(callback, rev, force, tool, prompt_handler) {
    if (prompt_handler === undefined) {
        prompt_handler = merge_handlers.die;
    }
    var cmd = driver.cmdbuilder('merge',[],{r:rev,f:force,t:tool});
    this.hg_driver.run_structured_command(cmd,callback,prompt_handler);
}
// TODO mergeJSON   ** 
// TODO move

/*
 * Return changesets not found in the specified path or the default push
 * location.
 * 
 * revrange - a (list of) changeset intended to be included in the destination
 * force - run even when the destination is unrelated
 * newest - show newest record first
 * branch - a specific branch you would like to push
 * limit - limit number of changes displayed
 * nomerges - do not show merges
 * ssh - specify ssh command to use
 * remotecmd - specify hg command to run on the remote side
 * insecure - do not verify server certificate (ignoring web.cacerts config)
 * subrepos - recurse into subrepositories
 */
Hg.prototype.outgoing = function(args, callback) {
    var revrange = args.revrange,
        path = args.path,
        force = args.force,
        newest = args.newest,
        bookmarks = args.bookmarks,
        branch = args.branch,
        limit = args.limit,
        nomerges = args.nomerges,
        subrepos = args.subrepos;

    var cmd = driver.command_builder('outgoing',path, {
            template:'{rev}\\0{node}\\0{tags}\\0{branch}\\0{author}\\0{desc}\\n',
            r: revrange,
            f: force,
            n: newest,
            B: bookmarks,
            b: branch,
            S: subrepos,
            });
    this.hg_driver.run_structured_command(cmd,callback);
};
Hg.prototype.outgoingJSON = function(args, callback) {
    var wrapped_callback = function(code,out,err) {
        var results = [];
        var lines = out.toString().trim().split('\n'),
            split_line;
        if (lines[2] === 'no changes found') {
            results = [];
        } else {
            for (var i = 2; i < lines.length; i++) {
                split_line = lines[i].split('\0');
                results.push({
                    rev:split_line[0],
                    node:split_line[1],
                    tags:split_line[2],
                    branch:split_line[3],
                    author:split_line[4],
                    desc:split_line[5],
                });
            }
        }
        var result = {code:code,out:out.toString().trim(),err:err.toString().trim(), result:results};
        dataLog('outgoingJSON',result);
        callback(result);
    };
    this.outgoing(args, wrapped_callback);
};
// TODO outgoing    **
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
Hg.prototype.pull = function(args, callback) {
    var source = args.source, // technically, these are superfluous; they are here for documentation
        rev = args.rev,
        update = args.update,
        force = args.force,
        bookmark = args.bookmark,
        branch = args.branch,
        ssh = args.ssh,
        remotecmd = args.remotecmd,
        insecure = args.insecure,
        tool = args.tool;

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
    this.hg_driver.run_structured_command(cmd,callback);
}
Hg.prototype.pullJSON = function(args, callback) {
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
            var line = outputs.shift();
            var repo = /pulling from (.*)/.exec(line);
            while ((line = outputs.shift()).match(/(searching for changes)|(adding changesets)|(adding manifests)|(adding file changes)/)) {} // skip all these lines
            var changeset = /added (\d+) changesets with (\d+) changes to (\d+) files( (.\d+) heads)?/.exec(line);
            if (! changeset) {
                outputs.unshift(line);
            }
            var notes = outputs.join("\n");

            var result_obj = {
                code:code,
                out :out.toString().trim(),
                err :err.toString().trim(),
                repo:repo[1],
                notes:notes,
                changeset_count:0,
                changes_count:0,
                changed_file_count:0,
                changed_heads:0,
            };

            if (changeset) {
                result_obj.changeset_count    = parseInt(changeset[1]);
                result_obj.changes_count      = parseInt(changeset[2]);
                result_obj.changed_file_count = parseInt(changeset[3]);
                if (changeset[5] !== undefined) {
                    result_obj.changed_heads  = changeset[5];
                }
            }

            callback(result_obj);

        } else {
            throw Error("Unexpected return from mercurial. hg.js is broken! Please notify the devs. State: "
             + JSON.stringify(wrapper_object(code,out,err)));
        }
    };
    this.pull(args,wrapped_callback);
}

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
Hg.prototype.push = function(args, callback) {
    var dest = args.dest,
        rev = args.rev, 
        force = args.force, 
        bookmark = args.bookmark, 
        branch = args.branch, 
        newbranch = args.newbranch, 
        ssh = args.ssh, 
        remotecmd = args.remotecmd, 
        insecure = args.insecure;

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
    this.hg_driver.run_structured_command(cmd,callback);
}
Hg.prototype.pushJSON = function(args, callback) {
    var wrapped_callback = function(code, out, err) {
        var result = {
                code:code,
                out:out.toString().trim(),
                err:err.toString().trim(),
            };
        if (code !== 0 || err.length > 0) {
            // FIXME need to verify all the possible failure modes by looking at the mercurial code.
            // I wouldn't expect this to get done anytime soon.
            result.pushed = false;
            callback(result);
        } else if (out.length > 0) {
            var outputs = out.toString().trim().split("\n");
            dataLog('pushJSON',outputs);

            var repo = outputs.shift();
            repo = /pushing to (.*)/.exec(repo);
            result.repo = repo[1];
            var auth = outputs.pop(),
                changeset;
            if ( ( auth_match = (/(\S+) is allowed. accepted payload.$/).exec(auth) ) ) {
                result.auth = auth;
                changeset = outputs.pop();
            } else if ( auth === 'abort: authorization failed' ) {
                result.auth = auth;
                result.pushed = false;
                callback(result);
            } else {
                changeset = auth;
            }

            if (changeset === "no changes found") {
                changeset = [changeset,0,0,0];
            } else {
                changeset = /added (\d+) changesets with (\d+) changes to (\d+) file.*/.exec(changeset);
            }

            result.changeset_count    = parseInt(changeset[1]);
            result.changes_count      = parseInt(changeset[2]);
            result.changed_file_count = parseInt(changeset[3]);
            result.pushed = true;

            callback(result);
        } else {
            throw Error("Unexpected return from mercurial. hg.js is broken! Please notify the devs. State: "
             + JSON.stringify(wrapper_object(code,out,err)));
        }
    };
    this.push(args,wrapped_callback);
}
// TODO remove
// TODO resolve
// TODO revert
// TODO root
/*
Return status of files in the repository as a list of (code, file path)
where code can be:

        M = modified
        A = added
        R = removed
        C = clean
        ! = missing (deleted by non-hg command, but still tracked)
        ? = untracked
        I = ignored
          = origin of the previous file listed as A (added)

rev - show difference from (list of) revision
change - list the changed files of a revision
all - show status of all files
modified - show only modified files
added - show only added files
removed - show only removed files
deleted - show only deleted (but tracked) files
clean - show only files without changes
unknown - show only unknown (not tracked) files
ignored - show only ignored files
copies - show source of copied files
subrepos - recurse into subrepositories
include - include names matching the given patterns
exclude - exclude names matching the given patterns
*/
Hg.prototype.status = function(callback, rev, change, all, modified, added, removed, deleted, clean,
                unknown, ignored, copies, subrepos, include, exclude) {
    if (rev && change) {
        throw Error("cannot specify both rev and change");
    }
    cmd = driver.command_builder('status', [], {
        r:rev,
        change:change,
        A:all,
        m:modified,
        a:added,
        r:removed,
        d:deleted,
        c:clean,
        u:unknown,
        i:ignored,
        C:copies,
        S:subrepos,
        I:include,
        X:exclude,
    });
    this.hg_driver.run_structured_command(cmd,callback);
}
Hg.prototype.statusJSON = function(callback, rev, change, all, modified, added, removed, deleted, clean,
                unknown, ignored, copies, subrepos, include, exclude) {
    var wrapped_callback = function(code, out, err) {
        if (code !== 0 || err.length > 0) {
            // FIXME need to verify all the possible failure modes by looking at the mercurial code.
            // I wouldn't expect this to get done anytime soon.
            callback({
                code:code,
                out:out.toString().trim(),
                err:err.toString().trim(),
            });
        } else if (out.length >= 0) {
            var outputs = out.toString().trim().split("\n");

            var modified=[],
                added=[],
                removed=[],
                clean=[],
                missing=[],
                untracked=[],
                ignored=[];
            outputs.forEach(function(val){
                var val_arr = val.split(" ");
                switch(val_arr[0]){
                    case 'M':
                        modified.push(val_arr[1]);
                        break;
                    case 'A':
                        added.push(val_arr[1]);
                        break;
                    case 'R':
                        removed.push(val_arr[1]);
                        break;
                    case 'C':
                        clean.push(val_arr[1]);
                        break;
                    case '!':
                        missing.push(val_arr[1]);
                        break;
                    case '?':
                        untracked.push(val_arr[1]);
                        break;
                    case 'I':
                        ignored.push(val_arr[1]);
                        break;
                    case ' ':
                        var last_added = added.pop();
                        added.push(last_added+" (source: "+val_arr[1]+")");
                        break;
                    default :
                }
            });
            var result = {
                code:code,
                out :out.toString().trim(),
                err :err.toString().trim(),
                modified:modified, added:added, removed:removed, clean:clean,
                missing:missing, untracked:untracked, ignored:ignored,
            };
            dataLog('statusJSON',result);
            callback(result);
        } else {
            throw Error("Unexpected return from mercurial. hg.js is broken! Please notify the devs. State: "
             + JSON.stringify(wrapper_object(code,out,err)));
        }
    };
    this.status(wrapped_callback, rev, change, all, modified, added, removed, deleted, clean,
                unknown, ignored, copies, subrepos, include, exclude);
}

// TODO tag
// TODO tags
// TODO summary
// TODO tip

/*
Update the repository's working directory to changeset specified by rev.
If rev isn't specified, update to the tip of the current named branch.

Return the number of files (updated, merged, removed, unresolved)

clean - discard uncommitted changes (no backup)
check - update across branches if no uncommitted changes
date - tipmost revision matching date
*/
Hg.prototype.update = function(callback, rev, clean, check, date){
    var cmd = driver.command_builder('update',null,{
        r:rev,
        C:clean,
        c:check,
        d:date,
    });
    this.hg_driver.run_structured_command(cmd,callback);
}
Hg.prototype.updateJSON = function(callback, rev, clean, check, date){
    var wrapped_callback = function(code,out,err){
        if ((code !== 0 && code !== 1) || err.length > 0) {
            // FIXME need to verify all the possible failure modes by looking at the mercurial code.
            // I wouldn't expect this to get done anytime soon.
            callback({
                code:code,
                out:out.toString().trim(),
                err:err.toString().trim(),
            });
        } else if (out.length > 0) {
            var outv = out.trim().split("\n");
            var merged_files = [];
            var line;
            while ((line = outv.shift()).match(/merging .*/)) {
                merged_files.push(/merging (.*)/.exec(line)[1]);
            }
            var summary = /(\d+) files updated, (\d+) files merged, (\d+) files removed, (\d+) files unresolved/.exec(line);
            var message = outv.join("\n");

            callback({
                code:code,
                out:out.toString().trim(),
                err:err.toString().trim(),
                updated: parseInt(summary[1]),
                merged : parseInt(summary[2]),
                removed: parseInt(summary[3]),
                unresolved: parseInt(summary[4]),
                merged_files: merged_files,
                message: message,
            });
        } else {
            throw Error("Unexpected return from mercurial. hg.js is broken! Please notify the devs. State: "
             + JSON.stringify(wrapper_object(code,out,err)));
        }
    };
    this.update(wrapped_callback, rev, clean, check, date);
}
// TODO version
