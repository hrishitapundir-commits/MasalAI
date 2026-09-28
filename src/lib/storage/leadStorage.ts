import {
  Lead,
  CreateLeadDTO,
  UpdateLeadDTO,
  ChatMessage,
  CallUpdate,
  LeadAiAnalysis,
} from '@/types/lead';

/**
 * Storage interface contract for Lead persistence.
 * Any future database (PostgreSQL, Supabase, MongoDB, Prisma) will implement this exact interface,
 * allowing instant swapping without touching UI or business logic.
 */
export interface LeadStorageAdapter {
  getAll(): Promise<Lead[]>;
  getById(id: string): Promise<Lead | null>;
  create(dto: CreateLeadDTO): Promise<Lead>;
  update(id: string, updates: UpdateLeadDTO): Promise<Lead>;
  delete(id: string): Promise<boolean>;
  addChatMessage(leadId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<Lead>;
  addCallUpdate(leadId: string, update: Omit<CallUpdate, 'id' | 'date'>): Promise<Lead>;
  setAiAnalysis(leadId: string, analysis: LeadAiAnalysis): Promise<Lead>;
  setFollowUpDate(leadId: string, date?: string): Promise<Lead>;
}

const STORAGE_KEY = 'masalai_leads_v1';

/**
 * Generate a unique ID cross-platform (browser/node safe)
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `lead_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Seed data for an initial out-of-the-box rich demo experience
 */
const INITIAL_DEMO_LEADS: Lead[] = [
  {
    id: 'demo-lead-1',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@techcorp.in',
    phone: '+91 98765 43210',
    company: 'TechCorp Solutions',
    role: 'VP of Engineering',
    notes: 'Looking for automated sales qualification with LLM support. Exploring Q3 rollout for 50 SDRs.',
    status: 'QUALIFIED',
    priority: 'HIGH',
    followUpDate: '2026-10-05',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    aiAnalysis: {
      score: 88,
      qualification: 'HOT',
      summary: 'High-intent buyer looking to scale SDR qualification. Strong budget authority as VP of Engineering.',
      painPoints: ['Manual SDR bottleneck in lead vetting', 'Inconsistent qualification rubrics'],
      opportunities: ['50 potential seats in Q3 rollout', 'Expanding enterprise tech stack'],
      recommendedPitch: 'Focus on automated lead scoring throughput and seamless workflow integration.',
      suggestedQuestions: ['What CRM does your SDR team currently use?', 'What is the target go-live timeline for Q3?'],
      analyzedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      modelUsed: 'gemini-2.5-flash',
    },
    chatHistory: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hi, does MasalAI support custom CRM webhooks?',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Yes! MasalAI provides extensible REST endpoints and webhooks for CRM ingestion.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60000).toISOString(),
      },
    ],
    callUpdates: [
      {
        id: 'call-1',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 20,
        summary: 'Introductory discovery call. Demoed scoring engine and live localStorage fallback.',
        sentiment: 'POSITIVE',
        outcome: 'Requested pilot proposal and technical integration doc.',
        nextAction: 'Send pilot proposal and schedule follow-up call on Oct 5.',
        loggedBy: 'Sales Rep (Hrishita)',
      },
    ],
  },
  {
    id: 'demo-lead-2',
    name: 'Sophia Chen',
    email: 'sophia@innovatedigital.com',
    phone: '+1 (555) 234-5678',
    company: 'Innovate Digital',
    role: 'Growth Marketing Director',
    notes: 'Inbound lead from website contact form. Curious about Gemini AI scoring capabilities.',
    status: 'NEW',
    priority: 'MEDIUM',
    followUpDate: '2026-10-02',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    aiAnalysis: {
      score: 72,
      qualification: 'WARM',
      summary: 'Marketing leader evaluating automated qualification to filter out noisy inbound leads.',
      painPoints: ['High inbound lead volume with low qualification rates'],
      opportunities: ['Strong marketing budget allocation for AI enablement'],
      recommendedPitch: 'Highlight instant scoring on inbound intake and automated sentiment tagging.',
      suggestedQuestions: ['How many inbound leads do you process per week?', 'What criteria define an MQL for your team?'],
      analyzedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      modelUsed: 'gemini-2.5-flash',
    },
    chatHistory: [],
    callUpdates: [],
  },
];

