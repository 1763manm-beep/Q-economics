const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDB() {
  try {
    // Terms table for search
    await pool.query(`
      CREATE TABLE IF NOT EXISTS terms (
        id SERIAL PRIMARY KEY,
        term VARCHAR(255) UNIQUE NOT NULL,
        description TEXT NOT NULL
      );
    `);

    // Quizzes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        questions JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure created_at exists for existing tables
    await pool.query('ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;');

    // Quiz scores
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quiz_scores (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        quiz_id INTEGER REFERENCES quizzes(id),
        score INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Jobs table for job board
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        company VARCHAR(255),
        location VARCHAR(255),
        salary VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Courses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        module VARCHAR(255) NOT NULL,
        content JSONB,
        notes_url VARCHAR(255)
      );
    `);

    // Insert sample data
    await pool.query(`
      INSERT INTO terms (term, description) VALUES 
      ('Supply and Demand', 'Fundamental model of price determination through interaction of buyers and sellers.'),
      ('GDP', 'Gross Domestic Product, measure of economic activity.'),
      ('Inflation', 'Sustained increase in price levels.'),
      ('Monetary Policy', 'Central bank actions to control money supply.')
      ON CONFLICT (term) DO NOTHING;
    `);

    await pool.query(`
      INSERT INTO jobs (title, description, company, location, salary) VALUES 
      ('Economic Analyst', 'Analyze economic data for policy making.', 'RBI', 'Mumbai', '₹8-12 LPA'),
      ('Research Associate', 'Conduct economic research.', 'NITI Aayog', 'Delhi', '₹6-10 LPA'),
      ('Financial Economist', 'Model financial markets.', 'Goldman Sachs', 'Mumbai', '₹15-20 LPA')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Database initialization error:', err);
  } finally {
    pool.end();
  }
}

initDB();
