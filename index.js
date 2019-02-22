const path = require('path');
const StreamDeck = require('elgato-stream-deck');

// Automatically discovers connected Stream Decks, and attaches to the first one.
// Throws if there are no connected stream decks.
// You also have the option of providing the devicePath yourself as the first argument to the constructor.
// For example: const myStreamDeck = new StreamDeck('\\\\?\\hid#vid_05f3&pid_0405&mi_00#7&56cf813&0&0000#{4d1e55b2-f16f-11cf-88cb-001111000030}')
// Device paths can be obtained via node-hid: https://github.com/node-hid/node-hid
const myStreamDeck = new StreamDeck();

var binds = [
	"echo first bind!",
	"echo second bind!",
	"echo third bind!",
	"echo its four,maybe enough...?"
	
	//
	// you can bind some commands here
	// e.g.
	// "spec_goto 0 0 0 0 0;spec_lerpto 10 10 10 10 10 2 2"
	// 
]
myStreamDeck.on('down', keyIndex => {
	//console.log('key %d down', keyIndex);
	//ws.send(new Uint8Array(Buffer.from('exec\0'+ "echo StreamDeck key " + keyIndex + " Pressed" +'\0','utf8')),{binary: true});
	if(ws){
		ws.send(new Uint8Array(Buffer.from('exec\0'+ binds[keyIndex] +'\0','utf8')),{binary: true});
		console.log('executed command : %s', binds[keyIndex]);
	}
	else{
		console.log("Please link csgo client first");
	}
});

myStreamDeck.on('up', keyIndex => {
	console.log('key %d up', keyIndex);
});

// Fired whenever an error is detected by the `node-hid` library.
// Always add a listener for this event! If you don't, errors will be silently dropped.
myStreamDeck.on('error', error => {
	console.error(error);
});

"use strict"; // http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/

var readline = require('readline')
  , events = require('events')
  , util = require('util')
  , WebSocketServer = require('ws').Server
  , http = require('http');

function Console() {
  if (!(this instanceof Console)) return new Console();

  this.stdin = process.stdin;
  this.stdout = process.stdout;

  this.readlineInterface = readline.createInterface(this.stdin, this.stdout);

  var self = this;

  this.readlineInterface.on('line', function line(data) {
    self.emit('line', data);
  }).on('close', function close() {
    self.emit('close');
  });
}

util.inherits(Console, events.EventEmitter);

Console.prototype.print = function print(msg) {
   this.stdout.write(msg + '\n');
};

var ws = null;
var wsConsole = new Console();
var server = http.createServer();
var wss = new WebSocketServer({server: server, path: '/mirv'});

wsConsole.on('close', function close() {
  if (ws) ws.close();
  process.exit(0);
});

wsConsole.on('line', function line(data) {
  if (ws) {
    ws.send(new Uint8Array(Buffer.from('exec\0'+data.trim()+'\0','utf8')),{binary: true});
  }
});

wss.on('connection', function(newWs) {
	if(ws)
	{
		ws.close();
		ws = newWs;
	}
	
	ws = newWs;
    
	wsConsole.print('/mirv	 connected');
	
    ws.on('message', function(data) {
        if (data instanceof Buffer)
		{
			var buffer = Buffer.from(data);
			var idx = 0;
			while(idx < buffer.length)
			{
				function findDelim(buffer,idx)
				{
					var delim = -1;
					for(var i = idx; i < buffer.length; ++i)
					{
						if(0 == buffer[i])
						{
							delim = i;
							break;
						}
					}
					
					return delim;
				}
				
				var delim = findDelim(buffer,idx);
				
				try
				{
					if(idx <= delim)
					{
						var cmd = buffer.toString('utf8',idx,delim);
						idx = delim + 1;
						wsConsole.print(cmd);
						switch(cmd)
						{
						case 'hello':
							if(4 <= buffer.length -idx)
							{
								var version = buffer.readUInt32LE(idx);
								wsConsole.print('version = '+version);
								idx += 4;
								if(2 == version)
									continue;
							}
							break;
						case 'dataStart':
							continue;
							break;
						case 'dataStop':
							continue;
							break;
						case 'levelInit':
							{
								var delim = findDelim(buffer, idx);
								if(idx <= delim)
								{
									var map = buffer.toString('utf8',idx,delim);
									wsConsole.print('map = '+map);
									idx = delim + 1;
									continue;
								}
							}
							break;
						case 'levelShutdown':
							continue;
							break;
						case 'cam':
							if(8*4 <= buffer.length -idx)
							{
								var time = buffer.readFloatLE(idx);
								wsConsole.print('time = '+time);
								idx += 4;
								var xPosition = buffer.readFloatLE(idx);
								wsConsole.print('xPosition = '+xPosition);
								idx += 4;
								var yPosition = buffer.readFloatLE(idx);
								wsConsole.print('yPosition = '+yPosition);
								idx += 4;
								var zPosition = buffer.readFloatLE(idx);
								wsConsole.print('zPosition = '+zPosition);
								idx += 4;
								var xRotation = buffer.readFloatLE(idx);
								wsConsole.print('xRotation = '+xRotation);
								idx += 4;
								var yRotation = buffer.readFloatLE(idx);
								wsConsole.print('yRotation = '+yRotation);
								idx += 4;
								var zRotation = buffer.readFloatLE(idx);
								wsConsole.print('zRotation = '+zRotation);
								idx += 4;
								var fov = buffer.readFloatLE(idx);
								wsConsole.print('fov = '+fov);
								idx += 4;
								continue;
							}
							break;
						}
					}
				}
				catch(err)
				{
					wsConsole.print('Error: '+err+'.');
				}
			
				wsConsole.print('Error: Invalid data received at index '+idx+'.');
				break;
			}
		}
    });
    ws.on('close', function() {
      wsConsole.print('Connection closed!');
    });
    ws.on('error', function(e) {
    });
});
server.listen(31337);
wsConsole.print('Listening on port 31337, path /mirv ...');