/**
 * Browser LocalStorage implementation of LeadStorageAdapter.
 * Handles SSR safety checks and JSON persistence.
 */
export class LocalStorageLeadAdapter implements LeadStorageAdapter {
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private readRaw(): Lead[] {
    if (!this.isBrowser()) {
      return INITIAL_DEMO_LEADS;
    }
    try {
      const item = window.localStorage.getItem(STORAGE_KEY);
      if (!item) {
        // Initialize with default demo leads on first load
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_LEADS));
        return INITIAL_DEMO_LEADS;
      }
      return JSON.parse(item) as Lead[];
    } catch (err) {
      console.error('Failed to read leads from localStorage:', err);
      return INITIAL_DEMO_LEADS;
    }
  }

  private writeRaw(leads: Lead[]): void {
    if (!this.isBrowser()) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    } catch (err) {
      console.error('Failed to write leads to localStorage:', err);
    }
  }

  async getAll(): Promise<Lead[]> {
    return this.readRaw();
  }

  async getById(id: string): Promise<Lead | null> {
    const leads = this.readRaw();
    return leads.find((l) => l.id === id) || null;
  }

  async create(dto: CreateLeadDTO): Promise<Lead> {
    const now = new Date().toISOString();
    const newLead: Lead = {
      id: generateId(),
      name: dto.name.trim(),
      email: dto.email.trim(),
      phone: dto.phone.trim(),
      company: dto.company.trim(),
      role: dto.role.trim(),
      notes: dto.notes.trim(),
      status: 'NEW',
      priority: dto.priority || 'MEDIUM',
      followUpDate: dto.followUpDate,
      chatHistory: [],
      callUpdates: [],
      createdAt: now,
      updatedAt: now,
    };

    const leads = this.readRaw();
    leads.unshift(newLead);
    this.writeRaw(leads);
    return newLead;
  }

  async update(id: string, updates: UpdateLeadDTO): Promise<Lead> {
    const leads = this.readRaw();
    const index = leads.findIndex((l) => l.id === id);
    if (index === -1) {
      throw new Error(`Lead with id "${id}" not found.`);
    }

    const updatedLead: Lead = {
      ...leads[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    leads[index] = updatedLead;
    this.writeRaw(leads);
    return updatedLead;
  }

  async delete(id: string): Promise<boolean> {
    const leads = this.readRaw();
    const filtered = leads.filter((l) => l.id !== id);
    if (filtered.length === leads.length) return false;
    this.writeRaw(filtered);
    return true;
  }

  async addChatMessage(
    leadId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
  ): Promise<Lead> {
    const lead = await this.getById(leadId);
    if (!lead) throw new Error(`Lead with id "${leadId}" not found.`);

    const newMsg: ChatMessage = {
      id: generateId(),
      role: message.role,
      content: message.content,
      timestamp: new Date().toISOString(),
    };

    return this.update(leadId, {
      chatHistory: [...lead.chatHistory, newMsg],
    });
  }

  async addCallUpdate(
    leadId: string,
    update: Omit<CallUpdate, 'id' | 'date'>
  ): Promise<Lead> {
    const lead = await this.getById(leadId);
    if (!lead) throw new Error(`Lead with id "${leadId}" not found.`);

    const newCall: CallUpdate = {
      id: generateId(),
      date: new Date().toISOString(),
      durationMinutes: update.durationMinutes,
      summary: update.summary,
      sentiment: update.sentiment,
      outcome: update.outcome,
      nextAction: update.nextAction,
      loggedBy: update.loggedBy,
    };

    return this.update(leadId, {
      callUpdates: [newCall, ...lead.callUpdates],
    });
  }

  async setAiAnalysis(leadId: string, analysis: LeadAiAnalysis): Promise<Lead> {
    return this.update(leadId, {
      aiAnalysis: analysis,
      status: 'QUALIFIED',
    });
  }

  async setFollowUpDate(leadId: string, date?: string): Promise<Lead> {
    return this.update(leadId, {
      followUpDate: date,
    });
  }
}

/**
 * Singleton instance of the lead storage module.
 * Swap this export with a database adapter (e.g. PostgresLeadAdapter, PrismaLeadAdapter)
 * whenever moving from client-side localStorage to server database persistence.
 */
export const leadStorage: LeadStorageAdapter = new LocalStorageLeadAdapter();
