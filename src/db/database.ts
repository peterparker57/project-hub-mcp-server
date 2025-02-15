import path from 'path';
import { promisify } from 'util';
import { schema } from './schema.js';
import { logger } from '../utils/logger.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sqlite3 = require('sqlite3');

type RunResult = {
  lastID: number;
  changes: number;
};

type Statement = {
  run(...params: any[]): Promise<RunResult>;
  get(...params: any[]): Promise<any>;
  all(...params: any[]): Promise<any[]>;
  finalize(): Promise<void>;
};

export class DatabaseManager {
  private db: any;
  private static instance: DatabaseManager;

  private constructor(dbPath: string) {
    logger.log(`Attempting to connect to database at ${dbPath}`);
    this.db = new sqlite3.Database(dbPath, (err: Error | null) => {
      if (err) {
        logger.log(`Error opening database: ${err.message}`);
        throw err;
      }
      logger.log(`Connected to SQLite database at ${dbPath}`);
    });

    // Enable foreign keys and WAL mode
    try {
      this.db.run('PRAGMA foreign_keys = ON', [], (err: Error | null) => {
        if (err) logger.log(`Error enabling foreign keys: ${err.message}`);
        else logger.log('Foreign keys enabled');
      });
      this.db.run('PRAGMA journal_mode = WAL', [], (err: Error | null) => {
        if (err) logger.log(`Error setting journal mode: ${err.message}`);
        else logger.log('Journal mode set to WAL');
      });
    } catch (err) {
      logger.log(`Error setting PRAGMA: ${err}`);
    }

    // Promisify database methods
    try {
      this.db.runAsync = promisify(this.db.run).bind(this.db);
      this.db.getAsync = promisify(this.db.get).bind(this.db);
      this.db.allAsync = promisify(this.db.all).bind(this.db);
      this.db.execAsync = promisify(this.db.exec).bind(this.db);
      logger.log('Database methods promisified successfully');
    } catch (err) {
      logger.log(`Error promisifying methods: ${err}`);
      throw err;
    }
  }

  static async initialize(dbPath: string): Promise<DatabaseManager> {
    if (!DatabaseManager.instance) {
      // Ensure directory exists
      const dbDir = path.dirname(dbPath);
      await import('fs/promises').then(fs => fs.mkdir(dbDir, { recursive: true }));
      
      DatabaseManager.instance = new DatabaseManager(dbPath);
      
      // Verify and create missing tables
      await DatabaseManager.instance.verifyAndCreateTables();

      // Log initialization status
      try {
        const count = await DatabaseManager.instance.get<{
          count: number;
        }>('SELECT COUNT(*) as count FROM projects');
        logger.log(`Database initialized with ${count?.count || 0} projects`);
      } catch (err) {
        logger.log(`Error checking project count: ${err}`);
      }
    }
    return DatabaseManager.instance;
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return DatabaseManager.instance;
  }

