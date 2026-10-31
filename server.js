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
  try {
    bookings = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    bookings = [];
  }
}

app.use(express.static(__dirname));
app.use(express.json());

io.on('connection', (socket) => {
  socket.emit('init', bookings);

  socket.on('update_bookings', (data) => {
    bookings = data;
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2));
    } catch (e) {
      console.error("Errore salvataggio JSON:", e);
    }
    io.emit('init', bookings);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server attivo su porta ${PORT}`);
});
