#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import { ProjectManager } from './services/project-manager.js';
import { GitHubService } from './services/github-service.js';
import { Project, GitHubConfig, ChangeType } from './types/index.js';
import {
  CreateProjectArgs,
  RecordChangeArgs,
  GetPendingChangesArgs,
  ClearCommittedChangesArgs,
  LinkRepositoryArgs,
  GetProjectArgs,
  ListProjectsArgs,
  HandleGitHubCommitArgs,
  SetGitHubAccountArgs,
} from './types/tools.js';

function isValidArgs<T>(args: unknown, requiredKeys: (keyof T)[]): args is T {
  if (!args || typeof args !== 'object') return false;
  return requiredKeys.every(key => key in args);
}

class ProjectHubServer {
  private server: Server;
  private projectManager: ProjectManager;
  private githubService?: GitHubService;

  constructor() {
    this.server = new Server(
      {
        name: 'project-hub',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {
            create_project: true,
            record_change: true,
            get_pending_changes: true,
            clear_committed_changes: true,
            list_accounts: true,
            select_account: true,
            set_github_account: true,
            create_repository: true,
            link_repository: true,
            clone_repository: true,
            get_file: true,
            create_commit: true,
            list_commits: true,
            get_commit: true,
            revert_commit: true,
            get_project: true,
            list_projects: true,
            delete_project: true,
            delete_repository: true,
            scan_source_files: true,
            record_source_change: true,
            update_source_settings: true
          },
        },
      }
    );

    const statePath = path.join(process.env.APPDATA || process.env.HOME || '', '.project-hub', 'state.json');
    this.projectManager = new ProjectManager({ statePath });

