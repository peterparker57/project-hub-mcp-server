export type SchemaIndexes = {
  projects_name_idx: string;
  source_files_project_idx: string;
  changes_project_idx: string;
  changes_timestamp_idx: string;
  change_files_change_idx: string;
};

export type SchemaType = {
  notes: string;
  projects: string;
  source_files: string;
  changes: string;
  change_files: string;
  github_accounts: string;
  indexes: SchemaIndexes;
};

export const schema: SchemaType = {
  notes: `
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      tags TEXT, -- JSON array of tags
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      exported BOOLEAN DEFAULT FALSE,
      export_path TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `,

  projects: `
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      path TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      status TEXT,
      last_commit TEXT,
      technologies TEXT, -- JSON array
      repository_owner TEXT,
      repository_name TEXT,
      settings TEXT, -- JSON object for ProjectSettings
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,

  source_files: `
    CREATE TABLE IF NOT EXISTS source_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      path TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      type TEXT NOT NULL,
      language TEXT,
      last_modified DATETIME,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `,

  changes: `
    CREATE TABLE IF NOT EXISTS changes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      timestamp DATETIME NOT NULL,
      committed BOOLEAN DEFAULT FALSE,
      commit_sha TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `,

  change_files: `
    CREATE TABLE IF NOT EXISTS change_files (
      change_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      PRIMARY KEY (change_id, file_path),
      FOREIGN KEY (change_id) REFERENCES changes(id)
    )
  `,

  github_accounts: `
    CREATE TABLE IF NOT EXISTS github_accounts (
      owner TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      default_branch TEXT
    )
  `,

  // Indexes for better query performance
  indexes: {
    projects_name_idx: `CREATE INDEX IF NOT EXISTS projects_name_idx ON projects(name COLLATE NOCASE)`,
    source_files_project_idx: `CREATE INDEX IF NOT EXISTS source_files_project_idx ON source_files(project_id)`,
    changes_project_idx: `CREATE INDEX IF NOT EXISTS changes_project_idx ON changes(project_id)`,
    changes_timestamp_idx: `CREATE INDEX IF NOT EXISTS changes_timestamp_idx ON changes(timestamp)`,
    change_files_change_idx: `CREATE INDEX IF NOT EXISTS change_files_change_idx ON change_files(change_id)`
  }
};

export const initializeDatabase = async (db: any): Promise<void> => {
  // Create tables
  db.exec(schema.projects);
  db.exec(schema.source_files);
  db.exec(schema.changes);
  db.exec(schema.change_files);
  db.exec(schema.github_accounts);

  // Create tables
  db.exec(schema.notes);
  db.exec(schema.projects);
  db.exec(schema.source_files);
  db.exec(schema.changes);
  db.exec(schema.change_files);
  db.exec(schema.github_accounts);

  // Create indexes
  for (const index of Object.values(schema.indexes)) {
    db.exec(index);
  }

  // Add notes indexes
  db.exec('CREATE INDEX IF NOT EXISTS notes_project_idx ON notes(project_id)');
  db.exec('CREATE INDEX IF NOT EXISTS notes_category_idx ON notes(category)');
};