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

app.get('/courses', (req, res) => {
  res.sendFile(path.join(__dirname, 'Courses.html'));
});

app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'Search.html'));
});

app.get('/testseries', (req, res) => {
  res.sendFile(path.join(__dirname, 'Test Series.html'));
});

app.get('/careers', (req, res) => {
  res.sendFile(path.join(__dirname, 'Careers.html'));
});

app.get('/research', (req, res) => {
  res.sendFile(path.join(__dirname, 'Research.HTML'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'About.html'));
});

app.get('/course', (req, res) => {
  res.sendFile(path.join(__dirname, 'Course.html'));
});

// Listen
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
