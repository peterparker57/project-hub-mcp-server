export enum FileType {
  Source = 'source',      // src/, lib/, packages/
  Test = 'test',         // test/, tests/, __tests__/
  Config = 'config',     // root level configs, .config/
  Documentation = 'doc', // docs/, doc/
  Build = 'build',      // build/, dist/
  Other = 'other'
}

export enum ChangeType {
  Feature = 'feature',
  Bugfix = 'bugfix',
  Refactor = 'refactor',
  Documentation = 'documentation',
  Other = 'other'
}

export interface ProjectSettings {
  autoCommit: boolean;
  ignorePatterns: string[];  // Like .gitignore patterns
}

export interface SourceFile {
  path: string;
  relativePath: string;     // Path relative to project root
  type: FileType;          // Inferred from location
  language: string;        // From extension
  lastModified: string;
  changes: SourceFileChange[];
}

export interface ChangedLines {
  start: number;
  end: number;
  content: string;
  operation: 'add' | 'remove' | 'modify';
}

export interface SourceFileChange {
  id: string;
  timestamp: string;
  description: string;
  type: ChangeType;
  lines: ChangedLines[];
  commitId?: string;    // Set when change is committed
}

// Legacy change tracking - kept for backward compatibility
export interface Change {
  id: string;
  description: string;
  files?: string[];
  type?: string;
  timestamp: string;
  committed?: boolean;
  commitSha?: string;
}

export interface Project {
  name: string;
  path: string;
  type: string;
  description: string;
  status?: string;
  lastCommit?: string;
  technologies?: string[];
  repository?: Repository;
  changes: Change[];           // Legacy changes
  sourceFiles?: SourceFile[];  // New source file tracking (optional for backward compatibility)
  settings?: ProjectSettings;  // Optional for backward compatibility
}

export interface Repository {
  owner: string;
  name: string;
}

export interface GitHubConfig {
  owner: string;
  token: string;
  defaultBranch?: string;
}

export interface ProjectState {
  projects: { [key: string]: Project };
  selectedAccount?: string;
  accounts: { [key: string]: GitHubConfig };
}

export interface CommitOptions {
  message: string;
  branch?: string;
  author?: {
    name: string;
    email: string;
  };
  sign?: boolean;
}

export interface GitFileChange {
  path: string;
  operation: 'add' | 'modify' | 'delete';
  sourcePath?: string;
}

export interface CommitResult {
  sha: string;
  url: string;
  files: string[];
}

export interface ProjectManagerOptions {
  statePath: string;
  autoSave?: boolean;
}

export interface GitHubServiceOptions {
  defaultBranch?: string;
}