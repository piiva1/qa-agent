// Jira helpers (mantidos, mas não usados por padrão no CLI)
import fetch from "node-fetch";

export interface JiraInfo {
  key: string;
  summary: string;
  description: string;
  comments: string;
}

export function extractIssueKey(...texts: string[]): string | null {
  const m = texts.join(" ").match(/[A-Z]+-\d+/);
  return m ? m[0] : null;
}

function b64(v: string) { return Buffer.from(v).toString("base64"); }

export async function jiraGetIssue(issueKey: string): Promise<JiraInfo> {
  const base = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!base || !email || !token) throw new Error("Jira credentials missing");

  const url = `${base}/rest/api/3/issue/${issueKey}?fields=summary,description,comment`;
  const res = await fetch(url, {
    headers: {
      "Authorization": "Basic " + b64(`${email}:${token}`),
      "Accept": "application/json"
    }
  });
  if (!res.ok) throw new Error(`Jira error ${res.status}`);
  const json: any = await res.json();

  const comments = (json.fields.comment?.comments || [])
    .map((c: any) => {
      const text = (c.body?.content || [])
        .map((b: any) => (b.content || []).map((t: any) => t.text || "").join(""))
        .join("");
      return `@${c.author?.displayName}: ${text}`;
    })
    .join("\n");

  const description = (json.fields.description?.content || [])
    .map((p: any) => (p.content || []).map((t: any) => t.text || "").join(""))
    .join("\n");

  return { key: issueKey, summary: json.fields.summary, description, comments };
}

export async function jiraPostComment(issueKey: string, body: string) {
  const base = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!base || !email || !token) return; // ignore if not configured

  const url = `${base}/rest/api/3/issue/${issueKey}/comment`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${email}:${token}`).toString("base64"),
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ body })
  });
  if (!res.ok) throw new Error(`Erro ao comentar no Jira: ${res.status}`);
}
