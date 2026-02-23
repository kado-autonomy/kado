export interface DiffHunk {
  startLine: number;
  endLine: number;
  type: "add" | "delete" | "modify";
  original: string;
  modified: string;
}

export interface DiffResult {
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

type DiffOp = { type: "=" | "-" | "+"; line: string; origIdx: number; modIdx: number };

export class DiffEngine {
  computeDiff(original: string, modified: string): DiffResult {
    const origLines = original.split("\n");
    const modLines = modified.split("\n");
    const ops = this.diffLines(origLines, modLines);
    const hunks = this.groupIntoHunks(ops);
    let additions = 0;
    let deletions = 0;
    for (const hunk of hunks) {
      if (hunk.type === "add") {
        additions += hunk.modified.split("\n").length;
      } else if (hunk.type === "delete") {
        deletions += hunk.original.split("\n").length;
      } else {
        additions += hunk.modified.split("\n").length;
        deletions += hunk.original.split("\n").length;
      }
    }
    return { hunks, additions, deletions };
  }

  private diffLines(orig: string[], mod: string[]): DiffOp[] {
    const m = orig.length;
    const n = mod.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (orig[i - 1] === mod[j - 1]) {
          dp[i]![j]! = dp[i - 1]![j - 1]! + 1;
        } else {
          dp[i]![j]! = Math.max(dp[i - 1]![j] ?? 0, dp[i]![j - 1] ?? 0);
        }
      }
    }

    const result: DiffOp[] = [];
    let i = m;
    let j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && orig[i - 1] === mod[j - 1]) {
        result.unshift({
          type: "=",
          line: orig[i - 1]!,
          origIdx: i - 1,
          modIdx: j - 1,
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || (dp[i]![j - 1] ?? 0) >= (dp[i - 1]![j] ?? 0))) {
        result.unshift({
          type: "+",
          line: mod[j - 1]!,
          origIdx: i,
          modIdx: j - 1,
        });
        j--;
      } else if (i > 0) {
        result.unshift({
          type: "-",
          line: orig[i - 1]!,
          origIdx: i - 1,
          modIdx: j,
        });
        i--;
      }
    }
    return result;
  }

  private groupIntoHunks(ops: DiffOp[]): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    let i = 0;

    while (i < ops.length) {
      while (i < ops.length && ops[i]!.type === "=") i++;
      const chunk: DiffOp[] = [];
      while (i < ops.length && ops[i]!.type !== "=") {
        chunk.push(ops[i]!);
        i++;
      }

      if (chunk.length === 0) continue;

      const dels = chunk.filter((c) => c.type === "-");
      const adds = chunk.filter((c) => c.type === "+");
      const startLine =
        dels.length > 0
          ? Math.min(...dels.map((c) => c.origIdx)) + 1
          : (adds[0]?.modIdx ?? 0) + 1;
      const endLine =
        dels.length > 0
          ? Math.max(...dels.map((c) => c.origIdx)) + 1
          : startLine;
      const original = dels.map((c) => c.line).join("\n");
      const modified = adds.map((c) => c.line).join("\n");

      let type: "add" | "delete" | "modify" = "modify";
      if (dels.length === 0) type = "add";
      else if (adds.length === 0) type = "delete";

      hunks.push({
        startLine,
        endLine: type === "add" ? startLine : endLine,
        type,
        original,
        modified,
      });
    }
    return hunks;
  }

  applyHunk(content: string, hunk: DiffHunk, accept: boolean): string {
    const lines = content.split("\n");
    const startIdx = hunk.startLine - 1;
    const endIdx = hunk.endLine;

    if (accept) {
      const before = lines.slice(0, startIdx);
      const newLines = hunk.modified ? hunk.modified.split("\n") : [];
      const after = lines.slice(endIdx);
      return [...before, ...newLines, ...after].join("\n");
    } else {
      const before = lines.slice(0, startIdx);
      const after = lines.slice(endIdx);
      return [...before, ...after].join("\n");
    }
  }

  generatePatch(original: string, modified: string, filePath = "file"): string {
    const { hunks } = this.computeDiff(original, modified);
    const lines: string[] = [`--- a/${filePath}`, `+++ b/${filePath}`];

    for (const hunk of hunks) {
      const origCount = hunk.original ? hunk.original.split("\n").length : 0;
      const modCount = hunk.modified ? hunk.modified.split("\n").length : 0;
      lines.push(
        `@@ -${hunk.startLine},${origCount} +${hunk.startLine},${modCount} @@`
      );
      for (const line of hunk.original.split("\n")) {
        lines.push(`-${line}`);
      }
      for (const line of hunk.modified.split("\n")) {
        lines.push(`+${line}`);
      }
    }
    return lines.join("\n");
  }
}
