import { Octokit } from '@octokit/rest';
import fs from 'fs/promises';
import { exec } from 'child_process';
import {
  GitHubConfig,
  GitHubServiceOptions,
  CommitOptions,
  GitFileChange,
  CommitResult,
  PullRequestOptions,
  PullRequestResult
} from '../types/index.js';

type GitHubFile = {
  filename: string;
  status?: string;
};

export class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private defaultBranch: string;

  async listRepositories(options?: { visibility?: string; sort?: string; per_page?: number }): Promise<any[]> {
    // Create request parameters
    const requestParams: any = {
      sort: options?.sort as 'created' | 'updated' | 'pushed' | 'full_name' | undefined,
      per_page: options?.per_page
    };
    
    // Only add visibility if specified, otherwise use type
    if (options?.visibility) {
      requestParams.visibility = options.visibility as 'all' | 'public' | 'private';
    } else {
      requestParams.type = 'owner';
    }
    
    const response = await this.octokit.repos.listForAuthenticatedUser(requestParams);
    return response.data;
  }

  async getRepository(name: string): Promise<any> {
    const response = await this.octokit.repos.get({
      owner: this.owner,
      repo: name
    });
    return response.data;
  }

  async updateRepository(name: string, options: {
    description?: string;
    private?: boolean;
    default_branch?: string;
    has_issues?: boolean;
    has_wiki?: boolean;
  }): Promise<any> {
    const response = await this.octokit.repos.update({
      owner: this.owner,
      repo: name,
      ...options
    });
    return response.data;
  }

  async forkRepository(name: string, organization?: string): Promise<any> {
    const response = await this.octokit.repos.createFork({
      owner: this.owner,
      repo: name,
      organization
    });
    return response.data;
  }

  async transferRepository(name: string, newOwner: string, teamIds?: number[]): Promise<void> {
    await this.octokit.repos.transfer({
      owner: this.owner,
      repo: name,
      new_owner: newOwner,
      team_ids: teamIds
    });
  }

  constructor(options: GitHubServiceOptions & { defaultBranch?: string }) {
    this.octokit = new Octokit({
      auth: options.token
    });
    this.owner = options.owner;
    this.defaultBranch = options.defaultBranch ?? 'main';
  }

  private mapToGitHubFile(path: string, status?: string): GitHubFile {
    return {
      filename: path,
      status: status || 'modified'
    };
  }

  async createRepository(name: string, description?: string, isPrivate = false): Promise<void> {
    await this.octokit.repos.createForAuthenticatedUser({
      name,
      description,
      private: isPrivate,
      auto_init: true
    });
  }

  async deleteRepository(name: string): Promise<void> {
    await this.octokit.repos.delete({
      owner: this.owner,
      repo: name
    });
  }

  async renameRepository(oldName: string, newName: string): Promise<void> {
    await this.octokit.repos.update({
      owner: this.owner,
      repo: oldName,
      name: newName
    });
  }

  async getFile(repo: string, path: string, ref?: string): Promise<string> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: repo,
        path,
        ref
      });

      if ('content' in response.data && typeof response.data.content === 'string') {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }

      throw new Error('Not a file');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get file');
    }
  }

  async createCommit(repo: string, options: CommitOptions & { author?: { name: string; email: string } }): Promise<CommitResult> {
    const { branch = this.defaultBranch, message, changes } = options;

    // Get the latest commit SHA
    const ref = await this.octokit.git.getRef({
      owner: this.owner,
      repo,
      ref: `heads/${branch}`
    });

    const baseTree = await this.octokit.git.getTree({
      owner: this.owner,
      repo,
      tree_sha: ref.data.object.sha
    });

    // Create blobs for each file
    const treeItems = await Promise.all(
      changes.map(async (change: GitFileChange) => {
        const content = change.content;
        const blob = await this.octokit.git.createBlob({
          owner: this.owner,
          repo,
          content,
          encoding: 'utf-8'
        });

        return {
          path: change.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.data.sha
        };
      })
    );

    // Create a new tree
    const tree = await this.octokit.git.createTree({
      owner: this.owner,
      repo,
      base_tree: baseTree.data.sha,
      tree: treeItems
    });

    // Create the commit
    const commit = await this.octokit.git.createCommit({
      owner: this.owner,
      repo,
      message,
      tree: tree.data.sha,
      parents: [ref.data.object.sha],
      author: options.author,
      committer: options.author
    });

    // Update the reference
    await this.octokit.git.updateRef({
      owner: this.owner,
      repo,
      ref: `heads/${branch}`,
      sha: commit.data.sha
    });

    const files: GitHubFile[] = changes.map((c: GitFileChange) => this.mapToGitHubFile(c.path, c.operation));

    return {
      sha: commit.data.sha,
      url: commit.data.html_url || '',
      files
    };
  }

  async listCommits(repo: string, branch?: string): Promise<CommitResult[]> {
    const commits = await this.octokit.repos.listCommits({
      owner: this.owner,
      repo,
      sha: branch
    });

    return commits.data.map(commit => {
      const result: CommitResult = {
        sha: commit.sha,
        url: commit.html_url
      };
      if (commit.files) {
        result.files = commit.files.map(f => ({
          filename: f.filename,
          status: f.status
        }));
      }
      return result;
    });
  }

  async getCommit(repo: string, sha: string): Promise<CommitResult> {
    const commit = await this.octokit.repos.getCommit({
      owner: this.owner,
      repo,
      ref: sha
    });

    return {
      sha: commit.data.sha,
      url: commit.data.html_url,
      files: commit.data.files?.map(f => ({
        filename: f.filename,
        status: f.status
      }))
    };
  }

  async revertCommit(repo: string, sha: string): Promise<CommitResult> {
    const commitToRevert = await this.getCommit(repo, sha);
    const parentCommit = await this.octokit.repos.getCommit({
      owner: this.owner,
      repo,
      ref: sha
    });

    const revertCommit = await this.octokit.git.createCommit({
      owner: this.owner,
      repo,
      message: `Revert "${commitToRevert.sha}"`,
      tree: parentCommit.data.commit.tree.sha,
      parents: [sha]
    });

    const files: GitHubFile[] | undefined = commitToRevert.files?.map(f => ({
      filename: f.filename,
      status: 'reverted'
    }));

    return {
      sha: revertCommit.data.sha,
      url: revertCommit.data.html_url || '',
      files
    };
  }

  async createBranch(repo: string, name: string, sourceBranch?: string): Promise<void> {
    const source = sourceBranch || this.defaultBranch;

    // Get the SHA of the source branch
    const ref = await this.octokit.git.getRef({
      owner: this.owner,
      repo,
      ref: `heads/${source}`
    });

    // Create the new branch
    await this.octokit.git.createRef({
      owner: this.owner,
      repo,
      ref: `refs/heads/${name}`,
      sha: ref.data.object.sha
    });
  }

  async deleteBranch(repo: string, name: string): Promise<void> {
    await this.octokit.git.deleteRef({
      owner: this.owner,
      repo,
      ref: `heads/${name}`
    });
  }

  async listBranches(repo: string): Promise<string[]> {
    const branches = await this.octokit.repos.listBranches({
      owner: this.owner,
      repo
    });

    return branches.data.map(branch => branch.name);
  }

  async getBranch(repo: string, name: string): Promise<{ name: string; sha: string }> {
    const branch = await this.octokit.repos.getBranch({
      owner: this.owner,
      repo,
      branch: name
    });

    return {
      name: branch.data.name,
      sha: branch.data.commit.sha
    };
  }

  async mergeBranches(repo: string, base: string, head: string, message?: string): Promise<CommitResult> {
    const merge = await this.octokit.repos.merge({
      owner: this.owner,
      repo,
      base,
      head,
      commit_message: message
    });

    return {
      sha: merge.data.sha,
      url: merge.data.html_url || '',
      files: merge.data.files?.map(f => ({
        filename: f.filename,
        status: 'merged'
      }))
    };
  }

  async createPullRequest(options: PullRequestOptions): Promise<PullRequestResult> {
    const { repo, title, head, base, body, draft, maintainer_can_modify } = options;

    const response = await this.octokit.pulls.create({
      owner: this.owner,
      repo,
      title,
      head,
      base,
      body,
      draft,
      maintainer_can_modify
    });

    return {
      number: response.data.number,
      url: response.data.html_url,
      state: response.data.state,
      title: response.data.title,
      body: response.data.body || undefined,
      head: {
        ref: response.data.head.ref,
        sha: response.data.head.sha
      },
      base: {
        ref: response.data.base.ref,
        sha: response.data.base.sha
      },
      created_at: response.data.created_at,
      updated_at: response.data.updated_at,
      merged_at: response.data.merged_at || undefined,
      closed_at: response.data.closed_at || undefined,
      merged: response.data.merged || false,
      mergeable: response.data.mergeable || undefined,
      draft: response.data.draft
    };
  }

  async cloneRepository(repoName: string, targetFolder: string, branch?: string): Promise<string> {
    try {
      // Ensure the target directory exists
      await fs.mkdir(targetFolder, { recursive: true });
      
      // Construct the repository URL
      const repoUrl = `https://github.com/${this.owner}/${repoName}.git`;

      // Get the git executable path from environment variable or use default 'git' command
      const gitPath = process.env.GIT_PATH || 'git';
      
      // Log the git path being used
      console.log(`Using git executable: ${gitPath}`);
      
      // Build the git clone command
      let cloneCommand = `"${gitPath}" clone ${repoUrl} "${targetFolder}"`;
      
      // Add branch parameter if specified
      if (branch) {
        cloneCommand += ` --branch ${branch}`;
      }
      
      // Execute the git clone command
      return new Promise((resolve, reject) => {
        exec(cloneCommand, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Failed to clone repository: ${error.message}`));
            return;
          }
          resolve(`Repository cloned successfully to ${targetFolder}`);
        });
      });
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}