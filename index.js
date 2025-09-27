const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');
const multer = require('multer');
const XLSX = require('xlsx');

const upload = multer({ dest: 'uploads/' });
const fs = require('fs');

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

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Admin upload endpoint
app.post('/admin/upload', upload.single('quizFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const title = req.body.title;
    const type = 'multiple-choice';
    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }

    // Parse file with XLSX (handles both CSV and XLSX)
    let workbook;
    if (req.file.originalname.toLowerCase().endsWith('.csv')) {
      const csvData = fs.readFileSync(req.file.path, 'utf8');
      workbook = XLSX.read(csvData, { type: 'string' });
    } else {
      workbook = XLSX.readFile(req.file.path);
    }
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    console.log('Parsed jsonData:', JSON.stringify(jsonData.slice(0, 3), null, 2)); // Log first few rows for debug

    if (jsonData.length < 2) {
      return res.status(400).json({ error: 'No data in file' });
    }

    const headers = jsonData[0];
    const questionIndex = headers.indexOf('Question');
    const optA = headers.indexOf('OptionA');
    const optB = headers.indexOf('OptionB');
    const optC = headers.indexOf('OptionC');
    const optD = headers.indexOf('OptionD');
    const correctIndex = headers.indexOf('CorrectAnswer');

    if (questionIndex === -1 || optA === -1 || optB === -1 || optC === -1 || optD === -1 || correctIndex === -1) {
      return res.status(400).json({ error: 'Invalid file format. Use sample template.' });
    }

    const questions = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const question = row[questionIndex]?.toString().trim();
      if (question) {
        const correct = row[correctIndex]?.toString().toUpperCase().trim();
        const q = {
          question,
          options: [
            row[optA]?.toString().trim() || '',
            row[optB]?.toString().trim() || '',
            row[optC]?.toString().trim() || '',
            row[optD]?.toString().trim() || ''
          ],
          correct: correct || 'A'
        };
        questions.push(q);
      }
    }

    if (questions.length === 0) {
      return res.status(400).json({ error: 'No valid questions found' });
    }

    // Insert into DB
    const query = `
      INSERT INTO quizzes (title, type, questions)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;
    const values = [title, type, JSON.stringify(questions)];
    const result = await pool.query(query, values);

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    res.json({ success: true, questionsCount: questions.length, quizId: result.rows[0].id });
  } catch (err) {
    console.error('Upload error details:', err);
    res.status(500).json({ error: 'Server error during upload: ' + err.message });
  }
});

// API endpoint for quizzes
app.get('/api/quizzes', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, title, type, questions, created_at FROM quizzes ORDER BY id DESC');
    res.json(rows.map(row => {
      let questions = [];
      if (row.questions) {
        if (Array.isArray(row.questions)) {
          questions = row.questions;
        } else if (typeof row.questions === 'string') {
          try {
            questions = JSON.parse(row.questions);
          } catch (e) {
            console.warn('Invalid JSON for quiz ' + row.id + ': ' + row.questions);
          }
        }
      }
      return { ...row, questions };
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// Admin management APIs
app.put('/admin/quiz/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, questions } = req.body; // questions as array of objects
    const query = `
      UPDATE quizzes 
      SET title = $1, questions = $2 
      WHERE id = $3 
      RETURNING id;
    `;
    const values = [title || '', JSON.stringify(questions), id];
    const result = await pool.query(query, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update quiz' });
  }
});

app.delete('/admin/quiz/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM quizzes WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// POST /admin/quiz for create new quiz
app.post('/admin/quiz', async (req, res) => {
  try {
    const { title, questions } = req.body;
    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Title and questions array required' });
    }

    const type = 'multiple-choice';
    const query = `
      INSERT INTO quizzes (title, type, questions)
      VALUES ($1, $2, $3)
      RETURNING id;
    `;
    const values = [title, type, JSON.stringify(questions)];
    const result = await pool.query(query, values);

    res.json({ success: true, quizId: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create quiz' });
  }
});

app.delete('/admin/quiz/:id/question/:qIndex', async (req, res) => {
  try {
    const { id, qIndex } = req.params;
    const { rows } = await pool.query('SELECT questions FROM quizzes WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    const questions = JSON.parse(rows[0].questions);
    questions.splice(parseInt(qIndex), 1);
    await pool.query('UPDATE quizzes SET questions = $1 WHERE id = $2', [JSON.stringify(questions), id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Terms management APIs
app.get('/api/terms', async (req, res) => {
  try {
    let sql = 'SELECT * FROM terms';
    let values = [];
    if (req.query.q) {
      sql += ' WHERE term ILIKE $1';
      values.push(`%${req.query.q}%`);
    }
    sql += ' ORDER BY term ASC';
    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch terms' });
  }
});

app.get('/api/terms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM terms WHERE id = $1', [parseInt(id)]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Term not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch term' });
  }
});

app.post('/admin/terms', async (req, res) => {
  try {
    const { term, description } = req.body;
    if (!term || !description) {
      return res.status(400).json({ error: 'Term and description required' });
    }
    const result = await pool.query(
      'INSERT INTO terms (term, description) VALUES ($1, $2) RETURNING *',
      [term.trim(), description.trim()]
    );
    res.json({ success: true, term: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Term already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create term' });
    }
  }
});

app.put('/admin/terms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { term, description } = req.body;
    if (!term || !description) {
      return res.status(400).json({ error: 'Term and description required' });
    }
    const result = await pool.query(
      'UPDATE terms SET term = $1, description = $2 WHERE id = $3 RETURNING *',
      [term.trim(), description.trim(), parseInt(id)]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Term not found' });
    }
    res.json({ success: true, term: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'Term already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update term' });
    }
  }
});

// Courses APIs
app.get('/api/courses', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM courses ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

app.get('/api/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM courses WHERE id = $1', [parseInt(id)]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

app.delete('/admin/terms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM terms WHERE id = $1 RETURNING id', [parseInt(id)]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Term not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete term' });
  }
});

// Listen
app.get('/term/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'Term.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
