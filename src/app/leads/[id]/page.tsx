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
  ChevronDown,
  ChevronUp,
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
  const [showRawIntake, setShowRawIntake] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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
    if (!text) return;
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
          content: `Logged for ${lead.name}: "${userText}"`,
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
        return 'bg-red-500 text-white shadow-xs';
      case 'WARM':
        return 'bg-amber-500 text-white shadow-xs';
      case 'COLD':
        return 'bg-blue-500 text-white shadow-xs';
      default:
        return 'bg-zinc-500 text-white';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 80) return 'bg-gradient-to-r from-emerald-500 to-teal-400';
    if (score >= 50) return 'bg-gradient-to-r from-amber-500 to-yellow-400';
    return 'bg-gradient-to-r from-rose-500 to-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-600" />
        Loading lead dossier...
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
          Back to Pipeline
        </Link>
      </div>
    );
  }

  const isFailed = lead.analysisStatus === 'failed' || Boolean(lead.analysisError);
  const score = lead.aiAnalysis?.score ?? 0;
  const isUrgent = Boolean(lead.aiAnalysis?.urgent);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Top Breadcrumb Navigation */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Pipeline</span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRetryAnalysis}
              disabled={isRetrying}
              className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Re-analyzing...' : 'Re-Run AI Analysis'}</span>
            </button>
            <Link
              href="/"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              + New Intake
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full p-4 md:p-6 space-y-6 flex-1">
        {/* Analysis Failure Alert with Retry Button (if failed) */}
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
                    'The AI analyst could not complete the evaluation. Your lead details are preserved.'}
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

        {/* ========================================================================= */}
        {/* TOP SECTION: Name, Priority Badge, Score Bar, and One-Line Score Reason    */}
        {/* ========================================================================= */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
          {/* Header Row: Name, Priority Badge, Urgent Beacon, and Location/Budget */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                  {lead.name}
                </h1>

                {/* Priority Badge */}
                {lead.aiAnalysis?.qualification ? (
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${getBadgeColor(
                      lead.aiAnalysis.qualification
                    )}`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    {lead.aiAnalysis.qualification} LEAD
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {lead.status}
                  </span>
                )}

                {/* Urgent Flag */}
                {isUrgent && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 animate-pulse shadow-xs">
                    <Zap className="w-3.5 h-3.5" />
                    URGENT
                  </span>
                )}
              </div>

              {/* Lead metadata pills */}
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center gap-1 font-semibold text-zinc-800 dark:text-zinc-200">
                  <HomeIcon className="w-3.5 h-3.5 text-violet-500" />
                  {lead.propertyRequirement}
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  {lead.location}
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-3.5 h-3.5" />
                  {lead.budget}
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  {lead.timeline}
                </span>
              </div>
            </div>

            {/* Score Big Display */}
            <div className="text-right shrink-0">
              <div className="flex items-baseline justify-end gap-1">
                <span className={`text-4xl font-black ${getScoreColor(score)}`}>
                  {lead.aiAnalysis?.score ?? '--'}
                </span>
                <span className="text-xs font-bold text-zinc-400">/ 100</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Rubric Score
              </span>
            </div>
          </div>

          {/* Score Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-200/60 dark:border-zinc-700/60">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${getProgressBarColor(
                  score
                )}`}
                style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
              />
            </div>
          </div>

          {/* The One-Line Reason for the Score */}
          {lead.aiAnalysis?.scoreReasoning ? (
            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200/70 dark:border-zinc-800/80 flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-zinc-900 dark:text-zinc-100 font-semibold mr-1.5">
                  Score Reasoning:
                </strong>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {lead.aiAnalysis.scoreReasoning}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200/70 dark:border-zinc-800/80 text-xs text-zinc-500">
              Score reasoning will generate automatically upon AI qualification.
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* TWO-COLUMN GRID: LEFT (Summary, Intent, Requirements, Objections)           */}
        {/*                  RIGHT (Highlighted Next-Action Card & Suggested Response) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ======================================================================= */}
          {/* LEFT COLUMN: Summary, Intent, Requirements, and Objections (Chips/Bullets) */}
          {/* ======================================================================= */}
          <section className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Lead Intelligence & Qualifications
                </h2>
                {lead.aiAnalysis?.analyzedAt && (
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {new Date(lead.aiAnalysis.analyzedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>

              {/* 1. Buyer Intent (Chip) */}
              {lead.aiAnalysis?.intent && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1.5">
                    Buyer Intent Category
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold">
                    <Compass className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{lead.aiAnalysis.intent}</span>
                  </div>
                </div>
              )}

              {/* 2. Summary (Short, punchy) */}
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                  Executive Briefing
                </span>
                <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed bg-zinc-50 dark:bg-zinc-950/60 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
                  {lead.aiAnalysis?.summary || lead.customerMessage}
                </p>
              </div>

              {/* 3. Key Requirements (Visual Chips or Short Bullets) */}
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-2">
                  Key Requirements (Deduced Specs)
                </span>
                <div className="flex flex-wrap gap-2">
                  {(lead.aiAnalysis?.keyRequirements || [lead.propertyRequirement]).map(
                    (req, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 text-xs font-semibold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{req}</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* 4. Objections & Constraints (Visual Alert Chips) */}
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-2">
                  Anticipated Objections & Constraints
                </span>
                <div className="flex flex-wrap gap-2">
                  {(lead.aiAnalysis?.objections || []).length > 0 ? (
                    lead.aiAnalysis!.objections.map((obj, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/70 text-xs font-semibold"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{obj}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-400 italic">
                      No critical constraints or friction points detected.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Collapsible: Raw Customer Intake Message */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs">
              <button
                onClick={() => setShowRawIntake(!showRawIntake)}
                className="w-full flex items-center justify-between text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                  View Original Submitted Intake Message
                </span>
                {showRawIntake ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showRawIntake && (
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed italic bg-zinc-50 dark:bg-zinc-950/50 p-3 rounded-2xl">
                  &quot;{lead.customerMessage}&quot;
                </div>
              )}
            </div>
          </section>

          {/* ======================================================================= */}
          {/* RIGHT COLUMN: Highlighted Next-Action Card & Suggested Response (Copy)   */}
          {/* ======================================================================= */}
          <section className="lg:col-span-5 space-y-6">
            {/* 1. Highlighted Next-Action Card */}
            <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white rounded-3xl p-6 shadow-lg shadow-indigo-500/20 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-2 mb-3">
                <span className="h-7 w-7 rounded-xl bg-white/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-amber-300" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-100">
                  Recommended Next Action
                </span>
              </div>

              <h3 className="text-sm font-bold leading-snug tracking-tight text-white mb-2">
                {lead.aiAnalysis?.nextAction ||
                  'Schedule an introductory discovery call to clarify property requirements and budget fit.'}
              </h3>

              <div className="text-[11px] text-indigo-100/80 pt-2 border-t border-white/15 flex items-center justify-between">
                <span>Immediate Priority SLA</span>
                <span className="font-semibold text-white">
                  {isUrgent ? '< 15 mins outreach' : '< 24 hours'}
                </span>
              </div>
            </div>

            {/* 2. Suggested Response with 1-Click Copy Button */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  Suggested Client Response
                </span>

                <button
                  onClick={() => handleCopyResponse(lead.aiAnalysis?.suggestedResponse || '')}
                  disabled={!lead.aiAnalysis?.suggestedResponse}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  {copiedResponse ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Response</span>
                    </>
                  )}
                </button>
              </div>

              {/* Message Preview Box */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200/80 dark:border-zinc-800/80 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                {lead.aiAnalysis?.suggestedResponse ||
                  `Hi ${lead.name}, thank you for reaching out regarding ${lead.propertyRequirement} in ${lead.location}. When would be a convenient time for a brief consultation call?`}
              </div>

              <p className="text-[11px] text-zinc-400 text-center">
                Ready to paste into WhatsApp, SMS, or Email outreach.
              </p>
            </div>

            {/* Collapsible: Meeting Notes & Direct Messages */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-indigo-500" />
                  Log Call Update / View History ({lead.callUpdates.length + lead.chatHistory.length})
                </span>
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showHistory && (
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                  {/* Call Log Form */}
                  <form onSubmit={handleAddCallUpdate} className="space-y-2.5">
                    <input
                      type="text"
                      required
                      placeholder="Call summary (e.g. Discussed viewing date...)"
                      value={callSummary}
                      onChange={(e) => setCallSummary(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                    />
                    <div className="flex gap-2">
                      <select
                        value={callSentiment}
                        onChange={(e) => setCallSentiment(e.target.value as CallSentiment)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                      >
                        <option value="POSITIVE">Positive</option>
                        <option value="NEUTRAL">Neutral</option>
                        <option value="NEGATIVE">Hesitant</option>
                      </select>
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Save Note
                      </button>
                    </div>
                  </form>

                  {/* Call updates list */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {lead.callUpdates.map((call) => (
                      <div
                        key={call.id}
                        className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 text-xs"
                      >
                        <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                          <span>{new Date(call.date).toLocaleDateString()}</span>
                          <span className="font-bold text-zinc-600 dark:text-zinc-300">
                            {call.sentiment}
                          </span>
                        </div>
                        <p className="text-zinc-700 dark:text-zinc-300">{call.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
