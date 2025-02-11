# Project Hub MCP Server

An MCP server providing project management and GitHub integration capabilities. This server enables managing local projects, tracking changes, and synchronizing with GitHub repositories.

## Features

- Project creation and management with case-insensitive search
- Change tracking and version control
- GitHub repository integration
- Source file scanning and monitoring
- Automated commit management
- Multi-account GitHub support
- Branch management and pull request support

## Tools

### Project Management

#### create_project
Create a new project with local and remote repository management.
- **name**: Project name
- **path**: Local project path
- **type**: Project type
- **description**: Project description

#### find_project
Find a project by name (case-insensitive).
- **name**: Project name to search for

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

### Branch Management

#### create_branch
Create a new branch in a repository.
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

// Find a project (case-insensitive)
await mcp.use("project-hub", "find_project", {
  name: "my-project" // Works with "My-Project", "MY-PROJECT", etc.
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
    operation: "add",
    sourcePath: "./projects/my-project/src/feature.ts"
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