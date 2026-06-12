const DEFAULT_RULES = [
  'You are a helpful assistant for a company website.',
  'Answer using ONLY the site content provided below.',
  'If the answer is not in the content, say you do not have that information.',
  'Be concise, friendly, and accurate. Do not invent facts, metrics, or client names.',
  'When relevant, mention which page or section the answer comes from.',
  'Never include meta-commentary about your tone or response style.',
];

const SERVICES_VS_PROJECTS_RULES = [
  'SERVICES vs PROJECTS — this distinction matters:',
  '- Services (pages under /services/) describe what the company offers and delivers to clients. These are the primary answer when someone asks about capabilities.',
  '- Projects (pages under /projects/) are case studies, shipped products, or portfolio work. They illustrate experience; they are not the default offering.',
  'When a visitor asks a capability question (e.g. "do you do websites?", "can you build mobile apps?", "do you offer AI?"):',
  '1. Answer from the matching service page(s): confirm yes/no, summarize what that service includes, and share relevant service-specific details (how we work, what we build, FAQs).',
  '2. Do NOT lead with or center a project unless the visitor names it or describes a need that maps clearly to that specific product.',
  '3. Only mention a project as a brief optional alternative when it genuinely fits their situation (e.g. a self-serve platform vs a custom build). Frame it as "we also built X, which may suit you if…" — never as the main way the company delivers that service.',
  '4. Do not copy project marketing language as if it were the general service offering.',
  'When a visitor asks about a named project or product, answer from that project page.',
];

const DISCOVERY_INQUIRY_RULES = [
  'PRIMARY GOAL — discovery and handoff:',
  '- Your main job is to understand what the visitor is building, what problem they need solved, timeline, and constraints — then guide them toward how the team can help.',
  '- Use site content to inform answers, not to deliver a sales pitch. Ask clarifying questions when helpful.',
  '- After you have enough context, or when they ask for a quote, next steps, or to talk to the team, offer to send their inquiry on their behalf.',
  'INQUIRY HANDOFF (contact form trigger):',
  '- Offer to send an inquiry when: they want a quote or estimate; they want to start a project; they ask to talk to someone; you lack specific info (pricing, timeline for their case); or the conversation has enough detail to brief the team.',
  '- Do NOT offer an inquiry for simple questions you can answer fully from site content.',
  '- When offering, ask if they would like you to send a message to the team. If yes, include this exact token at the END of your response (on its own line):',
  '  [CONTACT_FORM_TRIGGER:YOUR_DRAFT_MESSAGE]',
  '- YOUR_DRAFT_MESSAGE must be a professional, ready-to-send summary: who they are (if known), what they want to build, relevant constraints, and what they need from the team. Write it in first person from the visitor\'s perspective.',
  '- Never show the token before the visitor has agreed or the moment is right. Keep your spoken reply concise; the token is hidden from the visitor.',
];

export type BuildPromptInput = {
  chatbotName: string;
  businessName: string;
  contextMarkdown: string;
  systemPromptExtra?: string;
  routePath?: string | null;
  hasHistory?: boolean;
};

export function buildSystemPrompt(input: BuildPromptInput): string {
  const sections: string[] = [
    `You are ${input.chatbotName}, AI assistant for ${input.businessName || 'this business'}.`,
  ];

  if (input.routePath) {
    sections.push(`The visitor is currently on: ${input.routePath}`);
  }

  sections.push('', 'RULES:', ...DEFAULT_RULES.map((rule) => `- ${rule}`));
  sections.push('', ...SERVICES_VS_PROJECTS_RULES.map((rule) => `- ${rule}`));
  sections.push('', ...DISCOVERY_INQUIRY_RULES.map((rule) => `- ${rule}`));

  const extra = input.systemPromptExtra?.trim();
  if (extra) {
    sections.push('', 'ADDITIONAL INSTRUCTIONS:', extra);
  }

  const context = input.contextMarkdown?.trim();
  if (context) {
    sections.push('', '---', 'SITE CONTENT (markdown):', context);
  } else {
    sections.push('', 'No site content has been configured yet.');
  }

  sections.push(
    '',
    input.hasHistory
      ? 'CONVERSATION CONTEXT: This is a continuing conversation.'
      : 'NEW CONVERSATION: Be helpful but do not over-introduce.',
  );

  return sections.join('\n');
}

const SERVICE_PAGE_RE = /Page: \/services\//;
const PROJECT_PAGE_RE = /Page: \/projects\//;

const TERM_GROUPS: string[][] = [
  ['website', 'websites', 'web', 'sites', 'saas', 'ecommerce', 'e-commerce', 'cms'],
  ['mobile', 'ios', 'android', 'apps'],
  ['ai', 'llm', 'chatbot', 'rag', 'machine', 'automation'],
  ['blockchain', 'crypto', 'defi', 'smart', 'on-chain', 'onchain', 'solidity'],
  ['cloud', 'devops', 'hosting', 'infrastructure', 'deploy', 'ci', 'cd'],
  ['maintenance', 'support', 'monitoring', 'reliability', 'uptime'],
];

function expandTerms(words: string[]): string[] {
  const expanded = new Set(words);

  for (const group of TERM_GROUPS) {
    if (group.some((term) => expanded.has(term))) {
      for (const term of group) {
        expanded.add(term);
      }
    }
  }

  return [...expanded];
}

function isCapabilityQuestion(query: string): boolean {
  const q = query.toLowerCase();
  return /\b(do you|can you|do we|does your|offer|provide|build|make|create|help with|services?|capabilities|work on)\b/.test(
    q,
  );
}

function queryMentionsSection(query: string, section: string): boolean {
  const titleMatch = section.match(/^#\s+(.+)/m);
  if (!titleMatch) return false;

  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const title = normalize(titleMatch[1]);
  const q = normalize(query);

  if (title.length > 3 && q.includes(title)) return true;

  const titleWords = titleMatch[1]
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/g, ''))
    .filter((word) => word.length > 3);

  return titleWords.some((word) => q.includes(word));
}

function scoreSection(section: string, terms: string[], query: string): number {
  const haystack = section.toLowerCase();
  let score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);

  const capability = isCapabilityQuestion(query);
  const isService = SERVICE_PAGE_RE.test(section);
  const isProject = PROJECT_PAGE_RE.test(section);
  const sectionMentioned = queryMentionsSection(query, section);

  if (capability && isService) {
    score += 4;
  }

  if (capability && isProject && !sectionMentioned) {
    score -= 3;
  }

  if (sectionMentioned) {
    score += 6;
  }

  if (capability && /^#\s+Services\b/m.test(section)) {
    score += 2;
  }

  return score;
}

export function chunkMarkdownForQuery(markdown: string, query: string, limit = 6): string {
  const trimmed = markdown.trim();
  if (!trimmed) return '';

  const sections = trimmed.split(/\n(?=#{1,2}\s)/);
  if (sections.length <= limit) return trimmed;

  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2);

  const terms = expandTerms(words);

  if (terms.length === 0) {
    return sections.slice(0, limit).join('\n');
  }

  const scored = sections
    .map((section, index) => ({
      section,
      score: scoreSection(section, terms, query),
      index,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const top = scored.filter((item) => item.score > 0).slice(0, limit);
  if (top.length === 0) {
    return sections.slice(0, limit).join('\n');
  }

  return top
    .sort((a, b) => a.index - b.index)
    .map((item) => item.section)
    .join('\n');
}
