# Project Hub MCP Server

An MCP server providing project management and GitHub integration capabilities. This server enables managing local projects, tracking changes, and synchronizing with GitHub repositories.

## Features

- Project creation and management with flexible, case-insensitive, partial name search
- Change tracking and version control
- GitHub repository integration
- Source file scanning and monitoring
- Automated commit management
- Multi-account GitHub support
- Branch management and pull request support
- Project notes and documentation
- Repository cloning and local setup

## Tools

### Project Management

#### create_project
Create a new project with local and remote repository management.
- **name**: Project name
- **path**: Local project path
- **type**: Project type
- **description**: Project description

#### find_project
Find a project by name (flexible, case-insensitive, partial match). Returns detailed project information including changes and notes.
- **name**: Project name to search for

#### list_projects
List all projects with optional filtering.
- **type**: Filter by project type (optional)
- **has_repo**: Filter by repository presence (optional)
- **page**: Page number for pagination (optional)
- **page_size**: Number of items per page (optional)

#### update_project_details
Update details of an existing project.
- **projectId**: Project ID
- **name**: New project name (optional)
- **path**: New project path (optional)
- **type**: New project type (optional)
- **description**: New project description (optional)
- **status**: New project status (optional)

#### delete_project
Delete a project.
- **projectId**: Project ID

#### scan_project_files
Scan a project directory for source files and update the project record.
- **projectId**: Project ID
- **excludePatterns**: Regex patterns to exclude files (optional)

#### projectdb_location
Get the full path of the project database location.

### Change Management

#### record_change
Record a change in a project.
- **projectId**: Project ID
- **type**: Change type
- **description**: Change description

#### get_pending_changes
Get pending changes for a project.
- **projectId**: Project ID

#### clear_committed_changes
Clear committed changes for a project.
- **projectId**: Project ID

### Note Management

#### create_note
Create a new note for a project.
- **project_name**: Project name
- **title**: Note title
- **content**: Note content
- **category**: Note category (optional)
- **tags**: Note tags (optional)

#### update_note
Update an existing note.
- **project_name**: Project name
- **note_id**: Note ID
- **title**: New note title (optional)
- **content**: New note content (optional)
- **category**: New note category (optional)
- **tags**: New note tags (optional)

#### delete_note
Delete a note.
- **project_name**: Project name
- **note_id**: Note ID

#### search_notes
Search notes in a project.
- **project_name**: Project name
- **query**: Search query
- **category**: Filter by category (optional)

### Repository Management

#### create_repository
Create a new GitHub repository.
- **name**: Repository name
- **description**: Repository description (optional)
- **isPrivate**: Whether the repository is private (optional)

#### get_repository
Get detailed information about a specific repository.
- **name**: Repository name

#### update_repository
Update repository settings.
- **name**: Repository name
- **description**: New repository description (optional)
- **private**: Change repository visibility (optional)
- **default_branch**: Change default branch (optional)
- **has_issues**: Enable/disable issues (optional)
- **has_wiki**: Enable/disable wiki (optional)

#### delete_repository
Delete a GitHub repository.
- **name**: Repository name

#### rename_repository
Rename a GitHub repository.
- **oldName**: Current repository name
- **newName**: New repository name

#### list_repositories
List all repositories for the authenticated user.
- **visibility**: Filter repositories by visibility (optional)
- **sort**: Sort repositories by field (optional)
- **per_page**: Results per page (optional)

#### fork_repository
Create a fork of an existing repository.
- **name**: Repository name to fork
- **organization**: Organization to fork to (optional)

#### transfer_repository
Transfer repository ownership.
- **name**: Repository name
- **new_owner**: New owner username or organization name
- **team_ids**: Team IDs to add to the repository (optional)

#### clone_repository
Clone a repository to a specified folder.
- **repo**: Repository name
- **targetFolder**: Target folder where the repository will be cloned
- **branch**: Branch to clone (optional)

### File Management

#### get_file
Get file content from a GitHub repository.
- **repo**: Repository name
- **path**: File path in the repository
- **ref**: Git reference (branch, tag, or commit SHA) (optional)

