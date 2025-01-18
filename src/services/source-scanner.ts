import fs from 'fs/promises';
import path from 'path';
import { FileType, SourceFile } from '../types/index.js';

export class SourceScanner {
  private defaultIgnorePatterns = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '*.log'
  ];

  constructor(private ignorePatterns: string[] = []) {
    this.ignorePatterns = [...this.defaultIgnorePatterns, ...ignorePatterns];
  }

  private shouldIgnore(filePath: string): boolean {
    return this.ignorePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(filePath);
      }
      return filePath.includes(pattern);
    });
  }

  private getFileType(filePath: string): FileType {
    const normalizedPath = filePath.toLowerCase();
    const segments = normalizedPath.split(path.sep);

    // Check directory-based types
    if (segments.some(s => ['src', 'lib', 'packages'].includes(s))) return FileType.Source;
    if (segments.some(s => ['test', 'tests', '__tests__'].includes(s))) return FileType.Test;
    if (segments.some(s => ['docs', 'doc', 'documentation'].includes(s))) return FileType.Documentation;
    if (segments.some(s => ['build', 'dist'].includes(s))) return FileType.Build;

    // Check root level config files
    if (segments.length === 2 && [
      'package.json',
      'tsconfig.json',
      '.gitignore',
      '.eslintrc',
      '.prettierrc',
      'webpack.config.js',
      'jest.config.js'
    ].includes(segments[1])) {
      return FileType.Config;
    }

    // Check config directories
    if (segments.some(s => ['.config', 'config'].includes(s))) return FileType.Config;

    return FileType.Other;
  }

  private getLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: { [key: string]: string } = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.rb': 'ruby',
      '.java': 'java',
      '.cpp': 'c++',
      '.cc': 'c++',
      '.h': 'c++',
      '.cs': 'c#',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.less': 'less',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.sql': 'sql'
    };

    return languageMap[ext] || 'unknown';
  }

  async scanDirectory(projectPath: string): Promise<SourceFile[]> {
    const sourceFiles: SourceFile[] = [];
    const basePath = path.resolve(projectPath);

    const scan = async (currentPath: string): Promise<void> => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);

        if (this.shouldIgnore(relativePath)) continue;

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          sourceFiles.push({
            path: fullPath,
            relativePath,
            type: this.getFileType(relativePath),
            language: this.getLanguage(entry.name),
            lastModified: stats.mtime.toISOString(),
            changes: []
          });
        }
      }
    };

    await scan(basePath);
    return sourceFiles;
  }
}