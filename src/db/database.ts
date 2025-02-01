// ... [Previous imports and type definitions] ...

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
      this.db.run('PRAGMA foreign_keys = ON');
      this.db.run('PRAGMA journal_mode = WAL');
    } catch (err) {
      logger.log(`Error setting PRAGMA: ${err}`);
    }

    // Promisify database methods
    this.db.runAsync = promisify(this.db.run).bind(this.db);
    this.db.getAsync = promisify(this.db.get).bind(this.db);
    this.db.allAsync = promisify(this.db.all).bind(this.db);
    this.db.execAsync = promisify(this.db.exec).bind(this.db);
  }

  static async initialize(dbPath: string): Promise<DatabaseManager> {
    if (!DatabaseManager.instance) {
      const dbDir = path.dirname(dbPath);
      await import('fs/promises').then(fs => fs.mkdir(dbDir, { recursive: true }));
      
      DatabaseManager.instance = new DatabaseManager(dbPath);
      
      // Verify and create missing tables
      await DatabaseManager.instance.verifyAndCreateTables();

      // Log initialization status
      try {
        const count = await DatabaseManager.instance.get<{ count: number }>('SELECT COUNT(*) as count FROM projects');
        logger.log(`Database initialized with ${count?.count || 0} projects`);
      } catch (err) {
        logger.log(`Error checking project count: ${err}`);
      }
    }
    return DatabaseManager.instance;
  }

  private async tableExists(tableName: string): Promise<boolean> {
    const result = await this.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM sqlite_master WHERE type="table" AND name=?',
      tableName
    );
    return result?.count === 1;
  }

  public async verifyAndCreateTables(): Promise<void> {
    logger.log('Verifying database tables...');
    
    // Check and create tables in order
    const tableChecks = [
      { name: 'notes', sql: schema.notes },
      { name: 'projects', sql: schema.projects },
      { name: 'source_files', sql: schema.source_files },
      { name: 'changes', sql: schema.changes },
      { name: 'change_files', sql: schema.change_files },
      { name: 'github_accounts', sql: schema.github_accounts }
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

  // ... [Rest of the DatabaseManager implementation] ...
}
