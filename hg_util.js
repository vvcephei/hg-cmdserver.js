var debug = false;
var util  = require('util');

var spawn = require('child_process').spawn,
    hg    = spawn('hg', ['serve', '--cmdserver','pipe'], {cwd:process.argv[2]});

var result_printer = function(code,out){
            console.log('get_encoding:\n  |code:<<<'+code+'>>>\n  |out:<<<'+out+'>>>');
            console.log(out);
        };
if (require.main === module) {
    var script = [
        function(){get_encoding(result_printer)},
        //function(){run_command("summary", result_printer)},
    ];
}

// could do this with arbitrary #s of args TODO
function buffer_concat(buffer0, buffer1){
    var buffer = new Buffer(buffer0.length + buffer1.length);
    buffer0.copy(buffer);
    buffer1.copy(buffer,buffer0.length);
    return buffer;
}

var buffered_input = new Buffer(0);
function read_packet() {
    if (buffered_input.length === 0) {
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


hg.stdout.on('data', function (input) {
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
                    console.log("Error: "+packet.data);
                    break;
                case 'r':
                    // result channel
                    command_callback(parse_exit_code(packet.data), buffered_output);
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
        if (require.main === module && script.length > 0) { // debug code
            script.shift()();
        }
    }
});

hg.stderr.on('data', function (data) {
  console.log('ps stderr: ' + data);
});

hg.on('exit', function (code) {
  if (code !== 0) {
    console.log('hg process exited with code ' + code);
  }
});

var buffered_output = new Buffer(0);
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
    command_callback= callback;
}
function get_encoding(callback) {
    hg.stdin.write("getencoding\n");
    parse_exit_code = function(numbuf){return numbuf.toString('utf8',0);};
    buffered_output = new Buffer(0);
    command_callback= callback;
}

exports.run_command = run_command;
exports.get_encoding= get_encoding;
