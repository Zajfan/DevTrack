const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const homeDir = os.homedir();
const dbPath = path.join(homeDir, '.config', 'devtrack', 'devtrack.db');

console.log(`Checking database at: ${dbPath}`);

try {
    const db = new Database(dbPath, { readonly: true });

    // Check Users
    const users = db.prepare('SELECT * FROM users').all();
    console.log('Users:', users);

    // Check Projects
    const projects = db.prepare('SELECT * FROM projects').all();
    console.log('Projects:', projects.length);

    db.close();
} catch (error) {
    console.error('Error reading database:', error.message);
}
