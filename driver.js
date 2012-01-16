// NOTE about this file: This is a "low level" driver for the "hg serve --cmdserver pipe" api. 
// You probably don't want to use it, unless I haven't implemented some hg command in hg.js
// If that's the case, I'd like for you to let me know or send me a pull request if you do it yourself.

// TODO refactor this so that setup is a factory method a la express.

var Hash = require('hashish');
var spawn = require('child_process').spawn;
var buffertools = require('buffertools');

function Driver(cwd,debug_driver){

    this.debug_driver = debug_driver;
    this.hello = false;
    this.cwd   = cwd;
    this.teardown_cb = function(){};
    this.buffered_input = new Buffer(0);
    this.buffered_output = new Buffer(0);
    this.buffered_error  = new Buffer(0);
    this.command_callback;
    this.parse_exit_code;
    this.hg_proc = spawn('hg', ['serve', '--cmdserver','pipe'], {cwd:cwd});

    var thisobj = this;
    this.hg_proc.on('exit',function(exit_code){
        thisobj.teardown_cb(exit_code);
        thisobj.hg_proc = null;
    });
    this.hg_proc.stderr.on('data', function(data){
        console.log("hg_cmdserv stderr: "+data);
    });
    this.hg_proc.stdout.on('data', get_stdout_listener(this));
}

Driver.prototype.teardown = function(cb) {
    if (this.hg_proc) {
        this.teardown_cb = cb;
        this.hg_proc.stdin.end();
    } else {
        cb(0);
    }
};

Driver.prototype.read_packet = function() {
    if (this.buffered_input.length < 5) {
        return false;
    }

    var length  = this.buffered_input.readUInt32BE(1);
    var data_offset  = 5;

    if (this.buffered_input.length >= data_offset+length) {
        var packet = {
            channel : this.buffered_input.toString('utf8',0,1),
            length  : length,
            data    : this.buffered_input.slice(data_offset,length+data_offset),
        };
        this.buffered_input = this.buffered_input.slice(length+data_offset);
    } else {
        // then we didn't get the whole message. just continue buffering.
        return false;
    }
    if (this.debug_driver)
        console.log(packet);
    return packet;
};

function parse_hello (obj,packet) {
    obj.hello = {cwd:obj.cwd};
    var hello_arr = packet.data.toString('utf8').split(/\n/);
    hello_arr.forEach(function(val,index,array){
        var result = /\s*([^:\s]*):\s*(.*)/.exec(val);
        switch(result[1]) {
            case "capabilities":
                obj.hello.capabilities = result[2].trim().split(/\s+/);
                break;
            case "encoding":
                obj.hello.encoding     = result[2].trim();
                break;
            default: // ignore everything else
        }
    });
    if (obj.debug_driver)
        console.log(obj.hello);
};


function get_stdout_listener(obj) {
    return function(input) {
        if (obj.debug_driver) {
            console.log('\n--------------------');
            console.log('incoming:');
            console.log(input);
        }
        obj.buffered_input = buffertools.concat(obj.buffered_input,input);

        var packet;
        while (packet = obj.read_packet()) {

            if (! obj.hello ) {
                parse_hello(obj,packet);
            } else {
                // now, we can get down to business
                switch(packet.channel) {
                    case 'o':
                        // output channel
                        obj.buffered_output = buffertools.concat(obj.buffered_output, packet.data);
                        //console.log("output: "+packet.data);
                        break;
                    case 'e':
                        // error channel
                        obj.buffered_error = buffertools.concat(obj.buffered_error, packet.data);
                        //console.log("Error: "+packet.data);
                        break;
                    case 'r':
                        // result channel
                        if (obj.command_callback)
                            obj.command_callback(
                                obj.parse_exit_code(packet.data),
                                obj.buffered_output.toString(),
                                obj.buffered_error.toString());
                        //console.log("result: "+parse_exit_code(packet.data));
                        break;
                    case 'd':
                        // debug channel
                        console.log("DEBUG: "+packet.data);
                        throw Error();
                        break;
                    case 'I':
                        // Input channel
                        // - length field tells client how many bytes to send
                        console.log("input: "+packet.length);
                        throw Error();
                        break;
                    case 'L':
                        // Line-based input channel
                        // - length is max number of bytes.
                        // - client should send one line (\n terminated)
                        console.log("lineinput: "+packet.length);
                        throw Error();
                        break;
                    default:
                        // Unexpected input! the documentation says that clients should terminate
                        // on obj condition.
                        throw Error("hg driver: unexpected input");
                }
            }
        }
    };
}


Driver.prototype.run_command = function(arg_str, callback) {
    this.hg_proc.stdin.write("runcommand\n");
    var length = new Buffer(4);
    length.writeUInt32BE(arg_str.length,0);
    //console.log(length);
    this.hg_proc.stdin.write(length);
    this.hg_proc.stdin.write(arg_str);
    this.parse_exit_code = function(numbuf){return numbuf.readUInt32BE(0);};
    this.buffered_output = new Buffer(0);
    this.buffered_error = new Buffer(0);
    this.command_callback= callback;
}
Driver.prototype.get_encoding = function(callback) {
    this.hg_proc.stdin.write("getencoding\n");
    this.parse_exit_code = function(numbuf){return numbuf.toString('utf8',0);};
    this.buffered_output = new Buffer(0);
    this.buffered_error = new Buffer(0);
    this.command_callback= callback;
}

function command_builder(command, args, kwargs) {
    var result = [command];
    if (kwargs) {
        Hash(kwargs).forEach(function(val,key){
            if (val !== undefined){
                arg = key.replace("_","-");
                if (arg !== "-") {
                    if (arg.length === 1)
                        arg = '-' + arg
                    else
                        arg = '--' + arg
                }
                if (val === false || val === undefined) {
                } else if (val === true) {
                    result.push(arg);
                } else if (val instanceof Array) {
                    val.forEach(function(item){
                        result.push(arg);
                        result.push(''+item);
                    });
                } else {
                    result.push(arg);
                    result.push(''+val);
                }
            }
        });
    }
    if (args) {
        if (args.forEach) {
            args.forEach(function(val,index,array){
                result.push(val);
            });
        } else {
            result.push(args);
        }
    }
    return result;
}

Driver.prototype.run_structured_command = function(args, callback, prompt_callback) {
    this.run_command(args.join('\u0000'),
        callback);
}

Driver.prototype.command_builder = command_builder;
exports.command_builder = command_builder;

exports.get_driver = function(config_obj){
    return new Driver(config_obj.cwd, config_obj.debug_driver);
}
