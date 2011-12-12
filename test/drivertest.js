var driver = require('../driver.js');

exports.driver = {

    'test command_builder simple0' : function(test) {
        test.expect(1);
        test.deepEqual(
            driver.command_builder('testcmd'),
            ['testcmd']
            );
        test.done();
    },

    'test command_builder' : function(test) {
        test.expect(1);
        test.deepEqual(
            driver.command_builder(
                'testcmd',
                ['file1','file2'],
                {a:'optA',t:true,f:false,tru:true,fal:false,u:undefined,undef:undefined,another:'anotherOption',list:['a','b','c']}),
            ['testcmd','-a','optA','-t','--tru','--another','anotherOption','--list','a','--list','b','--list','c', 'file1','file2']
            );
        test.done();
    },
};
