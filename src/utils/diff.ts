import { ChangedFile } from "../github";

const MAX_FILE_COUNT = 60;
const MAX_PATCH_CHARS = 9000;
const HUNK_SLICE = 4000;

export function summarizeFiles(files: ChangedFile[]): ChangedFile[] {
  const limited = files.slice(0, MAX_FILE_COUNT);
  return limited.map(f => {
    let patch = f.patch || "";
    if (patch.length > MAX_PATCH_CHARS) {
      patch = patch.slice(0, HUNK_SLICE) + "\n...\n" + patch.slice(-HUNK_SLICE);
    }
    return { ...f, patch };
  });
}

export function filesToMarkdown(files: ChangedFile[]): string {
  return files.map(f => `- ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})\nPatch:\n${f.patch || ""}`).join("\n\n");
}
