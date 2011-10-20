var socket = null;

function start() {
  var l = document.location;
  socket = io.connect(l.protocol + "//" + l.host);
  var terminal = new VT100(80, 25, "terminal");
  terminal.getch(function (ch, t) {
    socket.emit('data', ch);
  });
  var div = document.getElementById('terminal');
  terminal.curs_set(1, true, div);
  div.focus();

  socket.on('data', function(data) {
    if (data == "\r\nexit\r\n") {
      leave();
    }
    terminal.write(data);
  });
  socket.on('end', function(data) {
    terminal.curs_set(0, true);
    terminal.write(data);
  });
};

function leave() {
  if (socket != null) {
    socket.emit('kill');
  }
  socket = null;
}
