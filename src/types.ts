export type ChatMessageRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: number;
};

export type WidgetPosition = 'bottom-right' | 'bottom-left';

export type SiteChatAppearance = {
  title: string;
  subtitle: string;
  primaryColor: string;
  position: WidgetPosition;
  placeholder: string;
  welcomeMessage: string;
};

export type SiteChatConfig = {
  /** Public endpoint that proxies chat to Anthropic (never put the API key in the browser). */
  chatEndpoint: string;
  model: string;
  maxTokens: number;
  /** Extra instructions appended to the built-in system prompt. */
  systemPromptExtra: string;
  /** Full markdown corpus injected into the system prompt. */
  contextMarkdown: string;
  appearance: SiteChatAppearance;
  /** ISO timestamp of last config save — useful for admin display only. */
  updatedAt: string;
};

export type ChatRequestBody = {
  messages: Array<{ role: ChatMessageRole; content: string }>;
};

export type ChatResponseBody = {
  message: string;
  model: string;
};

export type ChatHandlerOptions = {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  /** Static context or async loader (e.g. read from disk at request time). */
  getContext?: () => string | Promise<string>;
  systemPromptExtra?: string;
};

export const STORAGE_KEY = 'site-context-chat-config';

export const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export const DEFAULT_APPEARANCE: SiteChatAppearance = {
  title: 'Ask us anything',
  subtitle: 'Answers from our site content',
  primaryColor: '#2563eb',
  position: 'bottom-right',
  placeholder: 'Ask a question…',
  welcomeMessage:
    "Tell me what you're working on — I'll gather the details and pass them to our team.",
};

export const DEFAULT_CONFIG: SiteChatConfig = {
  chatEndpoint: '/api/chat',
  model: DEFAULT_MODEL,
  maxTokens: 1024,
  systemPromptExtra: '',
  contextMarkdown: '',
  appearance: DEFAULT_APPEARANCE,
  updatedAt: '',
};
