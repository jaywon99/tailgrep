// npm install express socket.io
var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , fs = require('fs')
  , Tail = require('tail').Tail;

server.listen(8989);

app.configure(function(){
  app.use(express.static(__dirname + '/public'));
});

/*
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
*/

// read last jackpot score from db
var jackpot = 0;

function CircularBuffer(size) {
  return {
    size: size,
    buffer: new Array(size),
    head: 0,
    append: function(data) {
        this.buffer[this.head++] = data;
        this.head = this.head % this.size;
    },
    each: function(callback) {
        tail = this.head;
        do {
            if (this.buffer[this.head] !== undefined) {
                callback(this.buffer[this.head]);
            }
            this.head = (this.head + 1) % size;
        } while (this.head != tail);
    }
  };
}

function readLines(input, func, callback) {
  var remaining = '';

  input.on('data', function(data) {
    remaining += data;
    var index = remaining.indexOf('\n');
    var last  = 0;
    while (index > -1) {
      var line = remaining.substring(last, index);
      last = index + 1;
      func(line);
      index = remaining.indexOf('\n', last);
    }

    remaining = remaining.substring(last);
  });

  input.on('end', function() {
    if (remaining.length > 0) {
      func(remaining);
    }
    callback();
  });
}

// io.set('log level', 3);
io.sockets.on('connection', function(client) {
    client.on('tailgrep', function(options) {

        console.log("Execute");
        console.log(options);
        var regex;
        var negateOption = false;
        var keepChecking = false;
        for (var o in options.tail.options) {
            if (options.tail.options[o] === "-f") keepChecking = true;
        }

        if (options.grep !== undefined) {
            var wordonly = false;
            var regfilter = "g";
            for (var o in options.grep.options) {
                if (options.grep.options[o] === "-i") regfilter += "i";
                if (options.grep.options[o] === "-W") wordonly = true;
                if (options.grep.options[o] === "-v") negateOption = true;
            }
            if (wordonly) {
                regex = RegExp("((?:^|\\W)"+options.grep.regex+"(?:\\W|$))",regfilter);
            } else {
                regex = RegExp("("+options.grep.regex+")", regfilter);
            }
        }

        var lineNo = 0;

        var filterLine = function(line) {
                lineNo++;
                if (regex === undefined) {
                    client.emit('line', {lineno: lineNo, msg: line} );
                } else {
                    if (line.match(regex)) {
                        var newline = line.replace(regex, "{{{\$1}}}");
                        if (!negateOption) client.emit('line', {lineno: lineNo, msg: newline} );
                    } else {
                        if (negateOption) client.emit('line', {lineno: lineNo, msg: line} );
                    }
                }
            };

        var doTail = function() {
            if (keepChecking) {
                try {
                    var tail = new Tail( options.tail.filename );
                    client.set("fd", tail);
                    tail.on("line", filterLine);
                } catch (err) {
                    console.log(err);
                    client.emit('line', {lineno: -1, msg: err.toString()} );
                }
            } else {
                // client.emit('disconnect');
            }
        };

        if (options.tail.line === "" || options.tail.line === "0") {
            doTail();
        } else if (options.tail.line === '-1') {
            var input = fs.createReadStream( options.tail.filename );
            input.on("error", function(err) {
                console.log(err);
                client.emit('line', {lineno: -1, msg: err.toString()} );
            });
            readLines(input, function(data) {
                filterLine(data);
            }, function() {
                doTail();
            });
        } else {
            var input = fs.createReadStream( options.tail.filename );

            var queue = new CircularBuffer( options.tail.line );
            input.on("error", function(err) {
                console.log(err);
                client.emit('line', {lineno: -1, msg: err.toString()} );
            });
            readLines(input, function(data) {
                queue.append(data);
            }, function () {
                queue.each(function(line) {
                    filterLine(line);
                });

                doTail();
            });
        }

    });

    client.on('disconnect', function() {
        console.log('disconnected');
    });

});

// app.listen(8080);

console.log('Server running at http://192.168.130.128:8080/');

