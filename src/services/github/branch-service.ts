import { BaseGitHubService } from './base-service.js';
import {
  Branch,
  BranchProtection,
  CreateBranchOptions,
  MergeBranchOptions,
  BranchResult,
  MergeResult
} from '../../types/github/branch.js';
import { BranchNotFoundError } from '../../types/github/errors.js';

interface OctokitError {
  status: number;
  message: string;
}

export class BranchService extends BaseGitHubService {
  async createBranch(repo: string, options: CreateBranchOptions): Promise<BranchResult> {
    this.validateRepository(repo);
    this.validateBranch(options.name);

    try {
      // Get the SHA of the source branch
      const sourceBranch = options.fromBranch ?? this.defaultBranch;
      const { data: ref } = await this.octokit.git.getRef({
        owner: this.owner,
        repo,
        ref: this.getRef(sourceBranch)
      });

      // Create new branch from the source branch's SHA
      const { data: newRef } = await this.octokit.git.createRef({
        owner: this.owner,
        repo,
        ref: `refs/heads/${options.name}`,
        sha: ref.object.sha
      });

      // Set up branch protection if requested
      if (options.protection) {
        await this.updateBranchProtection(repo, options.name, options.protection);
      }

      return {
        name: options.name,
        sha: newRef.object.sha,
        url: `https://github.com/${this.owner}/${repo}/tree/${options.name}`
      };
    } catch (error) {
      throw await this.handleApiError(error, `creating branch ${options.name} in ${this.owner}/${repo}`);
    }
  }

  async deleteBranch(repo: string, branch: string): Promise<void> {
    this.validateRepository(repo);
    this.validateBranch(branch);

    if (branch === this.defaultBranch) {
      throw new Error('Cannot delete default branch');
    }

    try {
      await this.octokit.git.deleteRef({
        owner: this.owner,
        repo,
        ref: this.getRef(branch)
      });
    } catch (error) {
      throw await this.handleApiError(error, `deleting branch ${branch} in ${this.owner}/${repo}`);
    }
  }

  async listBranches(repo: string): Promise<Branch[]> {
    this.validateRepository(repo);

    try {
      const { data: branches } = await this.octokit.repos.listBranches({
        owner: this.owner,
        repo
      });

      return branches.map(branch => ({
        name: branch.name,
        sha: branch.commit.sha,
        protected: branch.protected,
        defaultBranch: branch.name === this.defaultBranch
      }));
    } catch (error) {
      throw await this.handleApiError(error, `listing branches in ${this.owner}/${repo}`);
    }
  }

  async mergeBranches(repo: string, options: MergeBranchOptions): Promise<MergeResult> {
    this.validateRepository(repo);
    this.validateBranch(options.head);
    this.validateBranch(options.base);

    try {
      const { data: mergeResult } = await this.octokit.repos.merge({
        owner: this.owner,
        repo,
        base: options.base,
        head: options.head,
        commit_message: options.message
      });

      return {
        merged: true,
        sha: mergeResult.sha,
        message: mergeResult.commit.message,
        url: `https://github.com/${this.owner}/${repo}/commit/${mergeResult.sha}`
      };
    } catch (error) {
      const octokitError = error as OctokitError;
      if (octokitError.status === 409) {
        return {
          merged: false,
          message: 'Merge conflict',
          conflicted: true,
          sha: '',
          url: `https://github.com/${this.owner}/${repo}/compare/${options.base}...${options.head}`
        };
      }
      throw await this.handleApiError(error, `merging ${options.head} into ${options.base} in ${this.owner}/${repo}`);
    }
  }

  private async updateBranchProtection(
    repo: string,
    branch: string,
    protection: Partial<BranchProtection>
  ): Promise<void> {
    try {
      await this.octokit.repos.updateBranchProtection({
        owner: this.owner,
        repo,
        branch,
        required_status_checks: protection.requiredStatusChecks ? { strict: true, contexts: [] } : null,
        enforce_admins: protection.enforceAdmins ?? false,
        required_pull_request_reviews: protection.requiredReviews ? { required_approving_review_count: 1 } : null,
        restrictions: null
      });
    } catch (error) {
      throw await this.handleApiError(error, `updating branch protection for ${branch} in ${this.owner}/${repo}`);
    }
  }

  async getBranch(repo: string, branch: string): Promise<Branch> {
    this.validateRepository(repo);
    this.validateBranch(branch);

    try {
      const { data } = await this.octokit.repos.getBranch({
        owner: this.owner,
        repo,
        branch
      });

      return {
        name: data.name,
        sha: data.commit.sha,
        protected: data.protected,
        defaultBranch: data.name === this.defaultBranch
      };
    } catch (error) {
      const octokitError = error as OctokitError;
      if (octokitError.status === 404) {
        throw new BranchNotFoundError(repo, branch);
      }
      throw await this.handleApiError(error, `getting branch ${branch} in ${this.owner}/${repo}`);
    }
  }
}