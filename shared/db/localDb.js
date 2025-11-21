const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_DIR =
  process.env.LOCAL_DB_DIR ||
  path.join(__dirname, '../../data');
const DB_FILE =
  process.env.LOCAL_DB_PATH ||
  path.join(DB_DIR, 'local-db.sqlite');

const TABLE_DEFINITIONS = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS data_items (
    id TEXT PRIMARY KEY,
    data_key TEXT NOT NULL UNIQUE,
    value_json TEXT NOT NULL,
    metadata_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS compute_jobs (
    id TEXT PRIMARY KEY,
    type TEXT,
    data_json TEXT,
    status TEXT,
    result_json TEXT,
    submitted_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS cache_entries (
    id TEXT PRIMARY KEY,
    cache_key TEXT NOT NULL UNIQUE,
    value_json TEXT NOT NULL,
    metadata_json TEXT,
    expires_at TEXT,
    updated_at TEXT
  );
`;

const locateWasm = (file) => {
  const baseDir = path.dirname(require.resolve('sql.js/dist/sql-wasm.js'));
  return path.join(baseDir, file);
};

const mapUser = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    password: row.password,
    createdAt: row.created_at
  };
};

const mapDataItem = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    key: row.data_key,
    value: row.value_json ? JSON.parse(row.value_json) : null,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

class LocalDB {
  constructor() {
    this.db = null;
    this.ready = this.initialize();
    this.writeQueue = Promise.resolve();
  }

  async initialize() {
    await fs.promises.mkdir(DB_DIR, { recursive: true });
    const SQL = await initSqlJs({ locateFile: locateWasm });

    const fileExists = fs.existsSync(DB_FILE);
    if (fileExists) {
      const fileBuffer = await fs.promises.readFile(DB_FILE);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run(TABLE_DEFINITIONS);
    await this.persist();
  }

  async persist() {
    const data = this.db.export();
    await fs.promises.writeFile(DB_FILE, Buffer.from(data));
  }

  async withWrite(fn) {
    await this.ready;
    this.writeQueue = this.writeQueue.then(async () => {
      const result = await fn(this.db);
      await this.persist();
      return result;
    }).catch(error => {
      console.error('[LocalDB] Write operation failed:', error);
    });

    return this.writeQueue;
  }

  async runQuery(sql, params = []) {
    await this.ready;
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      return rows;
    } finally {
      stmt.free();
    }
  }

  async runGet(sql, params = []) {
    const rows = await this.runQuery(sql, params);
    return rows[0] || null;
  }

  async saveUser(user) {
    await this.withWrite(async (db) => {
      db.run(
        `
        INSERT INTO users (id, username, email, password, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          username=excluded.username,
          password=excluded.password,
          created_at=excluded.created_at
      `,
        [user.id, user.username, user.email, user.password, user.createdAt]
      );
    });
    return user;
  }

  async getUserByEmail(email) {
    const row = await this.runGet(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return mapUser(row);
  }

  async getUserById(id) {
    const row = await this.runGet(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return mapUser(row);
  }

  async saveDataItem(item) {
    await this.withWrite(async (db) => {
      db.run(
        `
        INSERT INTO data_items (id, data_key, value_json, metadata_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(data_key) DO UPDATE SET
          value_json=excluded.value_json,
          metadata_json=excluded.metadata_json,
          updated_at=excluded.updated_at
      `,
        [
          item.id,
          item.key,
          JSON.stringify(item.value ?? null),
          JSON.stringify(item.metadata ?? {}),
          item.createdAt,
          item.updatedAt
        ]
      );
    });
    return item;
  }

  async getDataItemByKey(key) {
    const row = await this.runGet(
      'SELECT * FROM data_items WHERE data_key = ?',
      [key]
    );
    return mapDataItem(row);
  }

  async getAllDataItems() {
    const rows = await this.runQuery(
      'SELECT * FROM data_items ORDER BY created_at DESC'
    );
    return rows.map(mapDataItem);
  }

  async deleteDataItemByKey(key) {
    const deleted = await this.withWrite(async (db) => {
      const stmt = db.prepare(
        'DELETE FROM data_items WHERE data_key = ? RETURNING 1'
      );
      try {
        stmt.bind([key]);
        const removed = stmt.step();
        return removed;
      } finally {
        stmt.free();
      }
    });

    return Boolean(deleted);
  }
}

module.exports = new LocalDB();

