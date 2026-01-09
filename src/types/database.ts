export type AppRole = 'admin' | 'moderator' | 'user';
export type AgentObjective = 'sales' | 'support' | 'information';
export type AgentStatus = 'draft' | 'active' | 'paused' | 'archived';
export type DocumentStatus = 'pending' | 'processing' | 'indexed' | 'failed';
export type DocumentType = 'pdf' | 'text' | 'url';
export type TransactionType = 'purchase' | 'usage' | 'bonus' | 'refund';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  company_website: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  objective: AgentObjective;
  tone: string | null;
  personality: string | null;
  system_prompt: string | null;
  welcome_message: string | null;
  status: AgentStatus;
  widget_color: string | null;
  widget_position: string | null;
  avatar_url: string | null;
  whatsapp_enabled: boolean;
  whatsapp_number: string | null;
  webchat_enabled: boolean;
  tools: string[];
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  agent_id: string | null;
  name: string;
  type: DocumentType;
  url: string | null;
  file_path: string | null;
  file_size: number | null;
  status: DocumentStatus;
  error_message: string | null;
  chunks_count: number;
  created_at: string;
  updated_at: string;
}

export interface Credits {
  id: string;
  user_id: string;
  balance: number;
  total_purchased: number;
  total_used: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  agent_id: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  agent_id: string;
  user_id: string;
  channel: string;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_phone: string | null;
  status: string;
  messages_count: number;
  tokens_used: number;
  started_at: string;
  ended_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  tokens: number;
  created_at: string;
}
