const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const app = express();
app.use(cors());
app.use(express.json());

// Simple route to check if backend is running
app.get('/', (req, res) => {
  res.send('Musix API is running successfully!');
});
app.use('/api/music', require('./routes/music'));
app.use('/api/library', require('./routes/library'));
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));