### Commit Management

#### create_commit
Create a commit in a GitHub repository.
- **repo**: Repository name
- **branch**: Branch name (optional, defaults to main)
- **message**: Commit message
- **changes**: Array of file changes (path, content, operation)

#### list_commits
List commits in a GitHub repository.
- **repo**: Repository name
- **branch**: Branch name (optional)

#### get_commit
Get commit details from a GitHub repository.
- **repo**: Repository name
- **sha**: Commit SHA

#### revert_commit
Revert a commit in a GitHub repository.
- **repo**: Repository name
- **sha**: Commit SHA to revert

### Branch Management

#### create_branch
Create a new branch in a GitHub repository.
- **repo**: Repository name
- **name**: New branch name
- **sourceBranch**: Source branch to create from (optional, defaults to main)

#### delete_branch
Delete a branch from a repository.
- **repo**: Repository name
- **name**: Branch name to delete

#### list_branches
List all branches in a repository.
- **repo**: Repository name

#### get_branch
Get details about a specific branch.
- **repo**: Repository name
- **name**: Branch name

#### merge_branches
Merge two branches in a repository.
- **repo**: Repository name
- **base**: Base branch name
- **head**: Head branch name
- **message**: Merge commit message (optional)

### Pull Request Management

#### create_pull_request
Create a new pull request.
- **repo**: Repository name
- **title**: Pull request title
- **head**: Head branch name
- **base**: Base branch name
- **body**: Pull request description (optional)
- **draft**: Create as draft PR (optional)
- **maintainer_can_modify**: Allow maintainers to modify (optional)

### Utility Tools

#### list_tools
List all available tools in the Project Hub MCP.

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

// Find a project (flexible name search)
await mcp.use("project-hub", "find_project", {
  name: "my-project" // Works with "My-Project", "MY-PROJECT", "my project notes", etc.
});

// Record a change
await mcp.use("project-hub", "record_change", {
  project_name: "my-project",
  description: "Added new feature",
  type: "feature",
  files": ["src/feature.ts"]
});

// Scan project files
await mcp.use("project-hub", "scan_project_files", {
  projectId: "project-id",
  excludePatterns: ["node_modules", "\\.git", "dist", "build"]
});
```

### Note Management

```typescript
// Create a project note
await mcp.use("project-hub", "create_note", {
  project_name: "my-project",
  title: "Architecture Decision Record",
  content: "# ADR-001: Project Structure\n\n...",
  category: "documentation",
  tags: ["architecture", "decision"]
});

// Search notes
await mcp.use("project-hub", "search_notes", {
  project_name: "my-project",
  query: "architecture",
  category: "documentation"
});
```

### GitHub Integration

```typescript
// Create and link repository
await mcp.use("project-hub", "create_repository", {
  name: "my-project",
  description: "A new TypeScript project",
  isPrivate: true
});

// Clone a repository
await mcp.use("project-hub", "clone_repository", {
  repo: "my-project",
  targetFolder: "./projects/my-project",
  branch: "main"
});

// Create a feature branch
await mcp.use("project-hub", "create_branch", {
  repo: "my-project",
  name: "feature/new-feature",
  sourceBranch: "main"
});

// Create a commit on the feature branch
await mcp.use("project-hub", "create_commit", {
  repo: "my-project",
  changes: [{
    path: "src/feature.ts",
    content: "// New feature code",
    operation: "add"
  }],
  message: "feat: add new feature",
  branch: "feature/new-feature"
});

// Create pull request
await mcp.use("project-hub", "create_pull_request", {
  repo: "my-project",
  title: "Add new feature",
  head: "feature/new-feature",
  base: "main",
  body: "This PR adds a new feature",
  draft: false,
  maintainer_can_modify: true
});

// After PR review, merge the branches
await mcp.use("project-hub", "merge_branches", {
  repo: "my-project",
  base: "main",
  head: "feature/new-feature",
  message: "Merge feature/new-feature into main"
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