import { ChangedFile } from "../github";

export interface ERPInsights {
  modulesDetected: string[];
  riskNotes: string[];
  suggestedFocusAreas: string[];
}

const KEYWORDS: Record<string, string[]> = {
  nfe: ["nfe", "nf-e", "nota-fiscal-eletronica", "xml", "sefaz", "danfe", "icms", "pis", "cofins", "cfop", "cst", "cbenefrbc", "parcel", "duplicata", "boleto", "titulo"],
  financeiro: ["finance", "receita", "despesa", "conta", "baixa", "concili", "cnab", "remessa", "retorno"],
  vendas: ["pedido", "orcamento", "venda", "order", "sales"],
  estoque: ["estoque", "inventario", "saldo", "almox"],
  cadastro: ["produto", "servico", "ncm", "grupo", "cliente", "fornecedor"],
  relatorio: ["report", "relatorio", "pdf", "html", "impress", "core.generate-report"]
};

function detectModulesFromFilename(name: string): string[] {
  const key = name.toLowerCase();
  const hits: string[] = [];
  for (const [mod, kws] of Object.entries(KEYWORDS)) {
    if (kws.some(k => key.includes(k))) hits.push(mod);
  }
  return hits;
}

export function deriveERPInsights(files: ChangedFile[], jiraAndPrText: string): ERPInsights {
  const modules = new Set<string>();
  files.forEach(f => detectModulesFromFilename(f.filename).forEach(m => modules.add(m)));
  const txt = jiraAndPrText.toLowerCase();
  for (const [mod, kws] of Object.entries(KEYWORDS)) {
    if (kws.some(k => txt.includes(k))) modules.add(mod);
  }
  const modulesDetected = Array.from(modules);

  const riskNotes: string[] = [];
  if (modules.has("nfe") && modules.has("financeiro")) {
    riskNotes.push("Mudanças em NFe envolvendo parcelas/duplicatas costumam afetar **Financeiro** (títulos, baixas, conciliação, CNAB).");
  }
  if (modules.has("relatorio")) {
    riskNotes.push("Relatórios (HTML/PDF) exigem validação de filtros, paginação, totalizadores e geração assíncrona (toasts/WebSocket).");
  }
  if (modules.has("nfe")) {
    riskNotes.push("Revisar cálculos fiscais (ICMS, PIS/COFINS, benefícios por UF como `cBenefRBC`) e consistência em DANFE/XML.");
  }

  const suggestedFocusAreas: string[] = [];
  if (modules.has("nfe")) {
    suggestedFocusAreas.push(
      "NFe → **Parcelas/duplicatas**: geração, arredondamentos, soma das parcelas = total da nota.",
      "NFe → **Financeiro**: criação de títulos/receitas, vínculos com a nota, baixas parciais/totais, juros/multa.",
      "NFe → **Entrada manual & importação**: notas manuais e importadas devem refletir o mesmo cálculo de parcelas.",
      "NFe → **Integrações**: impacto em CNAB (remessa/retorno) e gateways de pagamento."
    );
  }
  if (modules.has("financeiro")) {
    suggestedFocusAreas.push(
      "Financeiro → **Conciliação** bancária e regras de baixa automática.",
      "Financeiro → **Relatórios** de receitas/despesas e totalizadores."
    );
  }
  if (modules.has("relatorio")) {
    suggestedFocusAreas.push(
      "Relatórios → **HTML/PDF**: filtros (cliente/período), paginação e encoding.",
      "Relatórios → validar **status** (200/500) e confirmação via WebSocket/toast."
    );
  }

  return { modulesDetected, riskNotes, suggestedFocusAreas };
}
