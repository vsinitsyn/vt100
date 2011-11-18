
  window.start = function() {
    var div, l, socket, terminal;
    l = document.location;
    socket = window.socket = io.connect(l.protocol + "//" + l.host);
    terminal = new VT100(80, 25, "terminal");
    terminal.getch(function(ch, t) {
      return socket.emit('data', ch);
    });
    div = document.getElementById('terminal');
    terminal.curs_set(1, true, div);
    div.focus();
    socket.on('data', function(data) {
      if (data === "\r\nexit\r\n") leave();
      return terminal.write(data);
    });
    return socket.on('end', function(data) {
      terminal.curs_set(0, true);
      return terminal.write(data);
    });
  };

  window.leave = function() {
    var socket;
    if ((socket = window.socket) != null) socket.emit('kill');
    return socket = null;
  };
