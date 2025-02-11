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