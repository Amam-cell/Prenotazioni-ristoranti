const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DATA_FILE = path.join(__dirname, 'prenotazioni.json');

let bookings = [];
if (fs.existsSync(DATA_FILE)) {
  try { bookings = JSON.parse(fs.readFileSync(DATA_FILE)); } catch(e) {}
}

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  socket.emit('init', bookings);

  socket.on('update_bookings', (data) => {
    bookings = data;
    fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2));
    io.emit('init', bookings);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server cloud attivo su porta ${PORT}`);
});
