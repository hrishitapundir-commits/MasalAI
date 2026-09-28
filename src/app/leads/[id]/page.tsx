'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lead,
  LeadQualification,
  CallSentiment,
} from '@/types/lead';
import { leadStorage } from '@/lib/storage';
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Home as HomeIcon,
  DollarSign,
  Calendar,
  MessageSquare,
  PhoneCall,
  Flame,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  RefreshCw,
  User,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Zap,
  Tag,
  Compass,
  FileText,
  Lightbulb,
} from 'lucide-react';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [copiedResponse, setCopiedResponse] = useState(false);

  // Active Tab: 'analysis' | 'calls' | 'chat'
  const [activeTab, setActiveTab] = useState<'analysis' | 'calls' | 'chat'>('analysis');

  // Call Update Form State
  const [callSummary, setCallSummary] = useState('');
  const [callOutcome, setCallOutcome] = useState('');
  const [callNextAction, setCallNextAction] = useState('');
  const [callSentiment, setCallSentiment] = useState<CallSentiment>('POSITIVE');
  const [callDuration, setCallDuration] = useState<number>(15);

  // Chat message input
  const [chatInput, setChatInput] = useState('');

  // Load Lead from Storage
  const loadLead = async () => {
    if (!id) return;
    const found = await leadStorage.getById(id);
    setLead(found);
    setLoading(false);
  };

  useEffect(() => {
    loadLead();
  }, [id]);

  // Handle Retry AI Analysis
  const handleRetryAnalysis = async () => {
    if (!lead) return;
    setIsRetrying(true);
    setRetryError(null);

    await leadStorage.setAnalysisStatus(lead.id, 'analyzing');
    await loadLead();

    try {
      const res = await fetch('/api/analyze-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.name,
          location: lead.location,
          propertyRequirement: lead.propertyRequirement,
          budget: lead.budget,
          timeline: lead.timeline,
          customerMessage: lead.customerMessage,
          email: lead.email,
          phone: lead.phone,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.analysis) {
        await leadStorage.setAiAnalysis(lead.id, data.analysis);
        await loadLead();
        setActiveTab('analysis');
      } else {
        const errorMsg = data.error || 'Failed to complete AI analysis.';
        setRetryError(errorMsg);
        await leadStorage.setAnalysisStatus(lead.id, 'failed', errorMsg);
        await loadLead();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error during analysis.';
      setRetryError(errorMsg);
      await leadStorage.setAnalysisStatus(lead.id, 'failed', errorMsg);
      await loadLead();
    } finally {
      setIsRetrying(false);
    }
  };

  // Copy suggested response to clipboard
  const handleCopyResponse = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  // Log a new Call Update
  const handleAddCallUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !callSummary.trim()) return;

    try {
      await leadStorage.addCallUpdate(lead.id, {
        summary: callSummary.trim(),
        outcome: callOutcome.trim() || 'Notes recorded.',
        nextAction: callNextAction.trim() || 'Schedule next touchpoint.',
        sentiment: callSentiment,
        durationMinutes: Number(callDuration) || 15,
        loggedBy: 'Real Estate Advisor',
      });

      setCallSummary('');
      setCallOutcome('');
      setCallNextAction('');
      await loadLead();
    } catch (err) {
      console.error('Failed to add call update:', err);
    }
  };

  // Send a Chat Message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !chatInput.trim()) return;

    const userText = chatInput.trim();
    setChatInput('');

    try {
      await leadStorage.addChatMessage(lead.id, {
        role: 'user',
        content: userText,
      });

      setTimeout(async () => {
        await leadStorage.addChatMessage(lead.id, {
          role: 'assistant',
          content: `Logged for ${lead.name} regarding "${lead.propertyRequirement}": ${userText}`,
        });
        await loadLead();
      }, 500);

      await loadLead();
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
  };

  const getBadgeColor = (qual?: LeadQualification) => {
    switch (qual) {
      case 'HOT':
        return 'bg-red-500 text-white shadow-sm shadow-red-500/20';
      case 'WARM':
        return 'bg-amber-500 text-white shadow-sm shadow-amber-500/20';
      case 'COLD':
        return 'bg-blue-500 text-white shadow-sm shadow-blue-500/20';
      default:
        return 'bg-zinc-500 text-white';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80)
      return 'text-emerald-500 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800';
    if (score >= 50)
      return 'text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800';
    return 'text-rose-500 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-600" />
        Loading lead details...
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8 flex flex-col items-center justify-center text-center">
        <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-2">Lead Not Found</h2>
        <p className="text-xs text-zinc-500 mb-4">The requested lead could not be found in storage.</p>
        <Link
          href="/"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Intake & Pipeline
        </Link>
      </div>
    );
  }

  const isFailed = lead.analysisStatus === 'failed' || Boolean(lead.analysisError);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition"
              title="Back to Leads"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base tracking-tight">{lead.name}</h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                  {lead.status}
                </span>
                {lead.aiAnalysis?.qualification && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${getBadgeColor(
                      lead.aiAnalysis.qualification
                    )}`}
                  >
                    <Flame className="w-3 h-3" />
                    {lead.aiAnalysis.qualification} LEAD
                  </span>
                )}
                {lead.aiAnalysis?.urgent && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 animate-pulse">
                    <Zap className="w-3 h-3" />
                    URGENT
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {lead.propertyRequirement} • {lead.location}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 hidden sm:inline">
              LocalStorage Module
            </span>
            <Link
              href="/"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              + New Intake
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full p-4 md:p-6 space-y-6 flex-1">
        {/* Analysis Failure Alert with Friendly Error and Retry Button */}
        {isFailed && (
          <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  AI Qualification Analysis Incomplete
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  {lead.analysisError ||
                    retryError ||
                    'The AI sales analyst could not complete the schema evaluation. Your submitted lead details are safely preserved in storage.'}
                </p>
              </div>
            </div>

            <button
              onClick={handleRetryAnalysis}
              disabled={isRetrying}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-md shadow-amber-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying Gemini...' : 'Retry AI Analysis'}
            </button>
          </div>
        )}

        {/* Lead Intake Overview Card (The 6 Intake Fields) */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Submitted Lead Intake Details
            </h2>
            <span className="text-[11px] text-zinc-400">
              Created {new Date(lead.createdAt).toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Field 1: Name */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80">
              <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5 mb-1">
                <User className="w-3 h-3 text-indigo-500" />
                1. Customer Name
              </span>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{lead.name}</p>
            </div>

            {/* Field 2: Location */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80">
              <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5 mb-1">
                <MapPin className="w-3 h-3 text-rose-500" />
                2. Target Location
              </span>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{lead.location}</p>
            </div>

            {/* Field 3: Property Requirement */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80">
              <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5 mb-1">
                <HomeIcon className="w-3 h-3 text-violet-500" />
                3. Property Requirement
              </span>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {lead.propertyRequirement}
              </p>
            </div>

            {/* Field 4: Budget */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80">
              <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3 h-3 text-emerald-500" />
                4. Budget
              </span>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {lead.budget}
              </p>
            </div>

            {/* Field 5: Timeline */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80">
              <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5 mb-1">
                <Calendar className="w-3 h-3 text-blue-500" />
                5. Timeline (Urgency)
              </span>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {lead.timeline}
              </p>
            </div>

            {/* Outreach Info or Follow-up */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80">
              <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5 mb-1">
                <Clock className="w-3 h-3 text-amber-500" />
                Follow-up Target
              </span>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {lead.followUpDate || 'Not scheduled'}
              </p>
            </div>
          </div>

          {/* Field 6: Customer Message */}
          <div className="mt-4 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80">
            <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5 mb-1">
              <MessageSquare className="w-3 h-3 text-indigo-500" />
              6. Customer Message & Requirements
            </span>
            <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed italic">
              &quot;{lead.customerMessage}&quot;
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'analysis'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Qualification & Assessment
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'calls'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            Call Updates ({lead.callUpdates.length})
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Direct Messages ({lead.chatHistory.length})
          </button>
        </div>

        {/* Tab 1: AI Qualification Insights (Phase 3 Core Spec) */}
        {activeTab === 'analysis' && (
          <div>
            {lead.aiAnalysis ? (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-6">
                {/* 1. Header: Score, Urgent Flag, Deterministic Hot/Warm/Cold, & Summary */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Sales Analyst Assessment
                      </span>
                      {/* Intent Badge */}
                      {lead.aiAnalysis.intent && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                          <Compass className="w-3 h-3 text-indigo-500" />
                          {lead.aiAnalysis.intent}
                        </span>
                      )}
                      {/* Deterministic Qualification Badge */}
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${getBadgeColor(
                          lead.aiAnalysis.qualification
                        )}`}
                      >
                        <Flame className="w-3 h-3" />
                        {lead.aiAnalysis.qualification} LEAD
                      </span>
                      {/* Urgent Flag */}
                      {lead.aiAnalysis.urgent && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 animate-pulse shadow-xs">
                          <Zap className="w-3 h-3" />
                          URGENT PRIORITY
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      {lead.aiAnalysis.summary}
                    </p>

                    {/* Deterministic Rubric Reason */}
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Deterministic Code Rubric:
                      </span>{' '}
                      {lead.aiAnalysis.qualificationReasoning ||
                        'Categorized using business rules based on model score and urgency flag.'}
                    </div>
                  </div>

                  {/* Score Box & Model Reasoning */}
                  <div className="flex lg:flex-col items-center gap-3 shrink-0">
                    <div
                      className={`p-4 rounded-2xl border text-center min-w-[120px] ${getScoreColor(
                        lead.aiAnalysis.score
                      )}`}
                    >
                      <span className="block text-3xl font-black">
                        {lead.aiAnalysis.score}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider block mt-0.5">
                        Rubric Score
                      </span>
                    </div>

                    <button
                      onClick={handleRetryAnalysis}
                      disabled={isRetrying}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-semibold flex items-center gap-1.5 transition"
                      title="Re-run analysis"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                      Re-Analyze
                    </button>
                  </div>
                </div>

                {/* One-Line Score Reasoning Banner */}
                {lead.aiAnalysis.scoreReasoning && (
                  <div className="p-3 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 flex items-start gap-2.5">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Score Reasoning:
                      </span>
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">
                        {lead.aiAnalysis.scoreReasoning}
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Key Requirements & Objections (Two Column Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Key Requirements */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Key Property Requirements Deduced
                    </h4>
                    <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                      {(lead.aiAnalysis.keyRequirements || []).map((req, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Potential Objections & Constraints */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      Potential Objections & Constraints
                    </h4>
                    <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                      {(lead.aiAnalysis.objections || []).length === 0 ? (
                        <li className="text-zinc-400 italic">No major friction points detected.</li>
                      ) : (
                        (lead.aiAnalysis.objections || []).map((obj, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-rose-500 font-bold">•</span>
                            <span>{obj}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                </div>

                {/* 3. Recommended Next Action */}
                <div className="p-4 rounded-xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-violet-800 dark:text-violet-300 mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    Immediate Next Action for Sales Representative
                  </h4>
                  <p className="text-xs text-violet-950 dark:text-violet-200 font-medium">
                    {lead.aiAnalysis.nextAction}
                  </p>
                </div>

                {/* 4. Suggested Ready-to-Send Response (WhatsApp / Email) */}
                <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Tailored Suggested Response Draft
                    </h4>
                    <button
                      onClick={() => handleCopyResponse(lead.aiAnalysis?.suggestedResponse || '')}
                      className="px-3 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-zinc-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {copiedResponse ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Message</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-900 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                    {lead.aiAnalysis.suggestedResponse}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
                <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-sm">Analysis Pending or Failed</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                  The lead intake was saved in your storage. You can retry the Gemini AI qualification at any time.
                </p>
                <button
                  onClick={handleRetryAnalysis}
                  disabled={isRetrying}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Analyzing...' : 'Run Gemini Analysis'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Call Updates */}
        {activeTab === 'calls' && (
          <div className="space-y-5">
            {/* Log Call Form */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-indigo-500" />
                Log Site Visit / Consultation Call
              </h3>
              <form onSubmit={handleAddCallUpdate} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      value={callDuration}
                      onChange={(e) => setCallDuration(Number(e.target.value))}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">Client Sentiment</label>
                    <select
                      value={callSentiment}
                      onChange={(e) => setCallSentiment(e.target.value as CallSentiment)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                    >
                      <option value="POSITIVE">Positive / Interested</option>
                      <option value="NEUTRAL">Neutral / Comparing</option>
                      <option value="NEGATIVE">Hesitant / Budget Stretch</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Discussion Summary *</label>
                  <input
                    type="text"
                    required
                    placeholder="Discussed unit specifications, view orientation, and payment schedule..."
                    value={callSummary}
                    onChange={(e) => setCallSummary(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">Outcome</label>
                    <input
                      type="text"
                      placeholder="Interested in physical site visit"
                      value={callOutcome}
                      onChange={(e) => setCallOutcome(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">Next Action</label>
                    <input
                      type="text"
                      placeholder="Send cost sheet and floor plans"
                      value={callNextAction}
                      onChange={(e) => setCallNextAction(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  Save Call Log
                </button>
              </form>
            </div>

            {/* Call Updates List */}
            <div className="space-y-3">
              {lead.callUpdates.length === 0 ? (
                <p className="text-xs text-zinc-500 italic p-4 text-center">
                  No call logs recorded yet.
                </p>
              ) : (
                lead.callUpdates.map((call) => (
                  <div
                    key={call.id}
                    className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {new Date(call.date).toLocaleString()}
                      </span>
                      <div className="flex items-center gap-2">
                        {call.durationMinutes && (
                          <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                            {call.durationMinutes} mins
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            call.sentiment === 'POSITIVE'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : call.sentiment === 'NEGATIVE'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                              : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}
                        >
                          {call.sentiment}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-800 dark:text-zinc-200 mt-2">{call.summary}</p>

                    <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap gap-4 text-[11px] text-zinc-500">
                      {call.outcome && (
                        <span>
                          <strong className="text-zinc-700 dark:text-zinc-300">Outcome:</strong>{' '}
                          {call.outcome}
                        </span>
                      )}
                      {call.nextAction && (
                        <span>
                          <strong className="text-zinc-700 dark:text-zinc-300">Next Step:</strong>{' '}
                          {call.nextAction}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Direct Messages */}
        {activeTab === 'chat' && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs flex flex-col h-[480px]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
              Lead Communication Timeline
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 p-2">
              {lead.chatHistory.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center mt-12">
                  No conversation logs recorded yet. Send a message below.
                </p>
              ) : (
                lead.chatHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-xs'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[9px] text-zinc-400 mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleSendChat}
              className="mt-3 flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800"
            >
              <input
                type="text"
                placeholder="Log note or client message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
