const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Index.html'));
});

// Catch-all for other HTML files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, req.path));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
