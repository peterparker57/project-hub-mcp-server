import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ProjectManager } from '../services/project-manager.js';

export class ProjectHandler {
  constructor(private projectManager: ProjectManager) {}

  getToolDefinitions() {
    return [
      {
        name: 'create_project',
        description: 'Create a new project',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Project name',
            },
            path: {
              type: 'string',
              description: 'Local project path',
            },
            type: {
              type: 'string',
              description: 'Project type',
            },
            description: {
              type: 'string',
              description: 'Project description',
            },
          },
          required: ['name', 'path', 'type', 'description'],
        },
      },
      {
        name: 'list_projects',
        description: 'List projects with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Filter by project type',
            },
            has_repo: {
              type: 'boolean',
              description: 'Filter by repository existence',
            },
            page: {
              type: 'number',
              description: 'Page number (1-based)',
              minimum: 1,
              default: 1,
            },
            page_size: {
              type: 'number',
              description: 'Number of items per page',
              minimum: 1,
              maximum: 100,
              default: 50,
            },
          },
        },
      },
      {
        name: 'delete_project',
        description: 'Delete a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project ID',
            },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'record_change',
        description: 'Record a change in a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project ID',
            },
            type: {
              type: 'string',
              description: 'Change type',
            },
            description: {
              type: 'string',
              description: 'Change description',
            },
          },
          required: ['projectId', 'type', 'description'],
        },
      },
      {
        name: 'get_pending_changes',
        description: 'Get pending changes for a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project ID',
            },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'clear_committed_changes',
        description: 'Clear committed changes for a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project ID',
            },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'find_project',
        description: 'Find a project by name',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Project name to search for',
            },
          },
          required: ['name'],
        },
      },
    ];
  }

  async handleFindProject(args: { name: string }) {
    const project = await this.projectManager.findProject(args.name);
    if (!project) {
      throw new McpError(ErrorCode.InvalidRequest, `Project '${args.name}' not found`);
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(project, null, 2) }],
    };
  }

  async handleCreateProject(args: {
    name: string;
    path: string;
    type: string;
    description: string;
  }) {
    await this.projectManager.createProject(args);
    return {
      content: [{ type: 'text', text: 'Project created successfully' }],
    };
  }

  async handleGetProject(args: { projectId: string }) {
    const project = await this.projectManager.getProject(args.projectId);
    return {
      content: [{ type: 'text', text: JSON.stringify(project, null, 2) }],
    };
  }

  async handleListProjects(args: {
    type?: string;
    has_repo?: boolean;
    page?: number;
    page_size?: number;
  }) {
    const projects = await this.projectManager.listProjects(args);
    return {
      content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }],
    };
  }

  async handleDeleteProject(args: { projectId: string }) {
    try {
      await this.projectManager.deleteProject(args.projectId);
      return {
        content: [{ type: 'text', text: 'Project deleted successfully' }],
      };
    } catch (error: unknown) {
      if ((error as Error)?.message?.includes('FOREIGN KEY constraint failed')) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'Cannot delete project due to foreign key constraints. This usually means there are related records (notes, files, or changes) that need to be deleted first.'
        );
      }
      if ((error as any)?.isProjectNotFound) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          (error as Error).message
        );
      }
      throw error;
    }
  }

  async handleRecordChange(args: {
    projectId: string;
    type: string;
    description: string;
  }) {
    await this.projectManager.recordChange(args.projectId, {
      type: args.type as any,
      description: args.description,
    });
    return {
      content: [{ type: 'text', text: 'Change recorded successfully' }],
    };
  }

  async handleGetPendingChanges(args: { projectId: string }) {
    const changes = await this.projectManager.getPendingChanges(args.projectId);
    return {
      content: [{ type: 'text', text: JSON.stringify(changes, null, 2) }],
    };
  }

  async handleClearCommittedChanges(args: { projectId: string }) {
    await this.projectManager.clearCommittedChanges(args.projectId, '');
    return {
      content: [{ type: 'text', text: 'Committed changes cleared successfully' }],
    };
  }
}
