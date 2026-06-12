export function buildSystemPrompt(contextMarkdown: string, extra?: string): string {
  const trimmedContext = contextMarkdown.trim();
  const trimmedExtra = extra?.trim() ?? '';

  const sections = [
    'You are a helpful assistant for a company website.',
    'Answer questions using ONLY the site content provided below.',
    'If the answer is not in the content, say you do not have that information and suggest contacting the team.',
    'Be concise, friendly, and accurate. Do not invent facts, metrics, or client names.',
    'When relevant, mention which page or section the answer comes from.',
  ];

  if (trimmedExtra) {
    sections.push('', 'Additional instructions:', trimmedExtra);
  }

  if (trimmedContext) {
    sections.push('', '---', 'SITE CONTENT (markdown):', trimmedContext);
  } else {
    sections.push('', 'No site content has been configured yet.');
  }

  return sections.join('\n');
}
