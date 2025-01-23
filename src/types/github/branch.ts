import { GitHubResult } from './common.js';

export interface Branch {
  name: string;
  sha: string;
  protected: boolean;
  defaultBranch: boolean;
}

export interface BranchProtection {
  enabled: boolean;
  requiredReviews: boolean;
  requiredStatusChecks: boolean;
  enforceAdmins: boolean;
}

export interface CreateBranchOptions {
  name: string;
  fromBranch?: string;  // Source branch, defaults to default branch
  protection?: Partial<BranchProtection>;
}

export interface MergeBranchOptions {
  head: string;      // Branch to merge from
  base: string;      // Branch to merge into
  message?: string;  // Custom merge commit message
  method?: 'merge' | 'squash' | 'rebase';
}

export interface BranchResult extends GitHubResult {
  name: string;
  protected?: boolean;
  defaultBranch?: boolean;
}

export interface MergeResult extends GitHubResult {
  merged: boolean;
  message: string;
  conflicted?: boolean;
}