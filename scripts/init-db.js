const path = require('path');

// Ensure we execute from project root when running via npm scripts
process.chdir(path.resolve(__dirname, '..'));

const { initDb } = require('../src/db');

(async () => {
  try {
    await initDb();
    console.log('Database schema verified.');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
})();
