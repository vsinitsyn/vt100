vt100
=====
A very simple web-based vt100 terminal emulator, built with Node.js and socket.io, and meant as an exampe code for an article

Usage
-----
Generate keys for HTTPS
    openssl req -x509 -nodes -days 365 -newkey rsa:1024 -keyout vt100-key.pem -out vt100-cert.crt
Run the server
    node vt100-server.js

Then open your web browser and connect to
https://localhost:8000
