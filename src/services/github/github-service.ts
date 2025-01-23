import { GitHubConfig, GitHubServiceOptions } from '../../types/github/common.js';
import { BaseGitHubService } from './base-service.js';
import { BranchService } from './branch-service.js';
import { CommitService } from './commit-service.js';
import { RepositoryService } from './repository-service.js';

export class GitHubService extends BaseGitHubService {
  private branchService: BranchService;
  private commitService: CommitService;
  private repositoryService: RepositoryService;

  constructor(config: GitHubConfig, options?: GitHubServiceOptions) {
    super(config, options);
    this.branchService = new BranchService(config, options);
    this.commitService = new CommitService(config, options);
    this.repositoryService = new RepositoryService(config, options);
  }

  // Branch operations
  async createBranch(...args: Parameters<BranchService['createBranch']>) {
    return this.branchService.createBranch(...args);
  }

  async deleteBranch(...args: Parameters<BranchService['deleteBranch']>) {
    return this.branchService.deleteBranch(...args);
  }

  async listBranches(...args: Parameters<BranchService['listBranches']>) {
    return this.branchService.listBranches(...args);
  }

  async mergeBranches(...args: Parameters<BranchService['mergeBranches']>) {
    return this.branchService.mergeBranches(...args);
  }

  async getBranch(...args: Parameters<BranchService['getBranch']>) {
    return this.branchService.getBranch(...args);
  }

  // Commit operations
  async createCommit(...args: Parameters<CommitService['createCommit']>) {
    return this.commitService.createCommit(...args);
  }

  async listCommits(...args: Parameters<CommitService['listCommits']>) {
    return this.commitService.listCommits(...args);
  }

  async getCommit(...args: Parameters<CommitService['getCommit']>) {
    return this.commitService.getCommit(...args);
  }

  async revertCommit(...args: Parameters<CommitService['revertCommit']>) {
    return this.commitService.revertCommit(...args);
  }

  // Repository operations
  async createRepository(...args: Parameters<RepositoryService['createRepository']>) {
    return this.repositoryService.createRepository(...args);
  }

  async cloneRepository(...args: Parameters<RepositoryService['cloneRepository']>) {
    return this.repositoryService.cloneRepository(...args);
  }

  async getFile(...args: Parameters<RepositoryService['getFile']>) {
    return this.repositoryService.getFile(...args);
  }

  async deleteRepository(...args: Parameters<RepositoryService['deleteRepository']>) {
    return this.repositoryService.deleteRepository(...args);
  }

  async renameRepository(...args: Parameters<RepositoryService['renameRepository']>) {
    return this.repositoryService.renameRepository(...args);
  }
}