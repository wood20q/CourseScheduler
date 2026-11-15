const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// In serverless environments (like Vercel), __dirname is read-only.
// We use /tmp or :memory: for SQLite if running on Vercel.
const isVercel = Boolean(process.env.VERCEL);
let dbStorage = path.join(__dirname, 'database.sqlite');

if (isVercel) {
  const tmpDbPath = path.join('/tmp', 'database.sqlite');
  try {
    if (fs.existsSync(dbStorage) && !fs.existsSync(tmpDbPath)) {
      fs.copyFileSync(dbStorage, tmpDbPath);
    }
    dbStorage = tmpDbPath;
  } catch (err) {
    console.warn('Could not copy SQLite to /tmp, using in-memory SQLite:', err.message);
    dbStorage = ':memory:';
  }
}

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbStorage,
  logging: false
});

const Course = require('./models/course')(sequelize);

module.exports = { sequelize, Course };
