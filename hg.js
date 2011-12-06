var util  = require('util'),
    spawn = require('child_process').spawn,
    hg    = spawn('hg', ['serve', '--cmdserver','pipe']);


var script = [
    get_encoding,
    function(){run_command("summary")},
]

var buffered_input = new Buffer(0);
function append_input(input) {
    var buffer = new Buffer(buffered_input.length+input.length);
    buffered_input.copy(buffer);
    input.copy(buffer,buffered_input.length);
    buffered_input = buffer;
}
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
        var packet = {
            incomplete : true,
        };
    }
    console.log(packet);
    return packet;
}


var hello_read = false;
hg.stdout.on('data', function (input) {
    console.log('\n------------------------');
    console.log('incoming:');
    console.log(input);
    append_input(input);

    var packet;
    while (packet = read_packet()) {
        if (packet.incomplete) {
            // we already saved the partial input. just wait for the next stdin event
            return;
        }
        if (! hello_read ) {
            // TODO: pay attention to capabilities and encoding
            console.log("hello: "+packet.channel+","+packet.length+","+packet.data+"\n");
            hello_read = true;
        } else {
            // now, we can get down to business
            switch(packet.channel) {
                case 'o':
                    // output channel
                    console.log("output: "+packet.data);
                    break;
                case 'e':
                    // error channel
                    console.log("Error: "+packet.data);
                    break;
                case 'r':
                    // result channel
                    console.log("result: "+parse_exit_code(packet.data));
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
                    var x = null;
            }
        }
        if (script.length > 0) {
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

var parse_exit_code;
function run_command(argv) {
    hg.stdin.write("runcommand\n");
    var length = new Buffer(4);
    length.writeUInt32BE(argv.length,0);
    //console.log(length);
    hg.stdin.write(length);
    hg.stdin.write(argv);
    parse_exit_code = function(numbuf){return numbuf.readUInt32BE(0);};
}
function get_encoding() {
    hg.stdin.write("getencoding\n");
    parse_exit_code = function(numbuf){return numbuf.toString('utf8',0);};
}

