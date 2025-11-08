import { Octokit } from "@octokit/rest";
import fs from "fs";

export interface PRInfo {
  title: string;
  body: string;
  head: string;
  base: string;
  html_url: string;
  user: string;
}

export interface ChangedFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
}

export function parseGhContext() {
  const eventPath = process.env.GITHUB_EVENT_PATH!;
  const payload = JSON.parse(fs.readFileSync(eventPath, "utf-8"));
  const pr = payload.pull_request;
  const [owner, repo] = process.env.GITHUB_REPOSITORY!.split("/");
  return { owner, repo, prNumber: pr.number, pr };
}

export async function ghGetPr(octokit: Octokit, owner: string, repo: string, prNumber: number): Promise<PRInfo> {
  const { data } = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
  return {
    title: data.title,
    body: data.body || "",
    head: data.head.ref,
    base: data.base.ref,
    html_url: data.html_url,
    user: data.user?.login || "unknown",
  };
}

export async function ghListChangedFiles(octokit: Octokit, owner: string, repo: string, prNumber: number): Promise<ChangedFile[]> {
  const files = await octokit.paginate(octokit.pulls.listFiles, { owner, repo, pull_number: prNumber, per_page: 100 });
  return files.map(f => ({
    filename: f.filename,
    status: f.status!,
    additions: f.additions!,
    deletions: f.deletions!,
    patch: f.patch || ""
  }));
}

// Commit-level analysis (no PR)
export interface CommitFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export async function ghGetCommitFiles(octokit: Octokit, owner: string, repo: string, sha: string): Promise<CommitFile[]> {
  const { data } = await octokit.repos.getCommit({ owner, repo, ref: sha });
  return (data.files || []).map(f => ({
    filename: f.filename!,
    status: f.status!,
    additions: f.additions!,
    deletions: f.deletions!,
    patch: f.patch
  }));
}

export async function ghPostPrComment(octokit: Octokit, owner: string, repo: string, prNumber: number, body: string) {
  await octokit.issues.createComment({ owner, repo, issue_number: prNumber, body });
}
