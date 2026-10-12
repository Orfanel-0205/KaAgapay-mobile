// utils/richText.ts
//
// The assistant writes light markdown: **bold** words and "* " bullets. The
// chat showed them raw -- "**Magpahinga po muna.**" with the asterisks (Oct
// 2026). This splits a reply into plain and bold runs for the bubble, and
// turns "* " / "- " at the start of a line into a bullet.

export interface TextRun {
  text: string;
  bold: boolean;
}

export function richTextRuns(raw: string): TextRun[] {
  const text = raw
    .replace(/^(\s*)[*-]\s+/gm, "$1• ")
    .replace(/`([^`]+)`/g, "$1");

  const runs: TextRun[] = [];
  const pattern = /\*\*(.+?)\*\*/gs;
  let last = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) runs.push({ text: text.slice(last, start), bold: false });
    runs.push({ text: match[1], bold: true });
    last = start + match[0].length;
  }

  if (last < text.length) runs.push({ text: text.slice(last), bold: false });

  // A stray asterisk left from an unclosed pair is noise, not emphasis.
  return runs
    .map((run) => ({ ...run, text: run.bold ? run.text : run.text.replace(/\*\*/g, "") }))
    .filter((run) => run.text.length > 0);
}
