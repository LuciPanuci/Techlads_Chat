export type ContextChunk = {
  id: string;
  title: string;
  body: string;
};

/** Split markdown on level-1/2 headings for lightweight retrieval. */
export function chunkMarkdown(markdown: string): ContextChunk[] {
  const lines = markdown.split('\n');
  const chunks: ContextChunk[] = [];
  let currentTitle = 'Introduction';
  let currentBody: string[] = [];

  const flush = () => {
    const body = currentBody.join('\n').trim();
    if (!body && chunks.length === 0) return;
    chunks.push({
      id: slugify(currentTitle),
      title: currentTitle,
      body: body || currentTitle,
    });
    currentBody = [];
  };

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    if (h1 || h2) {
      flush();
      currentTitle = (h1?.[1] ?? h2?.[1] ?? currentTitle).trim();
      continue;
    }
    currentBody.push(line);
  }

  flush();
  return chunks.length > 0 ? chunks : [{ id: 'content', title: 'Content', body: markdown.trim() }];
}

/** Naive keyword overlap retrieval — good enough for small site corpora. */
export function retrieveRelevantChunks(
  markdown: string,
  query: string,
  limit = 5,
): ContextChunk[] {
  const chunks = chunkMarkdown(markdown);
  if (chunks.length <= limit) return chunks;

  const terms = tokenize(query);
  if (terms.length === 0) return chunks.slice(0, limit);

  const scored = chunks
    .map((chunk) => {
      const haystack = `${chunk.title}\n${chunk.body}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { chunk, score };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored.filter((item) => item.score > 0).slice(0, limit);
  if (top.length === 0) return chunks.slice(0, limit);
  return top.map((item) => item.chunk);
}

export function chunksToMarkdown(chunks: ContextChunk[]): string {
  return chunks.map((chunk) => `## ${chunk.title}\n\n${chunk.body}`).join('\n\n');
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
