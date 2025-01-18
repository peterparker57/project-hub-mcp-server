import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  Project,
  ProjectState,
  Change,
  ProjectManagerOptions,
  GitHubConfig,
  SourceFile,
  SourceFileChange,
  ChangedLines,
  ChangeType,
  ProjectSettings
} from '../types/index.js';
import { SourceScanner } from './source-scanner.js';

export class ProjectManager {
  private state: ProjectState;
  private statePath: string;
  private autoSave: boolean;

  constructor(options: ProjectManagerOptions) {
    this.statePath = options.statePath;
    this.autoSave = options.autoSave ?? true;
    this.state = {
      projects: {},
      accounts: {}
    };
  }

  async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.statePath, 'utf-8');
      this.state = JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, use default empty state
      await this.saveState();
    }
  }

  private async saveState(): Promise<void> {
    const dir = path.dirname(this.statePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.statePath, JSON.stringify(this.state, null, 2));
  }

  async createProject(project: Omit<Project, 'changes' | 'sourceFiles' | 'settings'>): Promise<Project> {
    const scanner = new SourceScanner();
    const sourceFiles = await scanner.scanDirectory(project.path);

    const newProject: Project = {
      ...project,
      changes: [],
      sourceFiles,
      settings: {
        autoCommit: true,
        ignorePatterns: []
      }
    };

    this.state.projects[project.name] = newProject;
    if (this.autoSave) await this.saveState();
    return newProject;
  }

  async recordSourceFileChange(
    projectName: string,
    filePath: string,
    change: {
      description: string;
      type: ChangeType;
      lines: ChangedLines[];
    }
  ): Promise<SourceFileChange> {
    const project = this.state.projects[projectName];
    if (!project) {
      throw new Error(`Project ${projectName} not found`);
    }

    const sourceFile = project.sourceFiles?.find(f => f.path === filePath);
    if (!sourceFile) {
      throw new Error(`File ${filePath} not found in project ${projectName}`);
    }

    const newChange: SourceFileChange = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      description: change.description,
      type: change.type,
      lines: change.lines
    };

    sourceFile.changes.push(newChange);

    // Also record as legacy change for backward compatibility
    await this.recordChange(projectName, {
      description: change.description,
      type: change.type,
      files: [filePath]
    });

    if (project.settings?.autoCommit) {
      // TODO: Implement auto-commit functionality
    }

    if (this.autoSave) await this.saveState();
    return newChange;
  }

  async rescanSourceFiles(projectName: string): Promise<SourceFile[]> {
    const project = this.state.projects[projectName];
    if (!project) {
      throw new Error(`Project ${projectName} not found`);
    }

    const scanner = new SourceScanner(project.settings?.ignorePatterns);
    const sourceFiles = await scanner.scanDirectory(project.path);

    // Preserve existing changes for files that still exist
    sourceFiles.forEach(newFile => {
      const existingFile = project.sourceFiles?.find(f => f.path === newFile.path);
      if (existingFile) {
        newFile.changes = existingFile.changes;
      }
    });

    project.sourceFiles = sourceFiles;
    if (this.autoSave) await this.saveState();
    return sourceFiles;
  }

  async updateSourceFileSettings(
    projectName: string,
    settings: Partial<ProjectSettings>
  ): Promise<ProjectSettings> {
    const project = this.state.projects[projectName];
    if (!project) {
      throw new Error(`Project ${projectName} not found`);
    }

    // Ensure settings exists with default values
    if (!project.settings) {
      project.settings = {
        autoCommit: true,
        ignorePatterns: []
      };
    }

    // Update settings with new values, ensuring required fields
    project.settings = {
      autoCommit: settings.autoCommit ?? project.settings.autoCommit,
      ignorePatterns: settings.ignorePatterns ?? project.settings.ignorePatterns
    };

    if (settings.ignorePatterns) {
      // Rescan files with new ignore patterns
      await this.rescanSourceFiles(projectName);
    }

    if (this.autoSave) await this.saveState();
    return project.settings;
  }

  async getProject(name: string): Promise<Project | undefined> {
    return this.state.projects[name];
  }

  async listProjects(filters?: { type?: string; hasRepo?: boolean }): Promise<Project[]> {
    let projects = Object.values(this.state.projects);

    if (filters?.type) {
      projects = projects.filter(p => p.type === filters.type);
    }

    if (filters?.hasRepo !== undefined) {
      projects = projects.filter(p => !!p.repository === filters.hasRepo);
    }

    return projects;
  }

  async updateProject(name: string, updates: Partial<Project>): Promise<Project> {
    const project = this.state.projects[name];
    if (!project) {
      throw new Error(`Project ${name} not found`);
    }

    this.state.projects[name] = {
      ...project,
      ...updates,
      changes: updates.changes ?? project.changes
    };

    if (this.autoSave) await this.saveState();
    return this.state.projects[name];
  }

  async recordChange(projectName: string, change: Omit<Change, 'id' | 'timestamp'>): Promise<Change> {
    const project = this.state.projects[projectName];
    if (!project) {
      throw new Error(`Project ${projectName} not found`);
    }

    const newChange: Change = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...change
    };

    project.changes.push(newChange);
    if (this.autoSave) await this.saveState();
    return newChange;
  }

  async getPendingChanges(projectName: string): Promise<Change[]> {
    const project = this.state.projects[projectName];
    if (!project) {
      throw new Error(`Project ${projectName} not found`);
    }

    return project.changes.filter(change => !change.committed);
  }

  async markChangesAsCommitted(projectName: string, commitSha: string): Promise<void> {
    const project = this.state.projects[projectName];
    if (!project) {
      throw new Error(`Project ${projectName} not found`);
    }

    project.changes = project.changes.map(change => 
      change.committed ? change : { ...change, committed: true, commitSha }
    );
    project.lastCommit = commitSha;

    if (this.autoSave) await this.saveState();
  }

  async linkRepository(projectName: string, owner: string, repoName: string): Promise<Project> {
    const project = this.state.projects[projectName];
    if (!project) {
      throw new Error(`Project ${projectName} not found`);
    }

    project.repository = { owner, name: repoName };
    if (this.autoSave) await this.saveState();
    return project;
  }

  async setGitHubAccount(owner: string, token: string): Promise<void> {
    this.state.accounts[owner] = { owner, token };
    if (this.autoSave) await this.saveState();
  }

  async selectGitHubAccount(owner: string): Promise<void> {
    if (!this.state.accounts[owner]) {
      throw new Error(`GitHub account ${owner} not found`);
    }
    this.state.selectedAccount = owner;
    if (this.autoSave) await this.saveState();
  }

  getSelectedAccount(): GitHubConfig | undefined {
    return this.state.selectedAccount ? this.state.accounts[this.state.selectedAccount] : undefined;
  }

  listAccounts(): string[] {
    return Object.keys(this.state.accounts);
  }

  async deleteProject(name: string): Promise<void> {
    if (!this.state.projects[name]) {
      throw new Error(`Project ${name} not found`);
    }
    delete this.state.projects[name];
    if (this.autoSave) await this.saveState();
  }
}