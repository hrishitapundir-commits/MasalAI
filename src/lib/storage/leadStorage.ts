import {
  Lead,
  CreateLeadDTO,
  UpdateLeadDTO,
  ChatMessage,
  CallUpdate,
  LeadAiAnalysis,
  AnalysisStatus,
} from '@/types/lead';

/**
 * Storage interface contract for Lead persistence.
 * Any future database (PostgreSQL, Supabase, MongoDB, Prisma) will implement this exact interface.
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
  setAnalysisStatus(leadId: string, status: AnalysisStatus, error?: string): Promise<Lead>;
  setFollowUpDate(leadId: string, date?: string): Promise<Lead>;
}

const STORAGE_KEY = 'masalai_leads_v3';

/**
 * Generate a unique ID cross-platform
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `lead_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Seed data for Real Estate Leads
 */
const INITIAL_DEMO_LEADS: Lead[] = [
  {
    id: 'demo-lead-1',
    name: 'Rohan Malhotra',
    location: 'Bandra West, Mumbai',
    propertyRequirement: '3 BHK Sea-View Luxury Apartment',
    budget: '₹8.5 Cr ($1M)',
    timeline: 'Immediate (< 1 month)',
    customerMessage:
      'Looking for a high-floor 3BHK with sea facing balcony and at least 2 dedicated car parking slots. Ready to make a down payment immediately if inventory matches.',
    email: 'rohan.malhotra@zenithcap.com',
    phone: '+91 98201 54321',
    status: 'QUALIFIED',
    priority: 'HIGH',
    analysisStatus: 'completed',
    followUpDate: '2026-10-02',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    aiAnalysis: {
      score: 94,
      urgent: true,
      qualification: 'HOT',
      intent: 'Immediate Luxury End-User Buyer',
      summary:
        'Immediate buyer with verified high budget capability for Bandra West sea-facing inventory. Extremely high closing probability within 30 days.',
      scoreReasoning:
        'Score 94 assigned due to verified liquid budget (₹8.5 Cr), urgent timeline (<1 month), and specific luxury sea-facing requirements.',
      qualificationReasoning:
        'Classified as HOT lead by application rubric (Score 94 >= 80 with active urgency flag). Requires immediate 15-minute outreach SLA.',
      keyRequirements: [
        'High-floor 3 BHK luxury apartment',
        'Direct sea-facing balcony orientation (Carter Rd / Pali Hill)',
        'Minimum 2 dedicated covered car parking bays',
        'Ready-to-move OC-compliant inventory',
      ],
      objections: [
        'Non-negotiable parking constraint (must accommodate two large SUVs)',
        'Will walk away if ocean view is obstructed or floor level is below 10th',
      ],
      nextAction:
        'Call Rohan immediately to present 2 off-market Carter Road OC-ready units and schedule a private Thursday site visit.',
      suggestedResponse:
        'Hi Rohan, thank you for reaching out to MasalAI Realty. We have two off-market, high-floor 3BHK residences directly on Carter Road, Bandra West featuring unobstructed Arabian Sea balconies and two dedicated stilt parking bays. Both properties have full Occupancy Certificates (OC). Would you be available this Thursday afternoon for a private preview tour?',
      painPoints: [
        'Strict requirement for minimum 2 car parks',
        'Specific floor preference (high-floor sea-facing view)',
      ],
      opportunities: [
        'Immediate liquidity & down payment readiness',
        'Direct decision-maker with clear luxury requirements',
      ],
      recommendedPitch:
        'Present exclusive off-market Bandra West penthouse/high-rise units with panoramic Arabian Sea views and private parking bays.',
      suggestedQuestions: [
        'Are you available this Wednesday for a private site viewing?',
        'Do you require an interior turnkey fit-out or bare-shell condition?',
      ],
      analyzedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      modelUsed: 'gemini-2.5-flash',
    },
    chatHistory: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hi, are there any OC-ready units available in Pali Hill or Carter Road?',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Yes Rohan, we have 2 ready-to-move OC-compliant units on Carter Road with direct sea frontage.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 45000).toISOString(),
      },
    ],
    callUpdates: [
      {
        id: 'call-1',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 18,
        summary: 'Discovery call. Confirmed budget approved by family office and ready for site visit.',
        sentiment: 'POSITIVE',
        outcome: 'Scheduled viewing for Carter Road residence on Thursday.',
        nextAction: 'Send floor plans and developer brochure.',
        loggedBy: 'Broker Hrishita',
      },
    ],
  },
  {
    id: 'demo-lead-2',
    name: 'Ananya Deshmukh',
    location: 'Whitefield, Bengaluru',
    propertyRequirement: '4 BHK Gated Community Villa',
    budget: '₹4.2 Cr',
    timeline: '1 - 3 months',
    customerMessage:
      'Relocating from London to Bengaluru with family. Need a quiet gated community close to international schools with private garden and clubhouse.',
    email: 'ananya.d@fintechuk.co.uk',
    phone: '+44 7700 900123',
    status: 'NEW',
    priority: 'MEDIUM',
    analysisStatus: 'completed',
    followUpDate: '2026-10-06',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    aiAnalysis: {
      score: 78,
      urgent: false,
      qualification: 'WARM',
      intent: 'NRI Family Relocation Buyer',
      summary:
        'NRI relocation lead with substantial budget (₹4.2 Cr) for prime Bengaluru gated villa projects. 1-3 month closing horizon centered around international school terms.',
      scoreReasoning:
        'Score 78 assigned: realistic budget for Whitefield villas and clear family relocation intent, but 1-3 month timeline allows structured nurturing.',
      qualificationReasoning:
        'Classified as WARM lead by application rubric (Score 78 in 50-79 range, non-immediate timeline). Assigned to senior NRI advisory specialist.',
      keyRequirements: [
        '4 BHK villa inside a secure gated community',
        'Private garden and comprehensive clubhouse facilities',
        'Close proximity (<15 mins) to top international schools in Whitefield',
      ],
      objections: [
        'Remote decision making constraint while still living in London',
        'High sensitivity to school traffic and commute times',
      ],
      nextAction:
        'Email curated 3D virtual walkthroughs of 2 Whitefield villa projects and offer a WhatsApp video consultation.',
      suggestedResponse:
        'Dear Ananya, welcome back to India! We understand how critical school proximity and community safety are when relocating with family. In Whitefield, we represent two exclusive gated communities with private gardens and clubhouses within a 12-minute radius of Greenwood High and The International School Bangalore (TISB). Would a brief WhatsApp video walkthrough this Saturday suit your London schedule?',
      painPoints: [
        'Proximity to reputed international schools is a non-negotiable constraint',
        'Managing remote selection before relocation',
      ],
      opportunities: [
        'Premium villa segment in high demand',
        'Clear timeline aligned with international move',
      ],
      recommendedPitch:
        'Highlight gated luxury developments in Whitefield with concierge amenities, clubhouse, and 10-minute commute to Greenwood High / TISB.',
      suggestedQuestions: [
        'Which international school curriculum is preferred for your children?',
        'Would a virtual 3D tour work for an initial walkthrough this weekend?',
      ],
      analyzedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      modelUsed: 'gemini-2.5-flash',
    },
    chatHistory: [],
    callUpdates: [],
  },
];

/**
 * Browser LocalStorage implementation of LeadStorageAdapter.
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
      location: dto.location.trim(),
      propertyRequirement: dto.propertyRequirement.trim(),
      budget: dto.budget.trim(),
      timeline: dto.timeline,
      customerMessage: (dto.customerMessage || '').trim(),
      email: dto.email?.trim(),
      phone: dto.phone?.trim(),
      status: 'NEW',
      priority: dto.priority || 'MEDIUM',
      analysisStatus: 'idle',
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
      analysisStatus: 'completed',
      analysisError: undefined,
      status: 'QUALIFIED',
    });
  }

  async setAnalysisStatus(
    leadId: string,
    status: AnalysisStatus,
    error?: string
  ): Promise<Lead> {
    return this.update(leadId, {
      analysisStatus: status,
      analysisError: error,
    });
  }

  async setFollowUpDate(leadId: string, date?: string): Promise<Lead> {
    return this.update(leadId, {
      followUpDate: date,
    });
  }
}

export const leadStorage: LeadStorageAdapter = new LocalStorageLeadAdapter();