  async prepare(sql: string): Promise<Statement> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(sql, (err: Error | null) => {
        if (err) reject(err);
        else {
          const wrappedStmt: Statement = {
            run: (...params: any[]) => new Promise((res, rej) => {
              stmt.run(...params, function(this: {
                lastID: number;
                changes: number;
              }, err: Error | null) {
                if (err) rej(err);
                else res({
                  lastID: this.lastID,
                  changes: this.changes
                });
              });
            }),
            get: (...params: any[]) => new Promise((res, rej) => {
              stmt.get(...params, (err: Error | null, row: any) => {
                if (err) rej(err);
                else res(row);
              });
            }),
            all: (...params: any[]) => new Promise((res, rej) => {
              stmt.all(...params, (err: Error | null, rows: any[]) => {
                if (err) rej(err);
                else res(rows);
              });
            }),
            finalize: () => new Promise((res, rej) => {
              stmt.finalize((err: Error | null) => {
                if (err) rej(err);
                else res();
              });
            })
          };
          resolve(wrappedStmt);
        }
      });
    });
  }

  async transaction<T>(fn: (db: DatabaseManager) => Promise<T>): Promise<T> {
    await this.db.runAsync('BEGIN TRANSACTION');
    try {
      const result = await fn(this);
      await this.db.runAsync('COMMIT');
      return result;
    } catch (error) {
      await this.db.runAsync('ROLLBACK');
      throw error;
    }
  }

  async exec(sql: string): Promise<void> {
    await this.db.execAsync(sql);
  }

  async run(sql: string, ...params: any[]): Promise<RunResult> {
    return this.db.runAsync(sql, ...params);
  }

  async get<T = any>(sql: string, ...params: any[]): Promise<T | undefined> {
    return this.db.getAsync(sql, ...params);
  }

  async all<T = any>(sql: string, ...params: any[]): Promise<T[]> {
    try {
      logger.log(`Executing all() with SQL: ${sql} and params: ${JSON.stringify(params)}`);
      const results = await this.db.allAsync(sql, ...params);
      logger.log(`all() returned ${results?.length || 0} rows`);
      return results;
    } catch (err) {
      logger.log(`Error in all(): ${err}`);
      throw err;
    }
  }

  async vacuum(): Promise<void> {
    await this.exec('VACUUM');
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Helper methods for common operations
  
  async getProject(id: string): Promise<any> {
    return this.get(
      `
      SELECT * FROM projects WHERE id = ?
    `,
      id
    );
  }

  async getProjectByName(name: string): Promise<any> {
    return this.get(
      `
      SELECT * FROM projects WHERE name = ?
    `,
      name
    );
  }

  async listProjects(filters?: {
    type?: string;
    has_repo?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<any[]> {
    try {
      // First check if the table exists and has data
      const tableCheck = await this.get<{
        count: number;
      }>('SELECT COUNT(*) as count FROM sqlite_master WHERE type="table" AND name="projects"');
      logger.log(`Projects table exists check: ${JSON.stringify(tableCheck)}`);

      // Get total count of projects
      const totalCount = await this.get<{
        count: number;
      }>('SELECT COUNT(*) as count FROM projects');
      logger.log(`Total projects count: ${JSON.stringify(totalCount)}`);

      // Build the query
      let sql = 'SELECT * FROM projects WHERE 1=1';
      const params: any[] = [];

      if (filters?.type) {
        sql += ' AND type = ?';
        params.push(filters.type);
      }

      if (filters?.has_repo !== undefined) {
        if (filters.has_repo) {
          sql += ' AND repository_owner IS NOT NULL';
        } else {
          sql += ' AND repository_owner IS NULL';
        }
      }

      if (filters?.page !== undefined && filters?.page_size !== undefined) {
        const offset = (filters.page - 1) * filters.page_size;
        sql += ' LIMIT ? OFFSET ?';
        params.push(filters.page_size, offset);
      }

      logger.log(`Executing SQL: ${sql} with params: ${JSON.stringify(params)}`);
      const results = await this.all(sql, ...params);
      logger.log(`Query returned ${results.length} projects. First project (if any): ${JSON.stringify(results[0])}`);
      return results;
    } catch (err) {
      logger.log(`Error in listProjects: ${err}`);
      throw err;
    }
  }

  async getProjectSourceFiles(projectId: string): Promise<any[]> {
    return this.all(
      `
      SELECT * FROM source_files WHERE project_id = ?
    `,
      projectId
    );
  }

  async getProjectChanges(projectId: string, committed = false): Promise<any[]> {
    return this.all(
      `
      SELECT c.*, GROUP_CONCAT(cf.file_path) as files
      FROM changes c
      LEFT JOIN change_files cf ON c.id = cf.change_id
      WHERE c.project_id = ? AND c.committed = ?
      GROUP BY c.id
    `,
      projectId,
      committed ? 1 : 0
    );
  }

  async getProjectNotes(projectId: string): Promise<any[]> {
    return this.all(
      `
      SELECT * FROM notes WHERE project_id = ?
    `,
      projectId
    );
  }

  async getGitHubAccount(owner: string): Promise<any> {
    return this.get(
      `
      SELECT * FROM github_accounts WHERE owner = ?
    `,
      owner
    );
  }

  async listGitHubAccounts(): Promise<any[]> {
    return this.all(
      `
      SELECT owner, default_branch FROM github_accounts
    `
    );
  }

  private async tableExists(tableName: string): Promise<boolean> {
    const result = await this.get<{
      count: number;
    }>(
      'SELECT COUNT(*) as count FROM sqlite_master WHERE type="table" AND name=?',
      tableName
    );
    return result?.count === 1;
  }

  public async verifyAndCreateTables(): Promise<void> {
    logger.log('Verifying database tables...');
    
    // Check and create tables in order
    const tableChecks = [
      {
        name: 'notes',
        sql: schema.notes
      },
      {
        name: 'projects',
        sql: schema.projects
      },
      {
        name: 'source_files',
        sql: schema.source_files
      },
      {
        name: 'changes',
        sql: schema.changes
      },
      {
        name: 'change_files',
        sql: schema.change_files
      },
      {
        name: 'github_accounts',
        sql: schema.github_accounts
      }
    ];
    
    for (const table of tableChecks) {
      const exists = await this.tableExists(table.name);
      if (!exists) {
        logger.log(`Creating missing table: ${table.name}`);
        await this.exec(table.sql);
      } else {
        logger.log(`Table ${table.name} exists`);
      }
    }

    // Create or update indexes
    logger.log('Verifying indexes...');
    const { indexes } = schema;
    await this.exec(indexes.projects_name_idx);
    await this.exec(indexes.source_files_project_idx);
    await this.exec(indexes.changes_project_idx);
    await this.exec(indexes.changes_timestamp_idx);
    await this.exec(indexes.change_files_change_idx);

    // Create notes indexes
    await this.exec('CREATE INDEX IF NOT EXISTS notes_project_idx ON notes(project_id)');
    await this.exec('CREATE INDEX IF NOT EXISTS notes_category_idx ON notes(category)');
  }
}

async function initializeDatabase(db: DatabaseManager): Promise<void> {
  await db.verifyAndCreateTables();
}
