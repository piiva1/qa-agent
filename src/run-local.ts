import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";

import {
  ghGetPr,
  ghListChangedFiles,
  ghGetCommitFiles,
  PRInfo,
  ChangedFile,
} from "./github.js";
import { summarizeFiles, filesToMarkdown } from "./utils/diff.js";
import { buildPrompt } from "./prompt.js";
import { deriveERPInsights } from "./heuristics/erp.js";
import { generateWithGemini } from "./llm.js";

const argv = yargs(hideBin(process.argv))
  // owner/repo opcionais; autodetect via git remote
  .option("owner", { type: "string", describe: "GitHub owner/org (opcional; auto via git remote)" })
  .option("repo", { type: "string", describe: "GitHub repository name (opcional; auto via git remote)" })
  .option("pr", { type: "number", describe: "Pull Request number to analyze" })
  .option("commit", { type: "string", describe: "Commit SHA to analyze" })
  .option("model", { type: "string", describe: "ID do modelo Gemini (ex.: gemini-2.5-flash)" }) // << ADICIONADO
  .check((args) => {
    if (!args.pr && !args.commit) throw new Error("Informe --pr <number> OU --commit <sha>");
    if (args.pr && args.commit) throw new Error("Use apenas um: --pr OU --commit");
    return true;
  })
  .help()
  .argv as unknown as { owner?: string; repo?: string; pr?: number; commit?: string; model?: string };

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN não encontrado no ambiente. Exporte antes de rodar.");
  const octokit = new Octokit({ auth: token });

  // Detecta owner/repo automaticamente via remote origin, se não vierem por CLI
  let owner = argv.owner;
  let repo = argv.repo;

  if (!owner || !repo) {
    try {
      const remoteUrl = execSync("git config --get remote.origin.url").toString().trim();
      // HTTPS: https://github.com/user/repo.git  |  SSH: git@github.com:user/repo.git
      const match = remoteUrl.match(/[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
      if (match) {
        owner = owner || match[1];
        repo = repo || match[2];
        console.log(`📡 Detectado repo automático: ${owner}/${repo}`);
      } else {
        throw new Error("Não foi possível detectar o repositório automaticamente via git remote.");
      }
    } catch {
      throw new Error("Falha ao detectar repositório local. Informe --owner e --repo.");
    }
  }

  // Carrega PR ou Commit conforme argumento
  let prInfo: PRInfo;
  let files: ChangedFile[];

  if (argv.pr) {
    prInfo = await ghGetPr(octokit, owner!, repo!, argv.pr);
    files = await ghListChangedFiles(octokit, owner!, repo!, argv.pr);
  } else {
    // análise por commit SHA (sem PR)
    const commitSha = argv.commit!;
    const commitFiles = await ghGetCommitFiles(octokit, owner!, repo!, commitSha);
    prInfo = {
      title: `Commit ${commitSha}`,
      body: "",
      head: "commit",
      base: "commit",
      html_url: `https://github.com/${owner}/${repo}/commit/${commitSha}`,
      user: "local-run",
    };
    files = commitFiles.map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch || "",
    }));
  }

  // Resume diffs p/ não estourar tokens e monta prompt
  const summarized = summarizeFiles(files);
  const filesMd = filesToMarkdown(summarized);

  const bigText = [prInfo.title, prInfo.body].join("\n\n");
  const erp = deriveERPInsights(summarized, bigText);

  // usa --model se vier; senão, MODEL_NAME do env; o llm.ts pode ter fallback interno
  const modelId = argv.model || process.env.MODEL_NAME;
  const prompt = buildPrompt({ prInfo, filesMd, erpHint: erp });
  const report = await generateWithGemini(prompt, modelId);

  console.log("\n\n================= RELATÓRIO DO AGENTE =================\n");
  console.log(report);
  console.log("\n========================================================\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
