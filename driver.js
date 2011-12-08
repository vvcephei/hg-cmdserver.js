// NOTE about this file: This is a "low level" driver for the "hg serve --cmdserver pipe" api. 
// You probably don't want to use it, unless I haven't implemented some hg command in hg.js
// If that's the case, I'd like for you to let me know or send me a pull request if you do it yourself.

var hg;
var teardown_callback;
exports.setup = function(working_directory){
    hg = spawn('hg', ['serve', '--cmdserver','pipe'], {cwd:working_directory});
    teardown_callback = function(){};
    hg.stdout.on('data', stdout_listener);
    hg.stderr.on('data', stderr_listener);
    hg.on('exit', exit_listener);
};
exports.teardown = function(callback){
    teardown_callback = callback;
    hg.stdin.end();
};
function stderr_listener(data) {
    console.log('ps stderr: ' + data);
}

function exit_listener(code) {
    console.log('hg process exited with code ' + code);
    teardown_callback();
    hg = undefined;
}

var debug = false;
var util  = require('util');

// FIXME: need to specify the cwd with an argument to this module, somehow
var spawn = require('child_process').spawn;

var result_printer = function(code,out){
            console.log('get_encoding:\n  |code:<<<'+code+'>>>\n  |out:<<<'+out+'>>>');
            console.log(out);
        };

// could do this with arbitrary #s of args TODO
function buffer_concat(buffer0, buffer1){
    var buffer = new Buffer(buffer0.length + buffer1.length);
    buffer0.copy(buffer);
    buffer1.copy(buffer,buffer0.length);
    return buffer;
}

var buffered_input = new Buffer(0);
function read_packet() {
    if (buffered_input.length < 5) {
        return false;
    }

    var length  = buffered_input.readUInt32BE(1);
    var data_offset  = 5;

    if (buffered_input.length >= data_offset+length) {
        var packet = {
            channel : buffered_input.toString('utf8',0,1),
            length  : length,
            data    : buffered_input.slice(data_offset,length+data_offset),
        };
        buffered_input = buffered_input.slice(length+data_offset);
    } else {
        // then we didn't get the whole message. just continue buffering.
        return false;
    }
    if (debug)
        console.log(packet);
    return packet;
}

var hello = false;
function parse_hello(packet) {
    hello = {};
    var hello_arr = packet.data.toString('utf8').split(/\n/);
    hello_arr.forEach(function(val,index,array){
        var result = /\s*([^:\s]*):\s*(.*)/.exec(val);
        switch(result[1]) {
            case "capabilities":
                hello.capabilities = result[2].trim().split(/\s+/);
                break;
            case "encoding":
                hello.encoding     = result[2].trim();
                break;
            default:
        }
    });
    if (debug)
        console.log(hello);
}


function stdout_listener(input){
    if (debug) {
        console.log('\n--------------------');
        console.log('incoming:');
        console.log(input);
    }
    buffered_input = buffer_concat(buffered_input,input);

    var packet;
    while (packet = read_packet()) {
        if (! hello ) {
            parse_hello(packet);
        } else {
            // now, we can get down to business
            switch(packet.channel) {
                case 'o':
                    // output channel
                    buffered_output = buffer_concat(buffered_output, packet.data);
                    //console.log("output: "+packet.data);
                    break;
                case 'e':
                    // error channel
                    buffered_error = buffer_concat(buffered_error, packet.data);
                    //console.log("Error: "+packet.data);
                    break;
                case 'r':
                    // result channel
                    if (command_callback)
                        command_callback(parse_exit_code(packet.data), buffered_output, buffered_error);
                    //console.log("result: "+parse_exit_code(packet.data));
                    break;
                case 'd':
                    // debug channel
                    console.log("DEBUG: "+packet.data);
                    break;
                case 'I':
                    // Input channel
                    // - length field tells client how many bytes to send
                    console.log("input: "+packet.length);
                    break;
                case 'L':
                    // Line-based input channel
                    // - length is max number of bytes.
                    // - client should send one line (\n terminated)
                    console.log("lineinput: "+packet.length);
                    break;
                default:
                    // Unexpected input!
                    process.exit(1);
            }
        }
    }
}


var buffered_output = new Buffer(0);
var buffered_error  = new Buffer(0);
var command_callback;
var parse_exit_code;
function run_command(argv, callback) {
    hg.stdin.write("runcommand\n");
    var length = new Buffer(4);
    length.writeUInt32BE(argv.length,0);
    //console.log(length);
    hg.stdin.write(length);
    hg.stdin.write(argv);
    parse_exit_code = function(numbuf){return numbuf.readUInt32BE(0);};
    buffered_output = new Buffer(0);
    buffered_error = new Buffer(0);
    command_callback= callback;
}
function get_encoding(callback) {
    hg.stdin.write("getencoding\n");
    parse_exit_code = function(numbuf){return numbuf.toString('utf8',0);};
    buffered_output = new Buffer(0);
    buffered_error = new Buffer(0);
    command_callback= callback;
}

function command_builder(command, args, kwargs) {
    var result = [command];
    if (kwargs) {
        if (kwargs.keys === undefined) {
            throw new TypeError("kwargs must have a 'keys' property");
        }
        kwargs.keys.forEach(function(item,index,array){
            val = kwargs[item];
            if (val !== undefined){
                arg = item.replace("_","-");
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
        args.forEach(function(val,index,array){
            result.push(val);
        });
    }
    return result;
}

function run_structured_command(args, callback) {
    run_command(args.join('\u0000'),
        callback);
}

exports.run_command = run_command;
exports.get_encoding= get_encoding;
exports.command_builder = command_builder;
exports.run_structured_command = run_structured_command;

