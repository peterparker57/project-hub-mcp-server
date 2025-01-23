import { BaseGitHubService } from './base-service.js';
import { Repository } from '../../types/github/common.js';
import fs from 'fs/promises';

export class RepositoryService extends BaseGitHubService {
  async createRepository(name: string, description: string, isPrivate = false): Promise<Repository> {
    try {
      const response = await this.octokit.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
        auto_init: true
      });

      return {
        owner: this.owner,
        name: response.data.name,
        url: response.data.html_url,
        description: response.data.description || undefined,
        isPrivate: response.data.private
      };
    } catch (error) {
      throw await this.handleApiError(error, `creating repository ${name}`);
    }
  }

  async cloneRepository(repo: string, outputDir: string, branch?: string): Promise<void> {
    try {
      const { data: repoData } = await this.octokit.repos.get({
        owner: this.owner,
        repo
      });

      // Clone using git CLI would go here
      // For now, we'll just ensure the directory exists
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      throw await this.handleApiError(error, `cloning repository ${repo}`);
    }
  }

  async getFile(repo: string, filePath: string, branch?: string): Promise<{ content: string; sha: string }> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: this.owner,
        repo,
        path: filePath,
        ref: branch ?? this.defaultBranch
      });

      if ('content' in response.data && 'sha' in response.data) {
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        return { content, sha: response.data.sha };
      }
      throw new Error('Not a file');
    } catch (error) {
      throw await this.handleApiError(error, `getting file ${filePath} from ${repo}`);
    }
  }

  async deleteRepository(name: string): Promise<void> {
    try {
      await this.octokit.repos.delete({
        owner: this.owner,
        repo: name
      });
    } catch (error) {
      throw await this.handleApiError(error, `deleting repository ${name}`);
    }
  }

  async renameRepository(repo: string, newName: string): Promise<Repository> {
    try {
      const response = await this.octokit.repos.update({
        owner: this.owner,
        repo,
        name: newName
      });

      return {
        owner: this.owner,
        name: response.data.name,
        url: response.data.html_url,
        description: response.data.description || undefined,
        isPrivate: response.data.private
      };
    } catch (error) {
      throw await this.handleApiError(error, `renaming repository ${repo} to ${newName}`);
    }
  }
}