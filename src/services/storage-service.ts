import { DatabaseManager } from '../db/database.js';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

export interface ProjectMetadata {
  id: string;
  name: string;
  path: string;
  type: string;
  description?: string;
  repository?: {
    owner: string;
    name: string;
  };
  created_at: string;
  changes?: Change[]; // Add optional changes property
  notes?: any[];    // Add optional notes property (using 'any' for now, refine later)
}

export interface SourceFile {
  path: string;
  relativePath: string;
  type: string;
  language: string;
  lastModified: string;
}

export interface Change {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  committed: boolean;
  commitSha?: string;
  files?: string[];
}

export class StorageService {
  private basePath: string;
  private projectsCache: Record<string, ProjectMetadata> | null = null;

  constructor() {
    this.basePath = path.join(process.env.APPDATA || process.env.HOME || '', '.project-hub');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [
      this.basePath,
      path.join(this.basePath, 'projects')
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private ensureProjectDirectory(projectId: string): void {
    const projectDir = path.join(this.basePath, 'projects', projectId);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
  }

  // Project metadata operations
  async listProjects(page: number, pageSize: number, type?: string): Promise<{
    items: ProjectMetadata[];
    total: number;
  }> {
    const projects = await this.loadAllProjectMetadata();
    let filteredProjects = Object.values(projects);
    
    if (type) {
      filteredProjects = filteredProjects.filter(p => p.type === type);
    }

    const total = filteredProjects.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const items = filteredProjects.slice(start, end);

    return {
      items: items,
      total: total
    };
  }

  private async loadAllProjectMetadata(): Promise<Record<string, ProjectMetadata>> {
    if (this.projectsCache) {
      return this.projectsCache;
    }

    const projectsFile = path.join(this.basePath, 'projects.json');
    if (!fs.existsSync(projectsFile)) {
      return {};
    }

    try {
      const content = await fs.promises.readFile(projectsFile, 'utf-8');
      const projects = JSON.parse(content);
      this.projectsCache = projects;
      return projects;
    } catch (error) {
      logger.log(`Error loading projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {};
    }
  }

  async saveProject(project: ProjectMetadata): Promise<void> {
    const projects = await this.loadAllProjectMetadata();
    projects[project.id] = project;
    this.projectsCache = projects;
    
    const projectsFile = path.join(this.basePath, 'projects.json');
    await fs.promises.writeFile(projectsFile, JSON.stringify(projects, null, 2));
    
    // Ensure project directory exists
    this.ensureProjectDirectory(project.id);
  }

  private async loadProjectChanges(projectId: string): Promise<Change[]> {
    logger.log(`loadProjectChanges called for project ID: ${projectId}`); // Add logging
    const db = DatabaseManager.getInstance();
    const changes = await db.getProjectChanges(projectId) as any[]; // Call DatabaseManager.getProjectChanges
    logger.log(`loadProjectChanges returning ${changes.length} changes`); // Add logging
    return changes;
  }

  private async loadProjectNotes(projectId: string): Promise<any[]> {
    logger.log(`loadProjectNotes called for project ID: ${projectId}`); // Add logging
    const db = DatabaseManager.getInstance();
    const notes = await db.getProjectNotes(projectId) as any[];    // Call DatabaseManager.getProjectNotes
    logger.log(`loadProjectNotes returning ${notes.length} notes`); // Add logging
    return notes;
  }

  private normalizeString(str: string): string {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  async findProject(name: string): Promise<ProjectMetadata | null> {
    const projects = await this.loadAllProjectMetadata();
    const normalizedSearchName = this.normalizeString(name);

    // Exact match
    let project = Object.values(projects).find(p => this.normalizeString(p.name) === normalizedSearchName);
    if (project) {
      if (!project) {
        return null;
      }

      const changes = await this.loadProjectChanges(project.id); // Hypothetical method
      const notes = await this.loadProjectNotes(project.id);     // Hypothetical method

      return {
        ...project,
        changes,
        notes
      };
    }

    // Partial match
    project = Object.values(projects).find(p => this.normalizeString(p.name).includes(normalizedSearchName));
    if (project) {
      if (!project) {
        return null;
      }

      const changes = await this.loadProjectChanges(project.id); // Hypothetical method
      const notes = await this.loadProjectNotes(project.id);     // Corrected typo: project.id

      return {
        ...project,
        changes,
        notes
      };
    }

    return null;
  }
}