    // Initialize GitHub service with default account if available
    const defaultOwner = process.env.DEFAULT_OWNER;
    if (defaultOwner) {
      const token = process.env[`GITHUB_TOKEN_${defaultOwner}`];
      if (token) {
        this.githubService = new GitHubService({ owner: defaultOwner, token });
      }
    }

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Project Management Tools
        {
          name: 'create_project',
          description: 'Create a new project',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' },
              path: { type: 'string', description: 'Local project path' },
              type: { type: 'string', description: 'Project type' },
              description: { type: 'string', description: 'Project description' }
            },
            required: ['name', 'path', 'type', 'description']
          }
        },
        {
          name: 'record_change',
          description: 'Record a change to a project',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string', description: 'Project name' },
              description: { type: 'string', description: 'Description of the change' },
              files: {
                type: 'array',
                items: { type: 'string' },
                description: 'Files affected by the change'
              },
              type: { type: 'string', description: 'Type of change (e.g., feature, bugfix, refactor)' }
            },
            required: ['project_name', 'description']
          }
        },
        {
          name: 'get_pending_changes',
          description: 'Get uncommitted changes for a project',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string', description: 'Project name' }
            },
            required: ['project_name']
          }
        },
        {
          name: 'clear_committed_changes',
          description: 'Mark changes as committed with a specific commit SHA',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string', description: 'Project name' },
              commit_sha: { type: 'string', description: 'SHA of the commit' }
            },
            required: ['project_name', 'commit_sha']
          }
        },
        {
          name: 'get_pending_changes',
          description: 'Get uncommitted changes for a project',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string', description: 'Project name' }
            },
            required: ['project_name']
          }
        },
        {
          name: 'clear_committed_changes',
          description: 'Clear changes that have been committed',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string', description: 'Project name' },
              commit_sha: { type: 'string', description: 'SHA of the commit' }
            },
            required: ['project_name', 'commit_sha']
          }
        },
        // GitHub Account Management
        {
          name: 'list_accounts',
          description: 'List available GitHub accounts',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'set_github_account',
          description: 'Add or update a GitHub account',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'GitHub account owner' },
              token: { type: 'string', description: 'GitHub personal access token' }
            },
            required: ['owner', 'token']
          }
        },
        {
          name: 'select_account',
          description: 'Select a GitHub account to use',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'GitHub account owner' }
            },
            required: ['owner']
          }
        },
        // Repository Management
        {
          name: 'create_repository',
          description: 'Create a new GitHub repository',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Repository name' },
              description: { type: 'string', description: 'Repository description' },
              private: { type: 'boolean', description: 'Whether the repository is private' }
            },
            required: ['name', 'description']
          }
        },
        {
          name: 'link_repository',
          description: 'Link a GitHub repository to a project',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string', description: 'Project name' },
              repo_owner: { type: 'string', description: 'Repository owner' },
              repo_name: { type: 'string', description: 'Repository name' }
            },
            required: ['project_name', 'repo_owner', 'repo_name']
          }
        },
        {
          name: 'clone_repository',
          description: 'Clone a GitHub repository',
          inputSchema: {
            type: 'object',
            properties: {
              repo: { type: 'string', description: 'Repository name' },
              output_dir: { type: 'string', description: 'Output directory' },
              branch: { type: 'string', description: 'Branch to clone' }
            },
            required: ['repo', 'output_dir']
          }
        },
        // File Operations
        {
          name: 'get_file',
          description: 'Get a file from a GitHub repository',
          inputSchema: {
            type: 'object',
            properties: {
              repo: { type: 'string', description: 'Repository name' },
              path: { type: 'string', description: 'File path' },
              branch: { type: 'string', description: 'Branch name' }
            },
            required: ['repo', 'path']
          }
        },
        {
          name: 'create_commit',
          description: 'Create a commit with multiple file changes',
          inputSchema: {
            type: 'object',
            properties: {
              repo: { type: 'string', description: 'Repository name' },
              changes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    path: { type: 'string', description: 'File path in repository' },
                    operation: { type: 'string', enum: ['add', 'modify', 'delete'] },
                    sourcePath: { type: 'string', description: 'Local file path' }
                  },
                  required: ['path', 'operation']
                }
              },
              message: { type: 'string', description: 'Commit message' },
              branch: { type: 'string', description: 'Target branch' },
              author: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' }
                }
              }
            },
            required: ['repo', 'changes', 'message']
          }
        },
        {
          name: 'list_commits',
          description: 'List commits in a repository',
          inputSchema: {
            type: 'object',
            properties: {
              repo: { type: 'string', description: 'Repository name' },
              branch: { type: 'string', description: 'Branch name' },
              path: { type: 'string', description: 'File path filter' },
              since: { type: 'string', description: 'Start date' },
              until: { type: 'string', description: 'End date' },
              author: { type: 'string', description: 'Author filter' }
            },
            required: ['repo']
          }
        },
        {
          name: 'get_commit',
          description: 'Get details of a specific commit',
          inputSchema: {
            type: 'object',
            properties: {
              repo: { type: 'string', description: 'Repository name' },
              sha: { type: 'string', description: 'Commit SHA' }
            },
            required: ['repo', 'sha']
          }
        },
        {
          name: 'revert_commit',
          description: 'Revert a commit',
          inputSchema: {
            type: 'object',
            properties: {
              repo: { type: 'string', description: 'Repository name' },
              sha: { type: 'string', description: 'Commit SHA to revert' },
              message: { type: 'string', description: 'Revert commit message' },
              branch: { type: 'string', description: 'Target branch' }
            },
            required: ['repo', 'sha', 'message']
          }
        },
        // Project Info
        {
          name: 'get_project',
          description: 'Get project details including repository info',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' }
            },
            required: ['name']
          }
        },
        {
          name: 'list_projects',
          description: 'List all projects',
          inputSchema: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Filter by project type' },
              has_repo: { type: 'boolean', description: 'Filter by repository presence' }
            }
          }
        },
        {
          name: 'delete_project',
          description: 'Delete a project',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name' }
            },
            required: ['name']
          }
        },
        {
          name: 'delete_repository',
          description: 'Delete a GitHub repository',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Repository name' }
            },
            required: ['name']
          }
        },
        {
          name: 'scan_source_files',
          description: 'Scan and update source files for a project',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string', description: 'Project name' }
            },
            required: ['project_name']
          }
        },
        {
          name: 'record_source_change',
          description: 'Record a change to a source file',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string', description: 'Project name' },
              file_path: { type: 'string', description: 'Path to the changed file' },
              description: { type: 'string', description: 'Description of the change' },
              type: {
                type: 'string',
                enum: ['feature', 'bugfix', 'refactor', 'documentation', 'other'],
                description: 'Type of change'
              },
              lines: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    start: { type: 'number', description: 'Start line number' },
                    end: { type: 'number', description: 'End line number' },
                    content: { type: 'string', description: 'Changed content' },
                    operation: {
                      type: 'string',
                      enum: ['add', 'remove', 'modify'],
                      description: 'Type of line change'
                    }
                  },
                  required: ['start', 'end', 'content', 'operation']
                },
                description: 'Changed lines'
              }
            },
            required: ['project_name', 'file_path', 'description', 'type', 'lines']
          }
        },
        {
          name: 'update_source_settings',
          description: 'Update source file tracking settings for a project',
          inputSchema: {
            type: 'object',
            properties: {
              project_name: { type: 'string', description: 'Project name' },
              auto_commit: { type: 'boolean', description: 'Whether to auto-commit changes' },
              ignore_patterns: {
                type: 'array',
                items: { type: 'string' },
                description: 'Patterns to ignore during file scanning'
              }
            },
            required: ['project_name']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const args = request.params.arguments;
        if (!args) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
        }

        // Ensure GitHub service is available for GitHub operations
        const needsGitHub = [
          'create_repository', 'clone_repository', 'get_file', 'create_commit',
          'list_commits', 'get_commit', 'revert_commit'
        ];
        
        if (needsGitHub.includes(request.params.name) && !this.githubService) {
          throw new McpError(ErrorCode.InvalidRequest, 'GitHub service not configured');
        }

        switch (request.params.name) {
          // Project Management
          case 'create_project': {
            if (!isValidArgs<CreateProjectArgs>(args, ['name', 'path', 'type', 'description'])) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid create_project arguments');
            }
            const project = await this.projectManager.createProject(args);
            return { content: [{ type: 'text', text: JSON.stringify(project) }] };
          }

          case 'record_change': {
            if (!isValidArgs<RecordChangeArgs>(args, ['project_name', 'description'])) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid record_change arguments');
            }
            const change = await this.projectManager.recordChange(args.project_name, {
              description: args.description,
              files: args.files,
              type: args.type
            });
            return { content: [{ type: 'text', text: JSON.stringify(change) }] };
          }

          case 'get_pending_changes': {
            if (!isValidArgs<{ project_name: string }>(args, ['project_name'])) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid get_pending_changes arguments');
            }
            const project = await this.projectManager.getProject(args.project_name);
            if (!project) {
              throw new McpError(ErrorCode.InvalidParams, `Project ${args.project_name} not found`);
            }
            const pendingChanges = project.changes.filter(change => !change.committed);
            return { content: [{ type: 'text', text: JSON.stringify(pendingChanges) }] };
          }

          case 'clear_committed_changes': {
            if (!isValidArgs<{ project_name: string; commit_sha: string }>(args, ['project_name', 'commit_sha'])) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid clear_committed_changes arguments');
            }
            const project = await this.projectManager.getProject(args.project_name);
            if (!project) {
              throw new McpError(ErrorCode.InvalidParams, `Project ${args.project_name} not found`);
            }
            project.changes = project.changes.map(change => ({
              ...change,
              committed: true,
              commitSha: args.commit_sha
            }));
            await this.projectManager.updateProject(args.project_name, project);
            return { content: [{ type: 'text', text: 'Changes marked as committed' }] };
          }

          // GitHub Account Management
          case 'list_accounts': {
            const accounts = this.projectManager.listAccounts();
            return { content: [{ type: 'text', text: JSON.stringify(accounts) }] };
          }

          case 'set_github_account': {
            if (!isValidArgs<SetGitHubAccountArgs>(args, ['owner', 'token'])) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid set_github_account arguments');
            }
            await this.projectManager.setGitHubAccount(args.owner, args.token);
            return { content: [{ type: 'text', text: `Added GitHub account: ${args.owner}` }] };
          }

          case 'select_account': {
            if (!isValidArgs<{ owner: string }>(args, ['owner'])) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid select_account arguments');
            }
            await this.projectManager.selectGitHubAccount(args.owner);
            const token = process.env[`GITHUB_TOKEN_${args.owner}`];
            if (token) {
              this.githubService = new GitHubService({ owner: args.owner, token });
            }
            return { content: [{ type: 'text', text: `Selected account: ${args.owner}` }] };
          }

          // Repository Operations
          case 'create_repository': {
            if (!this.githubService) throw new McpError(ErrorCode.InvalidRequest, 'GitHub service not configured');
            const result = await this.githubService.createRepository(
              args.name as string,
              args.description as string,
              args.private as boolean
            );
            return { content: [{ type: 'text', text: JSON.stringify(result) }] };
          }

          case 'clone_repository': {
            if (!this.githubService) throw new McpError(ErrorCode.InvalidRequest, 'GitHub service not configured');
            await this.githubService.cloneRepository(
              args.repo as string,
              args.output_dir as string,
              args.branch as string
            );
            return { content: [{ type: 'text', text: 'Repository cloned successfully' }] };
          }

          case 'link_repository': {
            if (!isValidArgs<LinkRepositoryArgs>(args, ['project_name', 'repo_owner', 'repo_name'])) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid link_repository arguments');
            }
            const project = await this.projectManager.linkRepository(
              args.project_name,
              args.repo_owner,
              args.repo_name
            );
            return { content: [{ type: 'text', text: JSON.stringify(project) }] };
          }

          case 'get_file': {
            if (!this.githubService) throw new McpError(ErrorCode.InvalidRequest, 'GitHub service not configured');
            const result = await this.githubService.getFile(
              args.repo as string,
              args.path as string,
              args.branch as string
            );
            return { content: [{ type: 'text', text: JSON.stringify(result) }] };
          }

          case 'create_commit': {
            if (!this.githubService) throw new McpError(ErrorCode.InvalidRequest, 'GitHub service not configured');
            const result = await this.githubService.createCommit(
              args.repo as string,
              args.changes as any[],
              {
                message: args.message as string,
                branch: args.branch as string,
                author: args.author as any
              }
            );
            return { content: [{ type: 'text', text: JSON.stringify(result) }] };
          }

          case 'list_commits': {
            if (!this.githubService) throw new McpError(ErrorCode.InvalidRequest, 'GitHub service not configured');
            const commits = await this.githubService.listCommits(args.repo as string, args as any);
            return { content: [{ type: 'text', text: JSON.stringify(commits) }] };
          }

          case 'get_commit': {
            if (!this.githubService) throw new McpError(ErrorCode.InvalidRequest, 'GitHub service not configured');
            const commit = await this.githubService.getCommit(
              args.repo as string,
              args.sha as string
            );
            return { content: [{ type: 'text', text: JSON.stringify(commit) }] };
          }

          case 'revert_commit': {
            if (!this.githubService) throw new McpError(ErrorCode.InvalidRequest, 'GitHub service not configured');
            const result = await this.githubService.revertCommit(
              args.repo as string,
              args.sha as string,
              args.message as string,
              args.branch as string
            );
            return { content: [{ type: 'text', text: JSON.stringify(result) }] };
          }

          // Project Info
          case 'get_project': {
            if (!isValidArgs<GetProjectArgs>(args, ['name'])) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid get_project arguments');
            }
            const projectDetails = await this.projectManager.getProject(args.name);
            return { content: [{ type: 'text', text: JSON.stringify(projectDetails) }] };
          }

          case 'list_projects': {
            const typedArgs = args as ListProjectsArgs;
            const projects = await this.projectManager.listProjects({
              type: typedArgs.type,
              hasRepo: typedArgs.has_repo
            });
            return { content: [{ type: 'text', text: JSON.stringify(projects) }] };
          }

          case 'delete_project': {
            if (!isValidArgs<{ name: string }>(args, ['name'])) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid delete_project arguments');
            }
            await this.projectManager.deleteProject(args.name);
            return { content: [{ type: 'text', text: `Project ${args.name} deleted` }] };
          }

          case 'delete_repository': {
            if (!this.githubService) throw new McpError(ErrorCode.InvalidRequest, 'GitHub service not configured');
            if (!isValidArgs<{ name: string }>(args, ['name'])) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid delete_repository arguments');
            }
            await this.githubService.deleteRepository(args.name);
            return { content: [{ type: 'text', text: `Repository ${args.name} deleted` }] };
          }

          case 'scan_source_files': {
            if (!isValidArgs<{ project_name: string }>(args, ['project_name'])) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid scan_source_files arguments');
            }
            const sourceFiles = await this.projectManager.rescanSourceFiles(args.project_name);
            return { content: [{ type: 'text', text: JSON.stringify(sourceFiles) }] };
          }

          case 'record_source_change': {
            if (!isValidArgs<{
              project_name: string;
              file_path: string;
              description: string;
              type: string;
              lines: any[];
            }>(args, ['project_name', 'file_path', 'description', 'type', 'lines'])) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid record_source_change arguments');
            }
            const change = await this.projectManager.recordSourceFileChange(
              args.project_name,
              args.file_path,
              {
                description: args.description,
                type: args.type as ChangeType,
                lines: args.lines
              }
            );
            return { content: [{ type: 'text', text: JSON.stringify(change) }] };
          }

          case 'update_source_settings': {
            if (!isValidArgs<{
              project_name: string;
              auto_commit?: boolean;
              ignore_patterns?: string[];
            }>(args, ['project_name'])) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid update_source_settings arguments');
            }
            const settings = await this.projectManager.updateSourceFileSettings(args.project_name, {
              autoCommit: args.auto_commit,
              ignorePatterns: args.ignore_patterns
            });
            return { content: [{ type: 'text', text: JSON.stringify(settings) }] };
          }

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
        }
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: error.message }],
          isError: true
        };
      }
    });
  }

  async run() {
    await this.projectManager.initialize();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('ProjectHub MCP server running on stdio');
  }
}

const server = new ProjectHubServer();
server.run().catch(console.error);