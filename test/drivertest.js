var driver = require('../driver.js');
driver.setup('/home/john/test/checkout');


exports.driver = {

    'test command_builder simple0' : function(test) {
        test.expect(1);
        test.deepEqual(
            driver.command_builder('testcmd'),
            ['testcmd']
            );
        test.done();
    },

    'test command_builder Fail:keys' : function(test) {
        test.expect(1);
        test.throws(
            function(){driver.command_builder(
                'testcmd',
                ['file1','file2'],
                {a:'optA',t:true,f:false,tru:true,fal:false,u:undefined,undef:undefined,another:'anotherOption',list:['a','b','c']});},
            Error
            );
        test.done();
    },

    'test command_builder' : function(test) {
        test.expect(1);
        test.deepEqual(
            driver.command_builder(
                'testcmd',
                ['file1','file2'],
                {a:'optA',t:true,f:false,tru:true,fal:false,u:undefined,undef:undefined,another:'anotherOption',list:['a','b','c'],
                 keys: "a t f tru fal u undef another list".split(" ")}),
            ['testcmd','-a','optA','-t','--tru','--another','anotherOption','--list','a','--list','b','--list','c', 'file1','file2']
            );
        test.done();
    },

    tearDownDriver: function(test) {
        test.expect(0);
        driver.teardown(test.done);
    },
};
