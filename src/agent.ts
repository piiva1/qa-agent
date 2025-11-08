import { Octokit } from "@octokit/rest";
import { generateWithGemini } from "./llm.js";
import { parseGhContext, ghGetPr, ghListChangedFiles, ghPostPrComment } from "./github.js";
// Jira mantido, porém desativado no fluxo do Actions (pode reativar quando quiser)
// import { extractIssueKey, jiraGetIssue, jiraPostComment } from "./jira.js";
import { summarizeFiles, filesToMarkdown } from "./utils/diff.js";
import { buildPrompt } from "./prompt.js";
import { deriveERPInsights } from "./heuristics/erp.js";

(async () => {
  try {
    const { owner, repo, prNumber } = parseGhContext();
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const prInfo = await ghGetPr(octokit, owner, repo, prNumber);
    const rawFiles = await ghListChangedFiles(octokit, owner, repo, prNumber);
    const files = summarizeFiles(rawFiles);
    const filesMd = filesToMarkdown(files);

    // const issueKey = extractIssueKey(prInfo.title, prInfo.body, prInfo.head) || null;
    // const jira = issueKey ? await jiraGetIssue(issueKey).catch(() => undefined) : undefined;

    const bigText = [prInfo.title, prInfo.body].join("\n\n");
    const erp = deriveERPInsights(files, bigText);

    const prompt = buildPrompt({ prInfo, filesMd, /* jira, */ erpHint: erp });
    const report = await generateWithGemini(prompt, process.env.MODEL_NAME);

    await ghPostPrComment(octokit, owner, repo, prNumber, report);

    console.log("QA ERP Agent (Gemini) finished (Actions mode).");
  } catch (err) {
    console.error("QA ERP Agent (Gemini) failed:", err);
    process.exit(1);
  }
})();
