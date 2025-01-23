import { BaseGitHubService } from './base-service.js';
import { CommitInfo, CommitOptions, GitFileChange, CommitResult } from '../../types/github/commit.js';
import fs from 'fs/promises';

export class CommitService extends BaseGitHubService {
  async createCommit(
    repo: string,
    changes: GitFileChange[],
    options: CommitOptions
  ): Promise<CommitResult> {
    const branch = options.branch ?? this.defaultBranch;
    
    try {
      // Get the latest commit SHA
      const { data: ref } = await this.octokit.git.getRef({
        owner: this.owner,
        repo,
        ref: `heads/${branch}`
      });
      const latestCommit = ref.object.sha;

      // Create blobs for new/modified files
      const fileOperations = await Promise.all(
        changes.map(async change => {
          if (change.operation === 'delete') {
            return {
              path: change.path,
              mode: '100644' as const,
              type: 'blob' as const,
              sha: null
            };
          }

          if (!change.sourcePath) {
            throw new Error(`Source path required for ${change.operation} operation`);
          }

          const content = await fs.readFile(change.sourcePath, 'utf-8');
          const { data: blob } = await this.octokit.git.createBlob({
            owner: this.owner,
            repo,
            content,
            encoding: 'utf-8'
          });

          return {
            path: change.path,
            mode: '100644' as const,
            type: 'blob' as const,
            sha: blob.sha
          };
        })
      );

      // Get base tree
      const { data: baseTree } = await this.octokit.git.getTree({
        owner: this.owner,
        repo,
        tree_sha: latestCommit
      });

      // Create new tree
      const { data: newTree } = await this.octokit.git.createTree({
        owner: this.owner,
        repo,
        base_tree: baseTree.sha,
        tree: fileOperations
      });

      // Create commit
      const { data: commit } = await this.octokit.git.createCommit({
        owner: this.owner,
        repo,
        message: options.message,
        tree: newTree.sha,
        parents: [latestCommit],
        author: options.author,
        committer: options.author
      });

      // Update branch reference
      await this.octokit.git.updateRef({
        owner: this.owner,
        repo,
        ref: `heads/${branch}`,
        sha: commit.sha
      });

      return {
        sha: commit.sha,
        url: `https://github.com/${this.owner}/${repo}/commit/${commit.sha}`,
        files: changes.map(c => c.path)
      };
    } catch (error) {
      throw await this.handleApiError(error, `creating commit in ${repo}`);
    }
  }

  async listCommits(repo: string, options?: {
    branch?: string;
    path?: string;
    since?: string;
    until?: string;
    author?: string;
  }): Promise<CommitInfo[]> {
    try {
      const { data: commits } = await this.octokit.repos.listCommits({
        owner: this.owner,
        repo,
        sha: options?.branch ?? this.defaultBranch,
        path: options?.path,
        since: options?.since,
        until: options?.until,
        author: options?.author
      });

      return commits.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        date: commit.commit.author?.date ?? '',
        author: commit.commit.author?.name ?? '',
        files: commit.files?.map(f => f.filename) ?? []
      }));
    } catch (error) {
      throw await this.handleApiError(error, `listing commits in ${repo}`);
    }
  }

  async getCommit(repo: string, sha: string): Promise<CommitInfo> {
    try {
      const { data: commit } = await this.octokit.repos.getCommit({
        owner: this.owner,
        repo,
        ref: sha
      });

      return {
        sha: commit.sha,
        message: commit.commit.message,
        date: commit.commit.author?.date ?? '',
        author: commit.commit.author?.name ?? '',
        files: commit.files?.map(f => f.filename) ?? []
      };
    } catch (error) {
      throw await this.handleApiError(error, `getting commit ${sha} in ${repo}`);
    }
  }

  async revertCommit(repo: string, sha: string, message: string, branch?: string): Promise<CommitResult> {
    try {
      // Get the commit to revert
      const { data: commitToRevert } = await this.octokit.repos.getCommit({
        owner: this.owner,
        repo,
        ref: sha
      });

      // Get the current branch ref
      const { data: ref } = await this.octokit.git.getRef({
        owner: this.owner,
        repo,
        ref: `heads/${branch ?? this.defaultBranch}`
      });

      // Create a revert commit
      const { data: revertCommit } = await this.octokit.git.createCommit({
        owner: this.owner,
        repo,
        message: message,
        tree: commitToRevert.parents[0].sha, // Use parent's tree
        parents: [ref.object.sha]
      });

      // Update the branch reference
      await this.octokit.git.updateRef({
        owner: this.owner,
        repo,
        ref: `heads/${branch ?? this.defaultBranch}`,
        sha: revertCommit.sha
      });

      return {
        sha: revertCommit.sha,
        url: `https://github.com/${this.owner}/${repo}/commit/${revertCommit.sha}`,
        files: commitToRevert.files?.map(f => f.filename) ?? []
      };
    } catch (error) {
      throw await this.handleApiError(error, `reverting commit ${sha} in ${repo}`);
    }
  }
}