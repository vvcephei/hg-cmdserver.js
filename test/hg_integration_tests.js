var hg = require('../');

function exit0(test){
    return function(code,out,err){
        test.strictEqual(code,0,""+code+" "+out+" "+err);
        test.done();
    };
};

exports.checkout = {
    setupDriver: function(test){
        test.expect(0);
        hg.setup({cwd:'/home/john/test/checkout'});
        test.done();
    },

    forget: function(test) {
        test.expect(0);
        hg.forget(function(c,o,e){test.done()},"test test2 test3".split(" "));
    },
    commit0:function(test) {
        test.expect(0);
        hg.commit(function(c,o,e){test.done()},"commit")
    },
    addList: function(test) {
        test.expect(1);
        hg.add(exit0(test),['test2']);
    },
    commit1:function(test){
        test.expect(2);
        hg.commit(function(code,out,err){
            test.strictEqual(code,0);
            test.ok(out.toString().match(/test2\ncommitted changeset \d+:.*/));
            test.done();
        },
        "commit message");
    },
    addFileJSON: function(test) {
        test.expect(1);
        hg.addJSON(function(obj){
            test.strictEqual(obj.code,0,JSON.stringify(obj));
            test.done();
        },'test');
    },
    addAllJSON: function(test) {
        test.expect(2);
        hg.addJSON(function(obj){
            test.strictEqual(obj.code,0,JSON.stringify(obj));
            test.strictEqual(obj.out,'adding test3\n');
            test.done();
        },[]);
    },
    commitJSON: function(test) {
        test.expect(4);
        hg.commitJSON(function(obj){
            var str = JSON.stringify(obj);
            test.strictEqual(obj.code,0,str);
            test.deepEqual(obj.files,['test','test3']);
            test.strictEqual(typeof(obj.changeset_num),"number");
            test.ok(obj.changeset_id.match(/(\d|\w)+/));
            test.done();
        },
        'asdf');
    },
    commitJSONEmpty: function(test) {
        test.expect(2);
        hg.commitJSON(function(obj){
            var str = JSON.stringify(obj);
            test.strictEqual(obj.code,1,str);
            test.strictEqual(obj.out,'nothing changed');
            test.done();
        },
        'asdf');
    },
    push: function(test) {
        test.expect(1);
        hg.push(function(c,o,e){
            test.strictEqual(c,0);
            test.done();
        });
    },

    forgetAgain: function(test) {
        test.expect(0);
        hg.forget(function(c,o,e){
            hg.commit(function(c,o,e){test.done()},'cleanup');
            },
            "test test2 test3".split(" "));
    },

    pushJSON: function(test) {
        test.expect(7);
        hg.add(function(c,o,e){
            hg.commit(function(c,o,e) {
                hg.pushJSON(function(obj){
                    test.strictEqual(obj.code,0);
                    test.strictEqual(obj.err,'');
                    test.strictEqual(obj.repo,'/home/john/test/repo');
                    test.strictEqual(typeof(obj.changeset_count),"number");
                    test.strictEqual(typeof(obj.changes_count),"number");
                    test.strictEqual(typeof(obj.changed_file_count),"number");
                    test.strictEqual(obj.changed_file_count,0);
                    test.done();
                });
            },'re-adding test3');
        },'test3');
    },

    tearDownDriver: function(test) {
        test.expect(1);
        hg.teardown(function(exit_code){
            test.strictEqual(exit_code,0);
            test.done();
        });
    },
};

exports.checkout2 = {
    setupDriver: function(test){
        test.expect(0);
        hg.setup({cwd:'/home/john/test/checkout2'});
        test.done();
    },
    pullJSON: function(test){
        test.expect(7);
        hg.pullJSON(function(obj){
            test.strictEqual(obj.code,0);
            test.strictEqual(obj.err,'');
            test.strictEqual(obj.repo,'/home/john/test/repo');
            test.strictEqual(typeof(obj.changeset_count),"number");
            test.strictEqual(typeof(obj.changes_count),"number");
            test.strictEqual(typeof(obj.changed_file_count),"number");
            test.strictEqual(obj.changed_file_count,0);
            test.done();
        });
    },
    'pullJSON again': function(test){
        test.expect(7);
        hg.pullJSON(function(obj){
            test.strictEqual(obj.code,0);
            test.strictEqual(obj.err,'');
            test.strictEqual(obj.repo,'/home/john/test/repo');
            test.strictEqual(typeof(obj.changeset_count),"number");
            test.strictEqual(typeof(obj.changes_count),"number");
            test.strictEqual(typeof(obj.changed_file_count),"number");
            test.strictEqual(obj.changed_file_count,0);
            test.done();
        });
    },
    updateJSON: function(test){
        test.expect(9);
        hg.updateJSON(function(obj){
            test.strictEqual(obj.code,0);
            test.strictEqual(obj.err,'');
            test.strictEqual(obj.message,'');
            test.strictEqual(obj.updated,0);
            test.strictEqual(obj.merged,0);
            test.strictEqual(obj.removed,0);
            test.strictEqual(obj.unresolved,0);
            test.strictEqual(obj.merged_files.length,0);
            test.ok(obj.merged_files instanceof Array);
            test.done();
        });
    },
    tearDownDriver: function(test) {
        test.expect(1);
        hg.teardown(function(exit_code){
            test.strictEqual(exit_code,0);
            test.done();
        });
    },
};
