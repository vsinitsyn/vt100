var https = require('https'),
    fs    = require('fs'),
    io    = require('socket.io'),
    tty   = require('tty');
const PORT = 8000;

tty.setRawMode(true);

var options = {
  key: fs.readFileSync('vt100-key.pem'),
  cert: fs.readFileSync('vt100-cert.pem')
};

var srv = https.createServer(options, function(req, resp) {
  var path = require('url').parse(req.url).pathname;
  fs.readFile(__dirname + path, function(err, data) {
    if (err) {
      resp.writeHead(500);
      resp.end('Unable to open ' + path);
    } else {
      resp.writeHead(200);
      resp.end(data);
    }
  });
});

var sio = io.listen(srv);
srv.listen(PORT);

sio.sockets.on('connection', function(socket) {
  var bash = tty.open("/bin/bash"),
      fd   = bash[0],
      proc = bash[1];

  clients++;

  fd.setEncoding('utf-8');
  fd.on('data', function(data) {
    socket.emit('data', data);
  });
  socket.on('data', function(data) {
    fd.write(data);
  });

  socket.on('disconnect', function() {
    proc.kill('SIGHUP');
    maybe_terminate();
  });
  socket.on('kill', function(data) {
    socket.emit('end', '\nDisconnected on user request\n');
    proc.kill('SIGHUP');
    maybe_terminate();
  });
})

var clients = 0;
function maybe_terminate () {
  console.log("maybe_terminate(): clients = " + clients);
  if (!--clients) {
    process.exit();
  }
}
