window.start = () ->
  l = document.location
  socket = window.socket = io.connect l.protocol + "//" + l.host
  terminal = new VT100 80, 25, "terminal"
  terminal.getch (ch, t) ->
    socket.emit 'data', ch
  div = document.getElementById 'terminal'
  terminal.curs_set 1, true, div
  div.focus()

  socket.on 'data', (data) ->
    if data == "\r\nexit\r\n"
      leave()
    terminal.write data
  socket.on 'end', (data) ->
    terminal.curs_set 0, true
    terminal.write data

window.leave = () ->
  if (socket = window.socket)?
    socket.emit 'kill'
  socket = null
