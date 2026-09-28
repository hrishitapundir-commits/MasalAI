/**
 * Lead Data Models for MasalAI
 * Phase 3 AI Analysis & Real Estate Lead Intelligence Specification
 */

// 1. Core Lead Intake Fields
export type LeadTimeline =
  | 'Immediate (< 1 month)'
  | '1 - 3 months'
  | '3 - 6 months'
  | '6+ months'
  | 'Just exploring / Flexible';

export const TIMELINE_OPTIONS: LeadTimeline[] = [
  'Immediate (< 1 month)',
  '1 - 3 months',
  '3 - 6 months',
  '6+ months',
  'Just exploring / Flexible',
];

export interface LeadInputFields {
  name: string;                // Field 1: Name (Required)
  location: string;            // Field 2: Location (Required)
  propertyRequirement: string; // Field 3: Property requirement (Required)
  budget: string;              // Field 4: Budget (Required)
  timeline: LeadTimeline;      // Field 5: Timeline dropdown (Required)
  customerMessage: string;     // Field 6: Customer message with length cap (Required)

  // Optional contact fields for outreach
  email?: string;
  phone?: string;
}

// 2. AI Analysis Structure (Phase 3 Core Specification)
export type LeadQualification = 'HOT' | 'WARM' | 'COLD';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'DISQUALIFIED' | 'CLOSED';
export type LeadPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AnalysisStatus = 'idle' | 'analyzing' | 'completed' | 'failed';

export interface LeadAiAnalysis {
  // Phase 3 required fields from model
  summary: string;                 // High-level summary of the lead
  intent: string;                  // Deduced buyer intent (e.g. End-user, Investor, Relocation)
  keyRequirements: string[];       // Key property specifications extracted
  objections: string[];            // Potential buyer hesitations, constraints, or friction points
  nextAction: string;              // Concrete next step for the sales rep / broker
  suggestedResponse: string;       // Ready-to-send personalized response message for the client
  score: number;                   // Fit/Urgency score produced by model (0 - 100)
  urgent: boolean;                 // Model-flagged urgency flag
  scoreReasoning: string;          // Model one-line explanation of the score

  // Deterministic code decision (Hot, Warm, Cold calculated in application code)
  qualification: LeadQualification; // Decided by our deterministic code based on score & rubric
  qualificationReasoning: string;  // Explanation of why the code classified it as Hot, Warm, or Cold

  // Backward compatibility helpers
  painPoints?: string[];
  opportunities?: string[];
  recommendedPitch?: string;
  suggestedQuestions?: string[];

  analyzedAt: string;              // ISO timestamp
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
  analysisStatus?: AnalysisStatus;
  analysisError?: string;          // Stored error message if analysis fails
  chatHistory: ChatMessage[];
  callUpdates: CallUpdate[];
  followUpDate?: string;           // Optional follow-up date (ISO YYYY-MM-DD)
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
