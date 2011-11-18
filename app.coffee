express = require 'express'
io    = require 'socket.io'
fs    = require 'fs'
tty   = require 'tty'
auth  = require './auth'
userStore = require './userstore'

app = module.exports = express.createServer {
  key: fs.readFileSync('vt100-key.pem'),
  cert: fs.readFileSync 'vt100-cert.pem'
}
MemoryStore = express.session.MemoryStore
sessionStore = new MemoryStore

# Configuration

COOKIE_NAME = 'vt100.sid'
PORT = process.env.port ? 8000

app.configure ->
  app.set 'views', __dirname + '/views'
  app.set 'view engine', 'coffeekup'
  app.use express.bodyParser()
  app.use express.methodOverride()
  app.use express.cookieParser()
  app.use express.session {
    store: sessionStore,
    secret: 'your_secret_here',
    key: COOKIE_NAME
  }
  app.use app.router
  app.use express.compiler {
    src: __dirname + '/public',
    enable: ['coffeescript']
  }
  app.use express.static __dirname + '/public'
  app.use auth.anonymousRedirect '/login.html'

app.configure 'development', -> 
  app.use express.errorHandler dumpExceptions: true, showStack: true

app.configure 'production', ->
  app.use express.errorHandler()

# Routes

app.get '/', (req, res) ->
  res.render 'index', {
    title: 'vt100 - CoffeeScript'
  }

app.get '/login.html', (req, res) ->
  res.render 'login', {
    title: 'Please Log in',
    messages: ''
  }

app.post '/login.html', (req, resp) ->
  user = userStore.getUser req.body.username, req.body.password
  if user
    req.session.authenticated = yes
    req.session.user = user
    resp.redirect '/terminal.html'
  else
    resp.render 'login', {
      title: 'Please Log in',
      messages: 'Invalid username or password'
    }

restricted = auth.requestAuthentication 'Please authenticate', (req, resp) ->
  return req.session?.authenticated

app.get '/logout.html', restricted, (req, resp) ->
  req.session.destroy (err) ->
    # Silently ignore the error
  resp.redirect '/login.html'

app.get '/terminal.html', restricted, (req, resp) ->
  user = req.session.user
  resp.render 'terminal', {
    layout: false,
    title: "#{user.userName}'s Session",
    user: user
  }

io = io.listen app
app.listen PORT

maybe_terminate = ->
  console.log "maybe_terminate(): clients = #{clients}"
  if not --clients
    process.exit()

clients = 0
io
.configure 'development', ->
  return
.configure 'production', ->
  io.set 'log level', 1
.set 'authorization', (handshake, callback) ->
  if handshake.headers.cookie
    parseCookie = require('connect').utils.parseCookie
    sid = (parseCookie(handshake.headers.cookie))[COOKIE_NAME]
    sessionStore.get sid, (err, session) ->
      if err
        callback err.message, false
      else
        if not session?.authenticated
          callback 'Not authenticated', false
        else
          handshake.user = session.user
          callback null, true
  else
    callback 'No cookie found', false
.sockets.on 'connection', (socket) ->
  shell = tty.open socket.handshake.user.shell
  fd    = shell[0]
  proc  = shell[1]

  clients++

  fd.setEncoding('utf-8')
  fd.on 'data', (data) ->
    socket.emit 'data', data

  socket.on 'data', (data) ->
    fd.write data
  socket.on 'kill', (data) ->
    # This may not be fast enough to reach the client
    socket.emit 'end', '\nDisconnected on user request\n'
    proc.kill 'SIGHUP'
    maybe_terminate()
  socket.on 'disconnect', ->
    proc.kill 'SIGHUP'
    maybe_terminate()

console.log "Express server listening on port %d in %s mode", app.address().port, app.settings.env
