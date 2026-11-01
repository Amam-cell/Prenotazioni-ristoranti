const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));
app.use(express.json());

// Connessione a MongoDB Atlas (legge la variabile d'ambiente impostata su Render)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/reception_db';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connesso a MongoDB con successo!'))
  .catch(err => console.error('Errore di connessione a MongoDB:', err));

// Schema per i dati su MongoDB
const dataSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'booking' o 'restaurant'
  payload: { type: Object, required: true }
});
const AppData = mongoose.model('AppData', dataSchema);

io.on('connection', async (socket) => {
  try {
    const records = await AppData.find({});
    const bookings = records.filter(r => r.type === 'booking').map(r => ({ ...r.payload, _id: r._id }));
    const restaurants = records.filter(r => r.type === 'restaurant').map(r => r.payload.name);

    // Se non ci sono ristoranti salvati, ne mettiamo di default
    const finalRestaurants = restaurants.length > 0 ? restaurants : ['Ristorante Partner A', 'Ristorante Partner B'];

    socket.emit('init', { bookings, restaurants: finalRestaurants });

    // Aggiornamento prenotazioni
    socket.on('update_bookings', async (newBookings) => {
      await AppData.deleteMany({ type: 'booking' });
      for (const b of newBookings) {
        await AppData.create({ type: 'booking', payload: b });
      }
      const updatedRecords = await AppData.find({});
      const bList = updatedRecords.filter(r => r.type === 'booking').map(r => ({ ...r.payload, _id: r._id }));
      const rList = updatedRecords.filter(r => r.type === 'restaurant').map(r => r.payload.name);
      io.emit('init', { bookings: bList, restaurants: rList.length > 0 ? rList : finalRestaurants });
    });

    // Aggiunta ristorante
    socket.on('add_restaurant', async (name) => {
      const existing = await AppData.findOne({ type: 'restaurant', 'payload.name': name });
      if (!existing && name) {
        await AppData.create({ type: 'restaurant', payload: { name } });
      }
      const updatedRecords = await AppData.find({});
      const bList = updatedRecords.filter(r => r.type === 'booking').map(r => ({ ...r.payload, _id: r._id }));
      const rList = updatedRecords.filter(r => r.type === 'restaurant').map(r => r.payload.name);
      io.emit('init', { bookings: bList, restaurants: rList });
    });

    // Eliminazione ristorante
    socket.on('delete_restaurant', async (name) => {
      await AppData.deleteOne({ type: 'restaurant', 'payload.name': name });
      await AppData.deleteMany({ type: 'booking', 'payload.restaurant': name }); // Rimuove anche le prenotazioni di quel ristorante
      
      const updatedRecords = await AppData.find({});
      const bList = updatedRecords.filter(r => r.type === 'booking').map(r => ({ ...r.payload, _id: r._id }));
      const rList = updatedRecords.filter(r => r.type === 'restaurant').map(r => r.payload.name);
      io.emit('init', { bookings: bList, restaurants: rList });
    });

  } catch (e) {
    console.error("Errore socket:", e);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server cloud attivo su porta ${PORT}`);
});
