var hg = require('../');
hg.setup({cwd:'/home/john/test/checkout'});

function exit0(test){
    return function(code,out,err){
        test.strictEqual(code,0,""+code+" "+out+" "+err);
        test.done();
    };
};

exports.public_fns = {

    forget: function(test) {
        test.expect(0);
        hg.forget("test test2 test3".split(" "),function(c,o,e){test.done()});
    },
    commit0:function(test) {
        test.expect(0);
        hg.commit('cleanup',function(c,o,e){test.done()})
    },
    addList: function(test) {
        test.expect(1);
        hg.add(['test2'],exit0(test));
    },
    commit1:function(test){
        test.expect(2);
        hg.commit('commit message',function(code,out,err){
            test.strictEqual(code,0);
            test.ok(out.toString().match(/test2\ncommitted changeset \d+:.*/));
            test.done();
        });
    },
    addFileJSON: function(test) {
        test.expect(1);
        hg.addJSON('test',function(obj){
            test.strictEqual(obj.code,0,JSON.stringify(obj));
            test.done();
        });
    },
    addAllJSON: function(test) {
        test.expect(2);
        hg.addJSON([],function(obj){
            test.strictEqual(obj.code,0,JSON.stringify(obj));
            test.strictEqual(obj.out,'adding test3\n');
            test.done();
        });
    },
    commitJSON: function(test) {
        test.expect(4);
        hg.commitJSON('asdf',function(obj){
            var str = JSON.stringify(obj);
            test.strictEqual(obj.code,0,str);
            test.deepEqual(obj.files,['test','test3']);
            test.ok(obj.changeset_num.match(/\d+/));
            test.ok(obj.changeset_id.match(/(\d|\w)+/));
            test.done();
        });
    },
    commitJSONEmpty: function(test) {
        test.expect(2);
        hg.commitJSON('asdf',function(obj){
            var str = JSON.stringify(obj);
            test.strictEqual(obj.code,1,str);
            test.strictEqual(obj.out,'nothing changed');
            test.done();
        });
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
        hg.forget("test test2 test3".split(" "),function(c,o,e){
            hg.commit('cleanup',function(c,o,e){test.done()});
            });
    },

    pushJSON: function(test) {
        test.expect(6);
        hg.pushJSON(function(obj){
            test.strictEqual(obj.code,0);
            test.strictEqual(obj.err,'');
            test.strictEqual(obj.repo,'/home/john/test/repo');
            test.strictEqual(typeof(obj.changeset_count),"number");
            test.strictEqual(typeof(obj.changes_count),"number");
            test.strictEqual(typeof(obj.changed_file_count),"number");
            test.done();
        });
    },

    tearDownDriver: function(test) {
        test.expect(0);
        hg.teardown(test.done);
    },
};
