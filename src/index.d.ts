import type { ReactNode } from 'react';

export type SiteChatAppearance = {
  primary?: string;
  primaryDark?: string;
  secondary?: string;
  accent?: string;
  welcomeMessage?: string;
  placeholder?: string;
};

export type ChatbotProviderProps = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteId?: string;
  children: ReactNode;
};

export type SiteChatShellProps = {
  children: ReactNode;
};

export type SiteChatWidgetProps = {
  adminMode?: boolean;
  routePath?: string;
  /** Hide the launcher FAB while this element is visible (e.g. `#hero`). */
  hideFabWhenSelector?: string;
};

export type AdminPanelProps = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteId?: string;
  className?: string;
};

export type ChatbotContextValue = {
  openChat: () => void;
  closeChat: () => void;
  isChatOpen: boolean;
  [key: string]: unknown;
};

export function ChatbotProvider(props: ChatbotProviderProps): JSX.Element;
export function useChatbot(): ChatbotContextValue;
export function useChatbotOptional(): ChatbotContextValue | null;
export function ChatBubbleIcon(props: { className?: string; style?: React.CSSProperties }): JSX.Element;
export function SiteChatWidget(props: SiteChatWidgetProps): JSX.Element;
export const ChatWidget: typeof SiteChatWidget;
export function DraggableChatbotWrapper(props: Record<string, unknown>): JSX.Element;
export function AdminPanel(props: AdminPanelProps): JSX.Element;
