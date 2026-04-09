// app.js — Express Server Entry Point
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/donors', require('./routes/donors'));
app.use('/api/recipients', require('./routes/recipients'));
app.use('/api/organs', require('./routes/organs'));
app.use('/api/hospitals', require('./routes/hospitals'));
app.use('/api/consent', require('./routes/consent'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/surgeries', require('./routes/surgeries'));
app.use('/api/queries', require('./routes/queries'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  🏥 Organ Transplant System running at http://localhost:${PORT}\n`);
});
