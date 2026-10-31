const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DATA_FILE = path.join(__dirname, 'prenotazioni.json');

// Caricamento iniziale dei dati salvati
let bookings = [];
if (fs.existsSync(DATA_FILE)) {
  try { 
    bookings = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); 
  } catch(e) {
    bookings = [];
  }
}

// Configurazione file statici dalla root
app.use(express.static(__dirname));
app.use(express.json());

// Gestione delle connessioni in tempo reale
io.on('connection', (socket) => {
  // Invia lo stato attuale delle prenotazioni appena un utente si collega
  socket.emit('init', bookings);

  // Ascolta l'aggiornamento delle prenotazioni dai client
  socket.on('update_bookings', (data) => {
    bookings = data;
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2));
    } catch (e) {
      console.error("Errore nel salvataggio del file JSON:", e);
    }
    // Sincronizza tutti i client connessi
    io.emit('init', bookings);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server cloud attivo su porta ${PORT}`);
});
