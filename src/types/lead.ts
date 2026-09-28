/**
 * Lead Data Models for MasalAI
 * Covers the 6 input fields, AI analysis, chat history, call updates, and optional follow-up date.
 */

// 1. Core Lead Input Fields (The 6 foundational fields captured at intake)
export interface LeadInputFields {
  name: string;          // Field 1: Contact / Lead Full Name
  email: string;         // Field 2: Email Address
  phone: string;         // Field 3: Phone Number
  company: string;       // Field 4: Company or Organization Name
  role: string;          // Field 5: Job Title / Designation / Role
  notes: string;         // Field 6: Business Need, Initial Inquiry, or Lead Notes
}

// 2. AI Analysis Structure
export type LeadQualification = 'HOT' | 'WARM' | 'COLD';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'DISQUALIFIED' | 'CLOSED';
export type LeadPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface LeadAiAnalysis {
  score: number;                   // Fit/Qualification score (0 - 100)
  qualification: LeadQualification; // Hot, Warm, Cold
  summary: string;                 // High-level AI assessment summary
  painPoints: string[];            // Inferred pain points and business challenges
  opportunities: string[];         // Expansion, budget, or timeline signals
  recommendedPitch: string;        // Suggested messaging / angle for the sales call
  suggestedQuestions: string[];    // Top questions for the qualification call
  analyzedAt: string;              // ISO timestamp of when analysis was generated
  modelUsed?: string;              // e.g. "gemini-2.5-flash"
}

// 3. Chat History
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;               // ISO timestamp
}

// 4. Call Updates / Meeting Logs
export type CallSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

export interface CallUpdate {
  id: string;
  date: string;                    // ISO timestamp of the call
  durationMinutes?: number;        // Duration in minutes
  summary: string;                 // What was discussed
  sentiment?: CallSentiment;       // Perceived client sentiment
  outcome: string;                 // Key results or agreement
  nextAction?: string;             // Next steps agreed upon
  loggedBy?: string;               // Representative who conducted the call
}

// Full Lead Entity
export interface Lead extends LeadInputFields {
  id: string;
  status: LeadStatus;
  priority: LeadPriority;
  aiAnalysis?: LeadAiAnalysis;
  chatHistory: ChatMessage[];
  callUpdates: CallUpdate[];
  followUpDate?: string;           // Optional follow-up date (ISO string YYYY-MM-DD or timestamp)
  createdAt: string;               // ISO timestamp
  updatedAt: string;               // ISO timestamp
}

// Input DTO for creating a new lead
export type CreateLeadDTO = LeadInputFields & {
  followUpDate?: string;
  priority?: LeadPriority;
};

// Input DTO for updating an existing lead
export type UpdateLeadDTO = Partial<Omit<Lead, 'id' | 'createdAt'>>;
