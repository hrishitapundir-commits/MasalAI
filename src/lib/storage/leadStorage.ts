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
  updateSuggestedResponse(leadId: string, newResponse: string): Promise<Lead>;
  recordPostCallUpdate(
    leadId: string,
    params: {
      updatedAnalysis: LeadAiAnalysis;
      callUpdate: Omit<CallUpdate, 'id' | 'date'>;
      previousScore: number;
      newScore: number;
      scoreDeltaExplanation: string;
      suggestedFollowUpDate?: string;
    }
  ): Promise<Lead>;
  loadSampleLeads(): Promise<Lead[]>;
  clearAll(): Promise<void>;
}

const STORAGE_KEY = 'masalai_leads_v5';

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
 * Realistic 5-Lead Sample Dataset (Covers Hot, Warm, and Cold spectrum)
 */
export const SAMPLE_REAL_ESTATE_LEADS: Lead[] = [
  // 1. HOT + URGENT Lead
  {
    id: 'sample-lead-1',
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
    previousScore: 75,
    scoreDeltaExplanation:
      'Confirmed liquid funds & requested Thursday preview; score jumped from 75 to 94 (+19 pts).',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    aiAnalysis: {
      score: 94,
      urgent: true,
      qualification: 'HOT',
      intent: 'Immediate Luxury End-User Buyer',
      summary:
        'Immediate cash buyer with verified liquidity for Bandra West sea-facing inventory. Extremely high closing probability within 30 days.',
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
      analyzedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      modelUsed: 'gemini-2.5-flash',
    },
    chatHistory: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hi, are there any OC-ready units available in Pali Hill or Carter Road?',
        timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Yes Rohan, we have 2 ready-to-move OC-compliant units on Carter Road with direct sea frontage.',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
    ],
    callUpdates: [
      {
        id: 'call-1',
        date: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        durationMinutes: 18,
        summary: 'Discovery call. Confirmed budget approved by family office and ready for site visit.',
        sentiment: 'POSITIVE',
        outcome: 'Scheduled viewing for Carter Road residence on Thursday.',
        nextAction: 'Send floor plans and developer brochure.',
        loggedBy: 'Broker Hrishita',
        previousScore: 75,
        newScore: 94,
        scoreDeltaExplanation:
          'Confirmed ₹8.5 Cr liquid funds and booked Thursday site tour; score increased by +19 pts.',
        suggestedFollowUpDate: '2026-10-02',
        rawNotesOrTranscript:
          'Spoke with Rohan for 18 minutes. He confirmed family office budget is fully approved with liquid funds ready. He reviewed the Carter Road listing and requested an exclusive site visit this Thursday at 3 PM. Emphasized need for 2 covered parking bays.',
      },
    ],
  },

  // 2. HOT + URGENT Lead
  {
    id: 'sample-lead-2',
    name: 'Meera & Siddharth Oberoi',
    location: 'Golf Course Road, Gurgaon',
    propertyRequirement: '4 BHK Luxury Penthouse in Gated Society',
    budget: '₹12 Cr ($1.4M)',
    timeline: 'Immediate (< 1 month)',
    customerMessage:
      'Pre-approved private banking sanction ready. Looking for a high-rise penthouse with private terrace and panoramic clubhouse view. Handover needed before month end.',
    email: 'siddharth.oberoi@mckinsey.com',
    phone: '+91 99100 88776',
    status: 'QUALIFIED',
    priority: 'HIGH',
    analysisStatus: 'completed',
    followUpDate: '2026-10-01',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    aiAnalysis: {
      score: 91,
      urgent: true,
      qualification: 'HOT',
      intent: 'C-Suite Executive Penthouse Buyer',
      summary:
        'C-suite executive couple with pre-approved ₹12 Cr banking sanction for Golf Course Road penthouse. Immediate move-in required this month.',
      scoreReasoning:
        'Score 91 assigned: exceptional purchasing capacity, pre-approved loan status, and strict 30-day handover deadline.',
      qualificationReasoning:
        'Classified as HOT lead by application rubric (Score 91 >= 80 with active urgency flag). High transaction probability.',
      keyRequirements: [
        '4 BHK Penthouse layout with private terrace',
        'Gated Grade-A condominium on Golf Course Road (Camellias/Magnolias tier)',
        'Full occupancy certificate & immediate registry readiness',
      ],
      objections: [
        'Tight month-end possession deadline',
        'High standard of concierge and security protocols',
      ],
      nextAction:
        'Arrange VIP access for DLF Golf Course Road penthouse walkthrough tomorrow at 11 AM.',
      suggestedResponse:
        'Dear Siddharth and Meera, congratulations on your upcoming transition. We have private viewing clearance for an extraordinary 4BHK duplex penthouse on Golf Course Road with a 1,200 sq ft private terrace and instant registration readiness. Could we schedule your private viewing tomorrow at 11:00 AM?',
      painPoints: ['Tight move-in timeline', 'Zero tolerance for construction delays'],
      opportunities: ['Pre-approved finance in place', 'High-margin luxury asset tier'],
      recommendedPitch:
        'Highlight immediate handover status, golf view terraces, and private elevator access.',
      suggestedQuestions: [
        'Has your lender finalized legal clearance on the DLF condominium cluster?',
      ],
      analyzedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      modelUsed: 'gemini-2.5-flash',
    },
    chatHistory: [],
    callUpdates: [],
  },

  // 3. WARM Lead (Structured Timeline)
  {
    id: 'sample-lead-3',
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
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    aiAnalysis: {
      score: 78,
      urgent: false,
      qualification: 'WARM',
      intent: 'NRI Family Relocation Buyer',
      summary:
        'NRI relocation lead with realistic ₹4.2 Cr budget for prime Bengaluru gated villas. 1-3 month closing horizon centered around international school enrollment.',
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
      analyzedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
      modelUsed: 'gemini-2.5-flash',
    },
    chatHistory: [],
    callUpdates: [],
  },

  // 4. WARM Lead (Commercial / Investment)
  {
    id: 'sample-lead-4',
    name: 'Karan Varma',
    location: 'Koregaon Park, Pune',
    propertyRequirement: 'Commercial Retail / Boutique Office Space',
    budget: '₹3.5 Cr',
    timeline: '3 - 6 months',
    customerMessage:
      'Evaluating grade-A commercial showroom or boutique office floor for long-term rental yield. Flexible on delivery date before Q4 if tenant covenant is blue-chip.',
    email: 'karan@varmaholdings.in',
    phone: '+91 97654 32109',
    status: 'NEW',
    priority: 'MEDIUM',
    analysisStatus: 'completed',
    followUpDate: '2026-10-15',
    previousScore: 72,
    scoreDeltaExplanation:
      'Due diligence requirements and 3-6 month window moderate immediate urgency (-8 pts).',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    aiAnalysis: {
      score: 64,
      urgent: false,
      qualification: 'WARM',
      intent: 'Commercial Yield Investor',
      summary:
        'Commercial investor evaluating pre-leased or high-street retail spaces in Koregaon Park seeking 7-8% net rental yields. 3-6 month investment window.',
      scoreReasoning:
        'Score 64 assigned: solid budget and financial sophistication, but relaxed timeline (3-6 months) and conditional on tenant yields.',
      qualificationReasoning:
        'Classified as WARM lead (Score 64 in 50-79 range). Good pipeline prospect for institutional commercial portfolio.',
      keyRequirements: [
        'High-street retail or boutique office floor in Koregaon Park / Kalyani Nagar',
        'Target net capitalization yield of 7.5%+',
        'Grade-A building with high frontage and valet parking',
      ],
      objections: [
        'Yield-driven: will reject properties with high maintenance or low ROI',
        'Extended due diligence and tenant covenant vetting required',
      ],
      nextAction:
        'Send commercial ROI comparison deck highlighting 2 pre-leased banking branch assets in Koregaon Park.',
      suggestedResponse:
        'Hi Karan, thank you for reaching out. We specialize in high-yield commercial assets in Pune. Currently, we have two Grade-A Koregaon Park retail assets with blue-chip 9-year corporate leases generating 8.1% gross yield. I would be pleased to share the rent roll and tenant covenant dossier for your review.',
      painPoints: ['Risk of vacancy', 'Strict yield thresholds'],
      opportunities: ['Repeat commercial investor with balance sheet capacity'],
      recommendedPitch:
        'Focus on weighted average lease expiry (WALE) and lock-in covenants.',
      suggestedQuestions: [
        'What is your minimum acceptable internal rate of return (IRR)?',
      ],
      analyzedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      modelUsed: 'gemini-2.5-flash',
    },
    chatHistory: [],
    callUpdates: [
      {
        id: 'call-karan-1',
        date: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        durationMinutes: 22,
        summary:
          'Reviewed banking branch retail space. Client requires detailed rent roll and audit before commitment.',
        sentiment: 'NEUTRAL',
        outcome: 'Requested lease agreement copy and internal IRR model.',
        nextAction: 'Send commercial lease docket and schedule follow-up call.',
        loggedBy: 'Commercial Lead Specialist',
        previousScore: 72,
        newScore: 64,
        scoreDeltaExplanation:
          'Due diligence requirements and 3-6 month window moderate immediate urgency (-8 pts).',
        suggestedFollowUpDate: '2026-10-15',
        rawNotesOrTranscript:
          'Karan confirmed interest in Koregaon Park retail space but stated their investment committee requires 4-6 weeks for due diligence. He will not commit capital until tenant audit is completed.',
      },
    ],
  },

  // 5. COLD Lead (Budget Discrepancy & Exploratory)
  {
    id: 'sample-lead-5',
    name: 'Aditya Joshi',
    location: 'South Mumbai (Marine Drive / Malabar Hill)',
    propertyRequirement: '4 BHK Heritage Seafront Apartment',
    budget: '₹1.5 Cr',
    timeline: 'Just exploring / Flexible',
    customerMessage:
      'Just browsing to see what is available near Marine Drive for 1.5 Cr. No rush to buy, just curious about market rates.',
    email: 'aditya.j@gmail.com',
    status: 'NEW',
    priority: 'LOW',
    analysisStatus: 'completed',
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString(),
    aiAnalysis: {
      score: 28,
      urgent: false,
      qualification: 'COLD',
      intent: 'Casual Market Browser',
      summary:
        'Severe budget-to-location discrepancy (₹1.5 Cr vs typical ₹15-30 Cr for Marine Drive 4BHKs). Stated timeline is exploratory with no buying commitment.',
      scoreReasoning:
        'Score 28 assigned: budget is approximately 10x below South Mumbai baseline; vague timeline ("just exploring") and casual inquiry tone.',
      qualificationReasoning:
        'Classified as COLD lead by application rubric (Score 28 < 50 threshold). Recommend automated market newsletter rather than broker time.',
      keyRequirements: [
        'Marine Drive / South Mumbai area requested',
        'Budget capped at ₹1.5 Cr (unrealistic for target asset)',
      ],
      objections: [
        'Astronomical gap between stated budget and market floor pricing in South Mumbai',
        'Zero purchase urgency or confirmed financing',
      ],
      nextAction:
        'Enroll lead in automated quarterly Mumbai property price index newsletter; do not allocate direct broker calls.',
      suggestedResponse:
        'Hi Aditya, thank you for contacting MasalAI. Prime South Mumbai sea-facing 4BHK residences generally begin at ₹15-20 Cr upwards. However, for a ₹1.5 Cr budget, we would love to share our curated report on emerging suburban high-rises or add you to our monthly Mumbai market rate bulletin. Let us know if exploring suburban options would be of interest!',
      painPoints: ['Extreme budget misalignment', 'Lack of market awareness'],
      opportunities: ['May consider suburban projects in Thane or Navi Mumbai'],
      recommendedPitch:
        'Gently reset pricing expectations and pivot to suburban 2BHK alternatives.',
      suggestedQuestions: [
        'Would you consider high-growth suburban corridors where ₹1.5 Cr affords premium 2/3 BHK inventory?',
      ],
      analyzedAt: new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString(),
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
      return SAMPLE_REAL_ESTATE_LEADS;
    }
    try {
      const item = window.localStorage.getItem(STORAGE_KEY);
      if (!item) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_REAL_ESTATE_LEADS));
        return SAMPLE_REAL_ESTATE_LEADS;
      }
      return JSON.parse(item) as Lead[];
    } catch (err) {
      console.error('Failed to read leads from localStorage:', err);
      return SAMPLE_REAL_ESTATE_LEADS;
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
      previousScore: update.previousScore,
      newScore: update.newScore,
      scoreDeltaExplanation: update.scoreDeltaExplanation,
      suggestedFollowUpDate: update.suggestedFollowUpDate,
      rawNotesOrTranscript: update.rawNotesOrTranscript,
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

  async updateSuggestedResponse(leadId: string, newResponse: string): Promise<Lead> {
    const lead = await this.getById(leadId);
    if (!lead) throw new Error(`Lead with id "${leadId}" not found.`);
    if (!lead.aiAnalysis) {
      throw new Error(`Lead with id "${leadId}" does not have an AI analysis yet.`);
    }

    return this.update(leadId, {
      aiAnalysis: {
        ...lead.aiAnalysis,
        suggestedResponse: newResponse,
      },
    });
  }

  async recordPostCallUpdate(
    leadId: string,
    params: {
      updatedAnalysis: LeadAiAnalysis;
      callUpdate: Omit<CallUpdate, 'id' | 'date'>;
      previousScore: number;
      newScore: number;
      scoreDeltaExplanation: string;
      suggestedFollowUpDate?: string;
    }
  ): Promise<Lead> {
    const lead = await this.getById(leadId);
    if (!lead) throw new Error(`Lead with id "${leadId}" not found.`);

    const newCall: CallUpdate = {
      id: generateId(),
      date: new Date().toISOString(),
      durationMinutes: params.callUpdate.durationMinutes,
      summary: params.callUpdate.summary,
      sentiment: params.callUpdate.sentiment,
      outcome: params.callUpdate.outcome,
      nextAction: params.callUpdate.nextAction,
      loggedBy: params.callUpdate.loggedBy,
      previousScore: params.previousScore,
      newScore: params.newScore,
      scoreDeltaExplanation: params.scoreDeltaExplanation,
      suggestedFollowUpDate: params.suggestedFollowUpDate,
      rawNotesOrTranscript: params.callUpdate.rawNotesOrTranscript,
    };

    const updates: UpdateLeadDTO = {
      aiAnalysis: params.updatedAnalysis,
      previousScore: params.previousScore,
      scoreDeltaExplanation: params.scoreDeltaExplanation,
      followUpDate: params.suggestedFollowUpDate || lead.followUpDate,
      callUpdates: [newCall, ...lead.callUpdates],
    };

    return this.update(leadId, updates);
  }

  async loadSampleLeads(): Promise<Lead[]> {
    this.writeRaw(SAMPLE_REAL_ESTATE_LEADS);
    return SAMPLE_REAL_ESTATE_LEADS;
  }

  async clearAll(): Promise<void> {
    this.writeRaw([]);
  }
}

export const leadStorage: LeadStorageAdapter = new LocalStorageLeadAdapter();
