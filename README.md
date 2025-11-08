# QA ERP Agent — Gemini (CLI + Actions)

Agente para revisar **PR** ou **commit** do GitHub e gerar:
- **Resumo** do que mudou + **contexto ERP** (ex.: NFe, Financeiro).
- **Lacunas** em testes manuais (se citados na PR).
- **Casos de teste** focados (Fumaça/Funcional/Bordas) e **roteiro exploratório** por risco.
- **Heurísticas ERP** (ex.: alterações em parcelas da NFe → revisar títulos/receitas, baixas, conciliação, notas manuais, importação, CNAB).

> **Jira**: helpers estão presentes mas desativados por padrão no CLI e no workflow. Quando quiser, basta reativar os imports e chamadas.

## 1) Instalação
```bash
npm install
npm run build
```

## 2) Rodar localmente (CLI)

### Por PR
```bash
export GOOGLE_API_KEY="sua_chave_gemini"
export GITHUB_TOKEN="seu_token_github"   # classic fine-grained ou PAT com repo read
node dist/run-local.js --owner seuUser --repo seuRepo --pr 42
```
ou com script:
```bash
npm run analyze:pr -- --owner seuUser --repo seuRepo --pr 42
```

### Por commit específico (SHA)
```bash
export GOOGLE_API_KEY="sua_chave_gemini"
export GITHUB_TOKEN="seu_token_github"
node dist/run-local.js --owner seuUser --repo seuRepo --commit 3a1b2c3d4e
```
ou com script:
```bash
npm run analyze:commit -- --owner seuUser --repo seuRepo --commit 3a1b2c3d4e
```

A saída será impressa no terminal com o **relatório completo** do agente.

## 3) Rodar no GitHub Actions (automático na PR)
- Configure o workflow `.github/workflows/qa-agent.yml` (já incluso).
- Adicione `GOOGLE_API_KEY` e `GITHUB_TOKEN` (injetado automaticamente) nos **Actions secrets**.
- (Opcional) Adicione `JIRA_*` quando quiser ativar Jira.

## 4) Reativar Jira (opcional futuro)
- Descomente os imports e chamadas em `src/agent.ts` referentes a:
  ```ts
  import { extractIssueKey, jiraGetIssue, jiraPostComment } from "./jira.js";
  const issueKey = extractIssueKey(prInfo.title, prInfo.body, prInfo.head);
  const jira = issueKey ? await jiraGetIssue(issueKey) : undefined;
  const prompt = buildPrompt({ prInfo, filesMd, jira, erpHint: erp });
  await jiraPostComment(issueKey!, "...");
  ```
- Configure secrets: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`.

## 5) Observações
- Ajuste os limites do diff em `src/utils/diff.ts` caso as PRs sejam muito grandes.
- Personalize termos/heurísticas ERP em `src/heuristics/erp.ts` para seu domínio.
- `MODEL_NAME` (opcional): `gemini-1.5-pro` (melhor qualidade) ou `gemini-1.5-flash` (mais rápido).

Bom uso! 🚀
