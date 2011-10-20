
/**
 * Module dependencies.
 */

var express = require('express');
var io    = require('socket.io');
var fs    = require('fs');
var tty   = require('tty');
var auth  = require('./auth');
var userStore = require('./userstore');

var app = module.exports = express.createServer({
  key: fs.readFileSync('vt100-key.pem'),
  cert: fs.readFileSync('vt100-cert.pem')
});
var MemoryStore = express.session.MemoryStore,
    sessionStore = new MemoryStore();

// Configuration

const COOKIE_NAME = 'vt100.sid';
const PORT = process.env.port || 8000;

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({
    store: sessionStore,
    secret: 'your_secret_here',
    key: COOKIE_NAME
  }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(auth.anonymousRedirect('/login.html'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){
  res.render('index', {
    title: 'vt100 - Express'
  });
});

app.get('/login.html', function(req, res){
  res.render('login', {
    title: 'Please Log in',
    messages: ''
  });
});

app.post('/login.html', function(req, resp){
  var user = userStore.getUser(req.body.username, req.body.password);
  if (user) {
    req.session.authenticated = true;
    req.session.user = user;
    resp.redirect('/terminal.html');
  } else {
    resp.render('login', {
      title: 'Please Log in',
      messages: 'Invalid username or password'
    });
  }
});

var restricted = auth.requestAuthentication(
  'Please authenticate',
  function (req, resp) {
    return req.session && req.session.authenticated;
  }
);

app.get('/logout.html', restricted, function(req, resp){
  req.session.destroy(function (err) {
    // Silently ignore the error
  });
  resp.redirect('/login.html');
});

app.get('/terminal.html', restricted, function(req, resp){
  var user = req.session.user;
  resp.render('terminal', {
    layout: false,
    title: user.userName + '\'s Session',
    user: user
  });
});

var sio = io.listen(app);
app.listen(PORT);

sio
.configure('development', function () {
})
.configure('production', function () {
  io.set('log level', 1);
})
.set('authorization', function(handshake, callback) {
  if (handshake.headers.cookie) {
    var parseCookie = require('connect').utils.parseCookie;
    var sid = (parseCookie(handshake.headers.cookie))[COOKIE_NAME];
    sessionStore.get(sid, function (err, session) {
      if (err) {
        callback(err.message, false);
      } else {
        if (!session || !session.authenticated) {
          callback('Not authenticated', false);
        } else {
          handshake.user = session.user;
          callback(null, true);
        }
      }
    });
  } else {
    callback('No cookie found', false);
  }
})
.sockets.on('connection', function(socket) {
  var shell = tty.open(socket.handshake.user.shell),
      fd    = shell[0],
      proc  = shell[1];

  clients++;

  fd.setEncoding('utf-8');
  fd.on('data', function(data) {
    socket.emit('data', data);
  });

  socket.on('data', function(data) {
    fd.write(data);
  });
  socket.on('kill', function(data) {
    // This may not be fast enough to reach the client
    socket.emit('end', '\nDisconnected on user request\n');
    proc.kill('SIGHUP');
    maybe_terminate();
  });
  socket.on('disconnect', function() {
    proc.kill('SIGHUP');
    maybe_terminate();
  });
})

var clients = 0;
var maybe_terminate = function () {
  console.log("maybe_terminate(): clients = " + clients);
  if (!--clients) {
    process.exit();
  }
}

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
