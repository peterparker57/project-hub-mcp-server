# Project Hub MCP Server

An MCP server providing project management and GitHub integration capabilities. This server enables managing local projects, tracking changes, and synchronizing with GitHub repositories.

## Features

- Project creation and management
- Change tracking and version control
- GitHub repository integration
- Source file scanning and monitoring
- Automated commit management
- Multi-account GitHub support

## Tools

### Project Management

#### create_project
Create a new project with local and remote repository management.
- **name**: Project name
- **path**: Local project path
- **type**: Project type
- **description**: Project description

#### get_project
Get project details including repository info.
- **name**: Project name

#### list_projects
List all projects with optional filtering.
- **type**: Filter by project type (optional)
- **has_repo**: Filter by repository presence (optional)

#### delete_project
Delete a project.
- **name**: Project name

### Change Management

#### record_change
Record a change to a project.
- **project_name**: Project name
- **description**: Description of the change
- **files**: Files affected by the change (optional)
- **type**: Type of change (e.g., feature, bugfix, refactor) (optional)

#### get_pending_changes
Get uncommitted changes for a project.
- **project_name**: Project name

#### clear_committed_changes
Mark changes as committed with a specific commit SHA.
- **project_name**: Project name
- **commit_sha**: SHA of the commit

### GitHub Account Management

#### list_accounts
List available GitHub accounts.

#### set_github_account
Add or update a GitHub account.
- **owner**: GitHub account owner
- **token**: GitHub personal access token

#### select_account
Select a GitHub account to use.
- **owner**: GitHub account owner

### Repository Management

#### create_repository
Create a new GitHub repository.
- **name**: Repository name
- **description**: Repository description
- **private**: Whether the repository is private (optional)

#### link_repository
Link a GitHub repository to a project.
- **project_name**: Project name
- **repo_owner**: Repository owner
- **repo_name**: Repository name

#### clone_repository
Clone a GitHub repository.
- **repo**: Repository name
- **output_dir**: Output directory
- **branch**: Branch to clone (optional)

#### rename_repository
Rename a GitHub repository.
- **repo**: Current repository name
- **new_name**: New repository name

#### delete_repository
Delete a GitHub repository.
- **name**: Repository name

### File Operations

#### get_file
Get a file from a GitHub repository.
- **repo**: Repository name
- **path**: File path
- **branch**: Branch name (optional)

### Commit Operations

#### create_commit
Create a commit with multiple file changes.
- **repo**: Repository name
- **changes**: Array of file changes (path, operation, sourcePath)
- **message**: Commit message
- **branch**: Target branch (optional)
- **author**: Author details (optional)

#### list_commits
List commits in a repository.
- **repo**: Repository name
- **branch**: Branch name (optional)
- **path**: File path filter (optional)
- **since**: Start date (optional)
- **until**: End date (optional)
- **author**: Author filter (optional)

#### get_commit
Get details of a specific commit.
- **repo**: Repository name
- **sha**: Commit SHA

#### revert_commit
Revert a commit.
- **repo**: Repository name
- **sha**: Commit SHA to revert
- **message**: Revert commit message
- **branch**: Target branch (optional)

### Source File Management

#### scan_source_files
Scan and update source files for a project.
- **project_name**: Project name

#### record_source_change
Record a change to a source file.
- **project_name**: Project name
- **file_path**: Path to the changed file
- **description**: Description of the change
- **type**: Type of change (feature, bugfix, refactor, documentation, other)
- **lines**: Changed lines with start, end, content, and operation

#### update_source_settings
Update source file tracking settings for a project.
- **project_name**: Project name
- **auto_commit**: Whether to auto-commit changes (optional)
- **ignore_patterns**: Patterns to ignore during file scanning (optional)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/project-hub-mcp-server.git
cd project-hub-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

Add the server to your MCP settings file:

```json
{
  "mcpServers": {
    "project-hub": {
      "command": "node",
      "args": ["path/to/project-hub-mcp-server/dist/index.js"],
      "env": {
        "DEFAULT_OWNER": "your-github-username",
        "GITHUB_TOKEN_your-github-username": "your-github-token"
      }
    }
  }
}
```

## Usage Examples

### Project Management

```typescript
// Create a new project
await mcp.use("project-hub", "create_project", {
  name: "my-project",
  path: "./projects/my-project",
  type: "typescript",
  description: "A new TypeScript project"
});

// Record a change
await mcp.use("project-hub", "record_change", {
  project_name: "my-project",
  description: "Added new feature",
  type: "feature",
  files: ["src/feature.ts"]
});
```

### GitHub Integration

```typescript
// Create and link repository
await mcp.use("project-hub", "create_repository", {
  name: "my-project",
  description: "A new TypeScript project",
  private: true
});

await mcp.use("project-hub", "link_repository", {
  project_name: "my-project",
  repo_owner: "your-username",
  repo_name: "my-project"
});

// Create a commit
await mcp.use("project-hub", "create_commit", {
  repo: "my-project",
  changes: [{
    path: "src/feature.ts",
    operation: "add",
    sourcePath: "./projects/my-project/src/feature.ts"
  }],
  message: "feat: add new feature"
});
```

## Development

1. Make changes to the source code
2. Run tests:
```bash
npm test
```
3. Build the project:
```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT