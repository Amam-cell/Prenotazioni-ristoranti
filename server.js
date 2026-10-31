const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DATA_FILE = path.join(__dirname, 'prenotazioni.json');
const RESTOS_FILE = path.join(__dirname, 'ristoranti.json');

let bookings = [];
if (fs.existsSync(DATA_FILE)) {
  try { bookings = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { bookings = []; }
}

let restaurants = ['Ristorante Partner 1', 'Ristorante Partner 2'];
if (fs.existsSync(RESTOS_FILE)) {
  try { restaurants = JSON.parse(fs.readFileSync(RESTOS_FILE, 'utf8')); } catch (e) { }
}

app.use(express.static(__dirname));
app.use(express.json());

io.on('connection', (socket) => {
  socket.emit('init', { bookings, restaurants });

  socket.on('update_bookings', (data) => {
    bookings = data;
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2)); } catch (e) {}
    io.emit('init', { bookings, restaurants });
  });

  socket.on('add_restaurant', (name) => {
    if (name && !restaurants.includes(name)) {
      restaurants.push(name);
      try { fs.writeFileSync(RESTOS_FILE, JSON.stringify(restaurants, null, 2)); } catch (e) {}
      io.emit('init', { bookings, restaurants });
    }
  });

  socket.on('delete_restaurant', (name) => {
    restaurants = restaurants.filter(r => r !== name);
    try { fs.writeFileSync(RESTOS_FILE, JSON.stringify(restaurants, null, 2)); } catch (e) {}
    io.emit('init', { bookings, restaurants });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server attivo su porta ${PORT}`);
});
