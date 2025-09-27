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

    // Insert sample courses
    await pool.query(`
      INSERT INTO courses (module, content, notes_url) VALUES 
      ('Microeconomics', '{
        "lessons": [
          {
            "title": "Supply and Demand",
            "content": "The intersection of supply and demand curves determines the market clearing price.",
            "key_points": ["Law of Demand: Inverse relationship", "Law of Supply: Direct relationship", "Equilibrium: Where curves meet"],
            "media_url": "https://www.youtube.com/embed/0oZiPtGDFlY"
          },
          {
            "title": "Elasticity",
            "content": "Measures responsiveness of quantity to price changes.",
            "key_points": ["Price Elasticity", "Income Elasticity", "Cross Elasticity"],
            "media_url": ""
          }
        ]
      }', 'assets/notes/micro.pdf'),
      ('Macroeconomics', '{
        "lessons": [
          {
            "title": "GDP and Measurement",
            "content": "Gross Domestic Product measures the value of goods and services produced.",
            "key_points": ["Nominal vs Real GDP", "Expenditure Approach", "Income Approach"],
            "media_url": ""
          },
          {
            "title": "Inflation",
            "content": "Rise in general price level reduces purchasing power.",
            "key_points": ["CPI", "PPI", "Hyperinflation"],
            "media_url": "https://example.com/inflation-audio.mp3"
          }
        ]
      }', 'assets/notes/macro.pdf'),
      ('Econometrics', '{
        "lessons": [
          {
            "title": "Regression Analysis",
            "content": "Statistical method to estimate relationship between variables.",
            "key_points": ["OLS", "R-squared", "Assumptions"],
            "media_url": ""
          },
          {
            "title": "Hypothesis Testing",
            "content": "Determine if results are statistically significant.",
            "key_points": ["p-value", "t-test", "F-test"],
            "media_url": ""
          }
        ]
      }', 'assets/notes/econometrics.pdf'),
      ('Development Economics', '{
        "lessons": [
          {
            "title": "Poverty and Inequality",
            "content": "Analysis of economic disparities and development challenges.",
            "key_points": ["Gini Coefficient", "Poverty Trap", "Inequality Measures"],
            "media_url": ""
          },
          {
            "title": "Human Capital Theory",
            "content": "Investment in education and health for economic growth.",
            "key_points": ["Becker's Model", "Returns to Education", "Health Economics"],
            "media_url": ""
          }
        ]
      }', 'assets/notes/development.pdf'),
      ('Finance', '{
        "lessons": [
          {
            "title": "Capital Markets",
            "content": "Markets for long-term funding, including stocks and bonds.",
            "key_points": ["Stock Markets", "Bond Markets", "CAPM"],
            "media_url": ""
          },
          {
            "title": "Risk Management",
            "content": "Strategies to identify and mitigate financial risks.",
            "key_points": ["VaR", "Hedging", "Derivatives"],
            "media_url": "https://www.youtube.com/embed/3p8Wst3Vhs4"
          }
        ]
      }', 'assets/notes/finance.pdf')
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
