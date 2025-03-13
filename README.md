# Project Hub MCP Server

An MCP server providing comprehensive project management, local Git functionality, and GitHub integration capabilities. This server enables managing local projects, tracking changes, creating local commits, and synchronizing with GitHub repositories.

## Features

### Project Management
- Project creation and management with flexible, case-insensitive, partial name search
- Source file scanning and monitoring with customizable exclusion patterns
- Project metadata tracking and updates

### Local Git Functionality
- Local commit creation and management without requiring GitHub
- Branch management (create, switch, list)
- File snapshots with metadata (size, creation time, modification time)
- Restore functionality to revert to previous commits or branches
- Clone functionality to create new instances from commits or branches

### Change Tracking
- Record and track changes with associated files
- Categorize changes by type (feature, fix, refactor, etc.)
- Link changes to commits for comprehensive history

### Notes System
- Create and manage project notes with rich markdown content
- Categorize and tag notes for better organization
- Search functionality to find relevant documentation

### GitHub Integration
- Repository management (create, update, delete, rename)
- Commit management with file content tracking
- Branch operations (create, delete, merge)
- Pull request creation and management
- Repository cloning and local setup
- Multi-account GitHub support

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
- **files**: List of file paths affected by this change (optional)

#### get_pending_changes
Get pending changes for a project.
- **projectId**: Project ID

#### clear_committed_changes
Clear committed changes for a project.
- **projectId**: Project ID

### Local Git Functionality

#### init_local_repository
Initialize a local Git repository for a project.
- **projectId**: Project ID

#### create_local_commit
Create a local commit from pending changes.
- **projectId**: Project ID
- **message**: Commit message
- **authorName**: Author name (optional)
- **authorEmail**: Author email (optional)

#### get_local_commit_history
Get local commit history for a project.
- **projectId**: Project ID

#### create_local_branch
Create a new local branch.
- **projectId**: Project ID
- **name**: Branch name
- **startingCommitId**: Starting commit ID (optional)

#### switch_local_branch
Switch to a different local branch.
- **projectId**: Project ID
- **branchName**: Branch name

#### list_local_branches
List all local branches for a project.
- **projectId**: Project ID

#### restore_to_local_commit
Restore project files to a specific local commit.
- **projectId**: Project ID
- **commitId**: Commit ID to restore to

#### restore_to_local_branch
Restore project files to a specific local branch.
- **projectId**: Project ID
- **branchName**: Branch name to restore to

#### restore_local_commit_to_new_location
Restore a specific local commit to a new folder location.
- **projectId**: Project ID
- **commitId**: Commit ID to restore
- **newLocation**: New folder path to restore to

#### restore_local_branch_to_new_location
Restore a specific local branch to a new folder location.
- **projectId**: Project ID
- **branchName**: Branch name to restore
- **newLocation**: New folder path to restore to

#### push_local_commits
Push local commits to GitHub.
- **projectId**: Project ID
- **repo**: Repository name
- **branch**: Branch name (optional)

#### force_local_commit
Force a local commit of all files in the project, regardless of pending changes.
- **projectId**: Project ID
- **message**: Commit message
- **authorName**: Author name (optional)
- **authorEmail**: Author email (optional)

#### cleanup_project_files
Removes records of non-existent files from the Project Hub data for a project.
- **projectId**: Project ID

### File Snapshot Management

#### get_file_snapshots
Get file snapshots for a commit.
- **commitId**: Commit ID

#### get_file_snapshots_metadata
Get file snapshots metadata for a commit (without file content).
- **commitId**: Commit ID

#### get_file_content
Get file content for a snapshot.
- **snapshotId**: Snapshot ID

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

## Architecture

### Database Schema

The Project Hub MCP server uses SQLite for data storage with the following key tables:

- **projects**: Stores project metadata
- **changes**: Tracks changes made to projects
- **notes**: Stores project documentation
- **source_files**: Catalogs files in projects
- **local_commits**: Stores local commit information
- **local_branches**: Tracks branch information
- **file_snapshots**: Stores file content and metadata at commit time
- **commit_changes**: Maps commits to changes

### Key Components

- **ProjectManager**: Handles project CRUD operations and metadata
- **LocalGitService**: Manages local Git functionality
- **FileSnapshotService**: Handles file snapshot operations
- **GitHubService**: Interfaces with GitHub API
- **StorageService**: Manages database operations
- **SourceScanner**: Scans and catalogs project files

## Installation

1. Clone the repository:
```bash
git clone https://github.com/peterparker57/project-hub-mcp-server.git
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
        "NODE_ENV": "development",
        "DEFAULT_PRIVATE": "true",
        "DEFAULT_OWNER": "your-github-username",
        "GITHUB_TOKEN": "your-github-token",
        "GIT_PATH": "C:\\Program Files\\Git\\bin\\git.exe"
      },
      "alwaysAllow": [
        "list_projects",
        "find_project",
        "get_pending_changes",
        "get_local_commit_history",
        "list_local_branches"
      ]
    }
  }
}
```

### Environment Variables

- **NODE_ENV**: Set to "development" or "production"
- **DEFAULT_PRIVATE**: Whether new repositories should be private by default
- **DEFAULT_OWNER**: Default GitHub username for repository operations
- **GITHUB_TOKEN**: GitHub personal access token with appropriate permissions
- **GIT_PATH**: Path to Git executable for local Git operations

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
  projectId: "project-id",
  description: "Added new feature",
  type: "feature",
  files: ["src/feature.ts"]
});

// Scan project files
await mcp.use("project-hub", "scan_project_files", {
  projectId: "project-id",
  excludePatterns: ["node_modules", "\\.git", "dist", "build"]
});
```

### Local Git Functionality

```typescript
// Initialize local repository
await mcp.use("project-hub", "init_local_repository", {
  projectId: "project-id"
});

// Create a local commit
await mcp.use("project-hub", "create_local_commit", {
  projectId: "project-id",
  message: "Implemented new feature",
  authorName: "John Doe",
  authorEmail: "john@example.com"
});

// Create a new branch
await mcp.use("project-hub", "create_local_branch", {
  projectId: "project-id",
  name: "feature/new-feature"
});

// Switch to a branch
await mcp.use("project-hub", "switch_local_branch", {
  projectId: "project-id",
  branchName: "feature/new-feature"
});

// Restore to a previous commit
await mcp.use("project-hub", "restore_to_local_commit", {
  projectId: "project-id",
  commitId: "commit-id"
});

// Clone a branch to a new location
await mcp.use("project-hub", "restore_local_branch_to_new_location", {
  projectId: "project-id",
  branchName: "main",
  newLocation: "C:/Projects/new-clone"
});

// Push local commits to GitHub
await mcp.use("project-hub", "push_local_commits", {
  projectId: "project-id",
  repo: "my-project",
  branch: "main"
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

## Recent Enhancements

### Local Git Functionality (March 2025)
- Added comprehensive local Git functionality with commits, branches, and file snapshots
- Implemented restore capabilities to revert to previous states
- Added clone functionality to create new instances from commits or branches
- Enhanced file snapshots with metadata tracking (size, creation time, modification time)

### Project Management Improvements (February 2025)
- Added clone_repository tool to clone GitHub repositories to specified folders
- Implemented scan_project_files tool to scan project directories and catalog source files
- Enhanced project search with flexible, case-insensitive, partial name matching
- Improved file tracking with better metadata

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT