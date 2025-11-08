import type { PRInfo } from "./github";
import type { JiraInfo } from "./jira";

export function buildPrompt(input: {
  prInfo: PRInfo,
  filesMd: string,
  jira?: JiraInfo,
  erpHint?: { modulesDetected: string[], riskNotes: string[], suggestedFocusAreas: string[] }
}) {
  const jiraBlock = input.jira ? `
[JIRA]
Issue: ${input.jira.key}
Resumo: ${input.jira.summary}
Descrição:
${input.jira.description}

Comentários:
${input.jira.comments}
` : "";

  const erpBlock = input.erpHint ? `
[INSIGHTS ERP HEURÍSTICOS]
Módulos detectados: ${input.erpHint.modulesDetected.join(", ") || "-"}
Notas de risco:
- ${(input.erpHint.riskNotes || []).join("\n- ") || "-"}

Áreas de foco sugeridas (para inspiração do QA):
- ${(input.erpHint.suggestedFocusAreas || []).join("\n- ") || "-"}
` : "";

  return `
Você é um **QA Sênior de ERP**. Gere um relatório técnico e prático com base no material abaixo.

[PR]
Título: ${input.prInfo.title}
Autor: ${input.prInfo.user}
Base: ${input.prInfo.base} <- Head: ${input.prInfo.head}
Descrição:
${input.prInfo.body}

${jiraBlock}

${erpBlock}

[ARQUIVOS ALTERADOS (resumo de diffs)]
${input.filesMd}

[TAREFAS]
1) **Resumo objetivo**: explique o que foi alterado e por quê (deduza pelo diff e textos).
2) **Contexto funcional**: descreva o papel das funções/módulos editados dentro de um ERP.
3) **Validação dos testes manuais**: se existirem no card/PR, avaliar cobertura e listar lacunas.
4) **Casos de teste focados** por arquivo/método (Fumaça, Funcional e Bordas) com pré-condições e oráculos.
5) **Roteiro exploratório por risco** (alto → baixo), com charters e possíveis regressões.
6) **Recomendações de regressão**: liste pontos colaterais (permissões, timezone -03:00, fiscal/UF, relatórios HTML/PDF, CNAB, integrações).
Formato: Markdown claro, com listas numeradas e checklists. Seja rastreável (cite arquivo/trecho quando possível).
`;
}
