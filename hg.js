/*
This library mostly implements the same interface as Python-hglib
Accordingly, I've just copied a lot of the documentation.
*/
    //cmd.push('-0'); TODO NOTE: this appears to make the cmdserver delimit lines with \0 instead of \n
var driver = require('./driver.js');

function Hg(config_obj) {
  var that = this;
  that.config_obj = config_obj;
  that.debug = config_obj.debug;
  that.hg_driver = driver.get_driver(config_obj);
}

exports.createServer = function(config_obj) {
    dataLog('createServer',config_obj);
    return new Hg(config_obj);
}

var dataLog = function(name, data, that){
  if (!that || that.debug) {
    console.log('\n'+name+': ----')
    console.log(data);
    console.log('^^^^^ '+name+'\n')
  }
};

Hg.prototype.info = function(){return this.hg_driver.hello};
Hg.prototype.teardown = function(callback){
  var that = this;
  that.hg_driver.teardown(callback);
};

var wrapper_object = function(code, out, err) {
  return { code:code
         , out:out.toString().trim()
         , err:err.toString().trim()
         }
};

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
Hg.prototype.add = function(args, callback) {
  var that = this
    
    , files = args.files
    , dry_run = args.dry_run
    , subrepos = args.subrepos
    , include = args.include
    , exclude = args.exclude
    , cmd
    ;
  if (typeof(files) === "string") {
      files = [files];
  }

  cmd = driver.command_builder("add", files,
  {
      n:dry_run,
      S:subrepos,
      I:include,
      X:exclude,
  });
  that.hg_driver.run_structured_command(cmd,callback);
}
// This one calls the callback with a JSON object as the argument.
// this allows us to parse the output if need be.
Hg.prototype.addJSON = function(args, callback) {
  var that = this;
  that.add(args, function(code, out, err){
      callback(wrapper_object(code,out,err));
      });
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
Hg.prototype.clone = function(args, callback) {
  var that = this
    
    , source = args.source
    , dest = args.dest
    , branch = args.branch
    , updaterev = args.updaterev
    , revrange = args.revrange
    , cmd
    ;
    if (source === undefined) {
        source = process.cwd();
    }
    cmd = driver.command_builder('clone', [source, dest], {
        b:branch,
        u:updaterev,
        r:revrange,
    });
    that.hg_driver.run_structured_command(cmd,callback);
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
Hg.prototype.commit = function( args, callback) {
  var that = this
    
    , message = args.message
    , logfile = args.logfile
    , addremove = args.addremove
    , closebranch = args.closebranch
    , date = args.date
    , user = args.user
    , include = args.include
    , exclude = args.exclude
    ;
  if (! message && ! logfile) {
    throw Error("must provide message or logfile");
  } else if (message && logfile) {
    throw Error("cannot provide both message and logfile");
  }
  var cmd = driver.command_builder("commit",[],
    { debug: true
    , m    : message
    , A    : addremove
    , close_branch: closebranch
    , d    : date
    , u    : user
    , l    : logfile
    , I    : include
    , X    : exclude
    });
  that.hg_driver.run_structured_command(cmd, callback);
}
Hg.prototype.commitJSON = function(args, callback) {
    var that = this
      , wrapped_callback = function(code, out, err) {
        var result = wrapper_object(code, out, err);
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

            result.files = outputs;
            result.changeset_num = changeset_num;
            result.changeset_id = changeset_id;
            result.status = stat;
            dataLog('commitJSON',result, that);
            callback(result);
        } else if (err.length > 0) {
            // FIXME need to verify all the possible failure modes by looking at the mercurial code.
            // I wouldn't expect this to get done anytime soon.
            result.status = "error";
            callback(result);
        } else {
            throw Error("Unexpected return from mercurial. hg.js is broken! Please notify the devs. State: "
             + JSON.stringify(result));
        }
    };
    that.commit(args, wrapped_callback);
}

// TODO config
// TODO copy
// TODO diff
// TODO export
Hg.prototype.forget = function(args, callback) {
  var that = this
    , files = args.files
    , include = args.include
    , exclude = args.exclude
    , cmd
    ;
    if (typeof(files) === "string") {
        files = [files];
    }
    cmd = driver.command_builder("forget",files,{I:include,X:exclude});
    that.hg_driver.run_structured_command(cmd,callback);
}
// TODO forgetJSON


// TODO grep
// TODO heads
// TODO identity
// TODO import
/*
 * Incoming
 *
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
    var that = this
      , revrange = args.revrange
      , path = args.path
      , force = args.force
      , newest = args.newest
      , bundle = args.bundle
      , bookmarks = args.bookmarks
      , branch = args.branch
      , limit  = args.limit
      , nomerges = args.nomerges
      , subrepos = args.subrepos
      , cmd = driver.command_builder('incoming',path, {
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
        })
      ;

    that.hg_driver.run_structured_command(cmd,callback);
};

Hg.prototype.incomingJSON = function(args,callback) {
  var that = this
    , wrapped_callback = function(code,out,err) {
        var incoming_changes = []
          , lines = out.toString().trim().split('\n')
          , split_line
          , i
          , result = wrapper_object(code, out, err)
          ;
        if (lines[2] !== 'no changes found') {
            for (i = 2; i < lines.length; i++) {
                split_line = lines[i].split('\0');
                incoming_changes.push({
                    rev:split_line[0],
                    node:split_line[1],
                    tags:split_line[2],
                    branch:split_line[3],
                    author:split_line[4],
                    desc:split_line[5],
                });
            }
        }
        result.result = incoming_changes;
        dataLog('incomingJSON',result, that);
        callback(result);
    };
    that.incoming(args,wrapped_callback);
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
    die: function(that){return function(stdout){that.teardown}},     // merge is not prompting, but update is, but then it is not /really/ prompting...
    yes: function(stdout){return 'y';}, //not sure if this is appropriate
};
Hg.prototype.merge = function(args, callback) {
  var that = this
    , rev = args.rev
    , force = args.force
    , tool = args.tool
    , prompt_handler = args.prompt_handler
    , cmd
    ;
    if (prompt_handler === undefined) {
        prompt_handler = merge_handlers.die(that);
    }
    cmd = driver.cmdbuilder('merge',[],{r:rev,f:force,t:tool});
    that.hg_driver.run_structured_command(cmd,callback,prompt_handler);
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
  var that = this
    , revrange = args.revrange
    , path = args.path
    , force = args.force
    , newest = args.newest
    , bookmarks = args.bookmarks
    , branch = args.branch
    , limit = args.limit
    , nomerges = args.nomerges
    , subrepos = args.subrepos

    , cmd = driver.command_builder('outgoing',path, {
          template:'{rev}\\0{node}\\0{tags}\\0{branch}\\0{author}\\0{desc}\\n',
          r: revrange,
          f: force,
          n: newest,
          B: bookmarks,
          b: branch,
          S: subrepos,
          })
    ;
  that.hg_driver.run_structured_command(cmd,callback);
};
Hg.prototype.outgoingJSON = function(args, callback) {
    var that = this
      , wrapped_callback = function(code,out,err) {
        var outgoing_changes = []
          , lines = out.toString().trim().split('\n')
          , split_line
          , result = wrapper_object(code, out, err)
          ;
        if (lines[2] !== 'no changes found') {
            for (var i = 2; i < lines.length; i++) {
                split_line = lines[i].split('\0');
                outgoing_changes.push({
                    rev:split_line[0],
                    node:split_line[1],
                    tags:split_line[2],
                    branch:split_line[3],
                    author:split_line[4],
                    desc:split_line[5],
                });
            }
        }
        result.result = outgoing_changes;
        dataLog('outgoingJSON',result, that);
        callback(result);
    };
    that.outgoing(args, wrapped_callback);
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
    var that = this
      , source = args.source
      , rev = args.rev
      , update = args.update
      , force = args.force
      , bookmark = args.bookmark
      , branch = args.branch
      , ssh = args.ssh
      , remotecmd = args.remotecmd
      , insecure = args.insecure
      , tool = args.tool

      , cmd = driver.command_builder('pull',source,{
          r:rev,
          u:update,
          f:force,
          B:bookmark,
          b:branch,
          e:ssh,
          remotecmd:remotecmd,
          insecure:insecure,
          t:tool,
        })
      ;
    that.hg_driver.run_structured_command(cmd,callback);
}
Hg.prototype.pullJSON = function(args, callback) {
    var that = this
      , wrapped_callback = function(code, out, err) {
      var result = wrapper_object(code, out, err)
        , outputs
        , line
        , repo
        , changeset
        , notes
        ;
      if (code !== 0 || err.length > 0) {
          // FIXME need to verify all the possible failure modes by looking at the mercurial code.
          // I wouldn't expect this to get done anytime soon.
          callback(result);
      } else if (out.length > 0) {
          outputs = out.toString().trim().split("\n");
          line = outputs.shift();
          repo = /pulling from (.*)/.exec(line);
          while ((line = outputs.shift()).match(/(searching for changes)|(adding changesets)|(adding manifests)|(adding file changes)/)) {} // skip all these lines
          changeset = /added (\d+) changesets with (\d+) changes to (\d+) files( (.\d+) heads)?/.exec(line);
          if (! changeset) {
              outputs.unshift(line);
          }
          notes = outputs.join("\n");

          result.repo = repo[1];
          result.notes = notes;
          result.changeset_count = 0;
          result.changes_count = 0;
          result.changed_file_count = 0;
          result.changed_heads = 0;

          if (changeset) {
              result.changeset_count    = parseInt(changeset[1]);
              result.changes_count      = parseInt(changeset[2]);
              result.changed_file_count = parseInt(changeset[3]);
              if (changeset[5] !== undefined) {
                  result.changed_heads  = changeset[5];
              }
          }

          callback(result);

      } else {
          throw Error("Unexpected return from mercurial. hg.js is broken! Please notify the devs. State: "
           + JSON.stringify(wrapper_object(code,out,err)));
      }
    };
    that.pull(args,wrapped_callback);
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
    var that = this
      , dest = args.dest
      , rev = args.rev 
      , force = args.force 
      , bookmark = args.bookmark 
      , branch = args.branch 
      , newbranch = args.newbranch 
      , ssh = args.ssh 
      , remotecmd = args.remotecmd 
      , insecure = args.insecure
      , cmd
      ;

    if (! dest) {
        dest = [];
    }
    cmd = driver.command_builder('push', dest, {
        r:rev,
        f:force,
        B:bookmark,
        b:branch,
        new_branch:newbranch,
        e:ssh,
        remotecmd:remotecmd,
        insecure:insecure,
    });
    that.hg_driver.run_structured_command(cmd,callback);
}
Hg.prototype.pushJSON = function(args, callback) {
    var that = this
      , wrapped_callback = function(code, out, err) {
        var result = wrapper_object(code, out, err)
          , outputs
          , repo
          , auth
          , changeset
          ;
        if (code !== 0 || err.length > 0) {
            // FIXME need to verify all the possible failure modes by looking at the mercurial code.
            // I wouldn't expect this to get done anytime soon.
            result.pushed = false;
            callback(result);
        } else if (out.length > 0) {
            outputs = out.toString().trim().split("\n");
            dataLog('pushJSON',outputs, that);

            repo = outputs.shift();
            repo = /pushing to (.*)/.exec(repo);
            result.repo = repo[1];
            auth = outputs.pop();
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
    that.push(args,wrapped_callback);
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
Hg.prototype.status = function(args, callback) {
  var that = this
    , rev = args.rev
    , change = args.change
    , all = args.all
    , modified = args.modified
    , added = args.added
    , removed = args.removed
    , deleted = args.deleted
    , clean = args.clean
    , unknown = args.unknown
    , ignored = args.ignored
    , copies = args.copies
    , subrepos = args.subrepos
    , include = args.include
    , exclude = args.exclude
    , cmd
  ;
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
  that.hg_driver.run_structured_command(cmd,callback);
}
Hg.prototype.statusJSON = function(args, callback) {
    var that = this
      , wrapped_callback = function(code, out, err) {
      var result = wrapper_object(code, out, err)
        , outputs
        , modified = []
        , added = []
        , removed = []
        , clean = []
        , missing = []
        , untracked = []
        , ignored = []
        ;

        if (code !== 0 || err.length > 0) {
            // FIXME need to verify all the possible failure modes by looking at the mercurial code.
            // I wouldn't expect this to get done anytime soon.
            callback(result);
        } else if (out.length >= 0) {
            outputs = out.toString().trim().split("\n");

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
            result.modified = modified;
            result.added = added;
            result.removed = removed;
            result.clean = clean;
            result.missing = missing;
            result.untracked = untracked;
            result.ignored = ignored;

            dataLog('statusJSON',result, that);
            callback(result);
        } else {
            throw Error("Unexpected return from mercurial. hg.js is broken! Please notify the devs. State: "
             + JSON.stringify(result));
        }
    };
    that.status(args, wrapped_callback);
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
Hg.prototype.update = function(args, callback) {
  var that = this
    , rev = args.rev
    , clean = args.clean
    , check = args.check
    , date = args.date
    , cmd = driver.command_builder('update',null,{
        r:rev,
        C:clean,
        c:check,
        d:date,
    });
    that.hg_driver.run_structured_command(cmd,callback);
}
Hg.prototype.updateJSON = function(args, callback) {
    var that = this
      , wrapped_callback = function(code,out,err){
          var result = wrapper_object(code, out, err)
            , outv
            , merged_files
            , line
            , summary
            , message
            ;
          if ((code !== 0 && code !== 1) || err.length > 0) {
              // FIXME need to verify all the possible failure modes by looking at the mercurial code.
              // I wouldn't expect this to get done anytime soon.
              callback(result);
          } else if (out.length > 0) {
              outv = out.trim().split("\n");
              merged_files = [];
              while ((line = outv.shift()).match(/merging .*/)) {
                  merged_files.push(/merging (.*)/.exec(line)[1]);
              }
              summary = /(\d+) files updated, (\d+) files merged, (\d+) files removed, (\d+) files unresolved/.exec(line);
              message = outv.join("\n");

              result.updated = parseInt(summary[1]);
              result.merged  = parseInt(summary[2]);
              result.removed = parseInt(summary[3]);
              result.unresolved = parseInt(summary[4]);
              result.merged_files = merged_files;
              result.message = message;
              callback(result);
          } else {
              throw Error("Unexpected return from mercurial. hg.js is broken! Please notify the devs. State: "
               + JSON.stringify(result));
          }
        }
    ;
    that.update(args, wrapped_callback);
}
// TODO version
