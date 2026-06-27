const path = require('path');
const fs = require('fs');

let db = null;

// Pure JS SQLite-like store using JSON files
// This ensures zero native dependency issues
const DATA_DIR = path.join(__dirname, '../../data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadTable(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function saveTable(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// In-memory DB with persistence
class SimpleDB {
  constructor() {
    ensureDataDir();
    this.tables = {};
    // Load all tables on init
    ['users', 'posts', 'friends', 'messages', 'post_likes', 'post_tags'].forEach(t => {
      this.tables[t] = loadTable(t);
    });
  }

  save(table) {
    saveTable(table, this.tables[table]);
  }

  // Generic CRUD
  findAll(table, filter = {}) {
    return this.tables[table].filter(row => {
      return Object.keys(filter).every(k => row[k] === filter[k]);
    });
  }

  findOne(table, filter = {}) {
    return this.tables[table].find(row => {
      return Object.keys(filter).every(k => row[k] === filter[k]);
    });
  }

  insert(table, record) {
    this.tables[table].push(record);
    this.save(table);
    return record;
  }

  update(table, filter, updates) {
    let updated = 0;
    this.tables[table] = this.tables[table].map(row => {
      const match = Object.keys(filter).every(k => row[k] === filter[k]);
      if (match) {
        updated++;
        return { ...row, ...updates, updated_at: new Date().toISOString() };
      }
      return row;
    });
    this.save(table);
    return updated;
  }

  delete(table, filter) {
    const before = this.tables[table].length;
    this.tables[table] = this.tables[table].filter(row => {
      return !Object.keys(filter).every(k => row[k] === filter[k]);
    });
    this.save(table);
    return before - this.tables[table].length;
  }

  // Prepare-style interface (for compatibility with socket.io code)
  prepare(sql) {
    return {
      run: (...args) => {
        // Parse simple INSERT INTO table (cols) VALUES (?)
        const insertMatch = sql.match(/INSERT INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\)/i);
        if (insertMatch) {
          const [, table, colStr] = insertMatch;
          const cols = colStr.split(',').map(c => c.trim());
          const record = {};
          cols.forEach((col, i) => { record[col] = args[i]; });
          record.created_at = new Date().toISOString();
          this.insert(table, record);
        }
      }
    };
  }
}

let dbInstance = null;

function initDB() {
  dbInstance = new SimpleDB();
  console.log('✅ Database initialized');
}

function getDB() {
  if (!dbInstance) initDB();
  return dbInstance;
}

module.exports = { initDB, getDB };
