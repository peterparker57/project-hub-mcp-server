import { Octokit } from '@octokit/rest';
import { GitHubConfig, GitHubServiceOptions } from '../../types/github/common.js';
import {
  GitHubError,
  UnauthorizedError,
  RateLimitError,
  RepositoryNotFoundError
} from '../../types/github/errors.js';

export abstract class BaseGitHubService {
  protected octokit: Octokit;
  protected owner: string;
  protected defaultBranch: string;

  constructor(config: GitHubConfig, options?: GitHubServiceOptions) {
    this.octokit = new Octokit({ auth: config.token });
    this.owner = config.owner;
    this.defaultBranch = options?.defaultBranch ?? 'main';
  }

  protected async handleApiError(error: any, context: string): Promise<never> {
    if (error instanceof GitHubError) {
      throw error;
    }

    if (error.status === 401) {
      throw new UnauthorizedError();
    }

    if (error.status === 403 && error.message.includes('rate limit')) {
      throw new RateLimitError();
    }

    if (error.status === 404 && context.includes('repository')) {
      const match = context.match(/repository ([^/]+\/[^/]+)/);
      if (match) {
        const [owner, repo] = match[1].split('/');
        throw new RepositoryNotFoundError(owner, repo);
      }
    }

    // Generic error handling
    throw new GitHubError(
      `GitHub API error in ${context}: ${error.message}`,
      'API_ERROR',
      error.status
    );
  }

  protected validateRepository(repo: string): void {
    if (!repo || typeof repo !== 'string') {
      throw new GitHubError(
        'Invalid repository name',
        'INVALID_REPOSITORY',
        400
      );
    }
  }

  protected validateBranch(branch: string): void {
    if (!branch || typeof branch !== 'string') {
      throw new GitHubError(
        'Invalid branch name',
        'INVALID_BRANCH',
        400
      );
    }
  }

  protected getRef(branch?: string): string {
    return `heads/${branch ?? this.defaultBranch}`;
  }
}