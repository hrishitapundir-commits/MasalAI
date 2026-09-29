'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Lead,
  LeadTimeline,
  TIMELINE_OPTIONS,
  LeadQualification,
} from '@/types/lead';
import { leadStorage } from '@/lib/storage';
import {
  Sparkles,
  User,
  MapPin,
  Home as HomeIcon,
  DollarSign,
  Calendar,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  Trash2,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  FileCheck,
  Zap,
  Filter,
  Layers,
  X,
  Compass,
  ArrowUpRight,
  SlidersHorizontal,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

const MESSAGE_MAX_LENGTH = 500;
type FilterTab = 'ALL' | 'HOT' | 'WARM' | 'COLD';
export type SortOption =
  | 'URGENT_SCORE'
  | 'FOLLOW_UP_DATE'
  | 'SCORE_DESC'
  | 'SCORE_ASC'
  | 'RECENT';

export default function DashboardPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('URGENT_SCORE');
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Intake Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    propertyRequirement: '',
    budget: '',
    timeline: 'Immediate (< 1 month)' as LeadTimeline,
    customerMessage: '',
    email: '',
    phone: '',
    followUpDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load leads from storage
  const loadLeads = async () => {
    const all = await leadStorage.getAll();
    setLeads(all);
  };

  useEffect(() => {
    loadLeads();

    // Check Gemini API status
    fetch('/api/analyze-lead')
      .then((res) => res.json())
      .then((data) => setGeminiConfigured(Boolean(data.geminiConfigured)))
      .catch(() => setGeminiConfigured(false));
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load 5 Sample Leads
  const handleLoadSamples = async () => {
    setIsLoadingSamples(true);
    try {
      const samples = await leadStorage.loadSampleLeads();
      setLeads(samples);
      showToast('Loaded 5 realistic sample leads (Hot, Warm, and Cold)');
    } catch (err) {
      console.error('Error loading sample leads:', err);
    } finally {
      setIsLoadingSamples(false);
    }
  };

  // Clear all leads for testing empty states
  const handleClearAll = async () => {
    if (confirm('Clear all leads to test the empty state? You can restore sample leads anytime.')) {
      await leadStorage.clearAll();
      setLeads([]);
      showToast('All leads cleared. Empty state active.');
    }
  };

  // Form Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Full Name is required.';
    if (!formData.location.trim()) newErrors.location = 'Target Location is required.';
    if (!formData.propertyRequirement.trim())
      newErrors.propertyRequirement = 'Property requirement is required (e.g. 3BHK, Villa).';
    if (!formData.budget.trim()) newErrors.budget = 'Budget is required (e.g. $750k, ₹2.5 Cr).';
    if (!formData.timeline) newErrors.timeline = 'Please select a timeline.';
    if (!formData.customerMessage.trim()) {
      newErrors.customerMessage = 'Customer message is required.';
    } else if (formData.customerMessage.length > MESSAGE_MAX_LENGTH) {
      newErrors.customerMessage = `Message exceeds limit of ${MESSAGE_MAX_LENGTH} characters.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmissionStep('Saving lead to LocalStorage...');

    try {
      const newLead = await leadStorage.create({
        name: formData.name,
        location: formData.location,
        propertyRequirement: formData.propertyRequirement,
        budget: formData.budget,
        timeline: formData.timeline,
        customerMessage: formData.customerMessage,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        followUpDate: formData.followUpDate || undefined,
      });

      setSubmissionStep('Sending to Gemini AI for qualification...');
      await leadStorage.setAnalysisStatus(newLead.id, 'analyzing');

      try {
        const res = await fetch('/api/analyze-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newLead.name,
            location: newLead.location,
            propertyRequirement: newLead.propertyRequirement,
            budget: newLead.budget,
            timeline: newLead.timeline,
            customerMessage: newLead.customerMessage,
            email: newLead.email,
            phone: newLead.phone,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.analysis) {
          await leadStorage.setAiAnalysis(newLead.id, data.analysis);
        } else {
          const errReason = data.error || 'Gemini qualification request failed.';
          await leadStorage.setAnalysisStatus(newLead.id, 'failed', errReason);
        }
      } catch (analysisErr) {
        const errReason =
          analysisErr instanceof Error ? analysisErr.message : 'Network failure during analysis.';
        await leadStorage.setAnalysisStatus(newLead.id, 'failed', errReason);
      }

      setSubmissionStep('Opening lead detail page...');
      setIsModalOpen(false);
      router.push(`/leads/${newLead.id}`);
    } catch (err) {
      console.error('Submission error:', err);
      alert('Error saving lead: ' + (err instanceof Error ? err.message : String(err)));
      setIsSubmitting(false);
    }
  };

  // Delete lead
  const handleDeleteLead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this lead from local storage?')) {
      await leadStorage.delete(id);
      loadLeads();
      showToast('Lead deleted from pipeline.');
    }
  };

  // Filter Counts
  const counts = {
    ALL: leads.length,
    HOT: leads.filter((l) => l.aiAnalysis?.qualification === 'HOT').length,
    WARM: leads.filter((l) => l.aiAnalysis?.qualification === 'WARM').length,
    COLD: leads.filter((l) => l.aiAnalysis?.qualification === 'COLD').length,
  };

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    if (activeTab === 'ALL') return true;
    return lead.aiAnalysis?.qualification === activeTab;
  });

  // SORTING ALGORITHM: Supports Urgent First (default), Follow-up Due, Score, and Recently Updated
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (sortBy === 'FOLLOW_UP_DATE') {
      // Leads with followUpDate first, ordered earliest to latest
      if (a.followUpDate && !b.followUpDate) return -1;
      if (!a.followUpDate && b.followUpDate) return 1;
      if (a.followUpDate && b.followUpDate) {
        const diff = a.followUpDate.localeCompare(b.followUpDate);
        if (diff !== 0) return diff;
      }
      return (b.aiAnalysis?.score ?? -1) - (a.aiAnalysis?.score ?? -1);
    }

    if (sortBy === 'SCORE_DESC') {
      const aScore = a.aiAnalysis?.score ?? -1;
      const bScore = b.aiAnalysis?.score ?? -1;
      if (bScore !== aScore) return bScore - aScore;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    if (sortBy === 'SCORE_ASC') {
      const aScore = a.aiAnalysis?.score ?? 101;
      const bScore = b.aiAnalysis?.score ?? 101;
      if (aScore !== bScore) return aScore - bScore;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    if (sortBy === 'RECENT') {
      return (
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
      );
    }

    // Default: 'URGENT_SCORE' (Urgent leads on top, then sorted by score descending, then by createdAt)
    const aUrgent = Boolean(a.aiAnalysis?.urgent);
    const bUrgent = Boolean(b.aiAnalysis?.urgent);

    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;

    const aScore = a.aiAnalysis?.score ?? -1;
    const bScore = b.aiAnalysis?.score ?? -1;
    if (bScore !== aScore) {
      return bScore - aScore;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getScoreColor = (score?: number) => {
    if (score === undefined) return 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700';
    if (score >= 80)
      return 'text-emerald-500 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800';
    if (score >= 50)
      return 'text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800';
    return 'text-rose-500 bg-rose-50 border-rose-200 dark:bg-rose-950/50 dark:border-rose-800';
  };

  const getBadgeColor = (qual?: LeadQualification) => {
    switch (qual) {
      case 'HOT':
        return 'bg-red-500 text-white';
      case 'WARM':
        return 'bg-amber-500 text-white';
      case 'COLD':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-zinc-500 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-zinc-700 dark:border-zinc-300 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {toastMessage}
        </div>
      )}

      {/* Top Navbar */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight">MasalAI</h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Lead Prioritization
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Sorted by AI score with urgent leads prioritized
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Gemini API Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900">
              <span
                className={`h-2 w-2 rounded-full ${
                  geminiConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-zinc-600 dark:text-zinc-300">
                {geminiConfigured ? 'Gemini 2.5 Active' : 'Gemini Config Ready'}
              </span>
            </div>

            {/* Load Sample Leads Button */}
            <button
              onClick={handleLoadSamples}
              disabled={isLoadingSamples}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer text-zinc-700 dark:text-zinc-300"
              title="Prepopulate 5 realistic leads (Hot, Warm, Cold)"
            >
              <Sparkles className={`w-3.5 h-3.5 text-indigo-500 ${isLoadingSamples ? 'animate-spin' : ''}`} />
              <span>Load Sample Leads</span>
            </button>

            {/* Clear All Leads (to test empty state) */}
            {leads.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 text-xs font-medium text-zinc-400 transition cursor-pointer"
                title="Clear all leads to test empty state"
              >
                Clear
              </button>
            )}

            {/* Add New Lead Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Add Lead</span>
            </button>

            <a
              href="https://github.com/hrishitapundir-commits/MasalAI"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition"
              title="View on GitHub"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6 flex-1">
        {/* Top Controls: Filter Tabs & Sorting Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          {/* Filter Tabs with Counts */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'HOT', 'WARM', 'COLD'] as FilterTab[]).map((tab) => {
              const count = counts[tab];
              const isActive = activeTab === tab;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {tab === 'HOT' && <Flame className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-red-500'}`} />}
                  {tab === 'WARM' && <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-white' : 'bg-amber-500'}`} />}
                  {tab === 'COLD' && <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-white' : 'bg-blue-500'}`} />}
                  {tab === 'ALL' && <Layers className="w-3.5 h-3.5" />}
                  <span>{tab === 'ALL' ? 'All Leads' : tab}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Phase 7: Interactive Sorting Dropdown */}
          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="URGENT_SCORE">Urgent & Highest Score (Default)</option>
              <option value="FOLLOW_UP_DATE">Follow-up Due (Earliest First)</option>
              <option value="SCORE_DESC">Score: High to Low</option>
              <option value="SCORE_ASC">Score: Low to High</option>
              <option value="RECENT">Recently Updated</option>
            </select>
          </div>
        </div>

        {/* Lead Cards Grid or Empty State */}
        {sortedLeads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedLeads.map((lead) => {
              const isUrgent = Boolean(lead.aiAnalysis?.urgent);
              const score = lead.aiAnalysis?.score;
              const qual = lead.aiAnalysis?.qualification;
              const isFailed = lead.analysisStatus === 'failed' || Boolean(lead.analysisError);

              // 1-line summary: Use AI summary or customer message
              const summaryText =
                lead.aiAnalysis?.summary ||
                lead.customerMessage ||
                'No additional details provided.';

              return (
                <div
                  key={lead.id}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                  className={`bg-white dark:bg-zinc-900 rounded-2xl border p-5 shadow-xs transition hover:shadow-md cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                    isUrgent
                      ? 'border-rose-400/80 dark:border-rose-700/80 bg-gradient-to-b from-rose-50/20 to-white dark:from-rose-950/20 dark:to-zinc-900 ring-1 ring-rose-400/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600'
                  }`}
                >
                  {/* Top Bar on Card: Badges & Score */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        {/* Name */}
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center gap-1.5">
                          {lead.name}
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition text-indigo-500" />
                        </h3>
                        {/* Location */}
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span>{lead.location}</span>
                        </p>
                      </div>

                      {/* Score Pill with optional post-call delta */}
                      <div
                        className={`px-3 py-1.5 rounded-xl border text-center font-black text-sm shrink-0 ${getScoreColor(
                          score
                        )}`}
                        title={
                          lead.previousScore !== undefined
                            ? `Score adjusted after call: ${lead.previousScore} → ${score}`
                            : 'AI Rubric Score'
                        }
                      >
                        {score !== undefined ? (
                          <span>{score}</span>
                        ) : (
                          <span className="text-[10px] font-medium">N/A</span>
                        )}
                        <span className="block text-[8px] font-bold uppercase tracking-wider">
                          Score
                        </span>
                        {lead.previousScore !== undefined && score !== undefined && (
                          <span className="text-[9px] font-extrabold block text-indigo-600 dark:text-indigo-400">
                            {score - lead.previousScore >= 0 ? '+' : ''}
                            {score - lead.previousScore}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Flags / Badges: Urgent, Priority, Follow-up Due, Score Delta */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {/* Urgent Flag */}
                      {isUrgent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white flex items-center gap-1 shadow-xs animate-pulse">
                          <Zap className="w-3 h-3" />
                          URGENT
                        </span>
                      )}

                      {/* Phase 7: Follow-up Due Badge */}
                      {lead.followUpDate && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs ${
                            lead.followUpDate < new Date().toISOString().split('T')[0]
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                          title={`Next contact scheduled for ${lead.followUpDate}`}
                        >
                          <CalendarCheck className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>
                            {lead.followUpDate < new Date().toISOString().split('T')[0]
                              ? `Overdue: ${lead.followUpDate}`
                              : `Follow-up: ${lead.followUpDate}`}
                          </span>
                        </span>
                      )}

                      {/* Phase 7: Adaptive Score Delta Badge */}
                      {lead.previousScore !== undefined && score !== undefined && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            score - lead.previousScore >= 0
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}
                          title={lead.scoreDeltaExplanation || `Score adjusted after call: ${lead.previousScore} → ${score}`}
                        >
                          {score - lead.previousScore >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>
                            {lead.previousScore}→{score}
                          </span>
                        </span>
                      )}

                      {/* Priority / Qualification Badge */}
                      {qual ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${getBadgeColor(
                            qual
                          )}`}
                        >
                          <Flame className="w-3 h-3" />
                          {qual} LEAD
                        </span>
                      ) : isFailed ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          ANALYSIS FAILED
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {lead.status}
                        </span>
                      )}

                      {/* Intent Label */}
                      {lead.aiAnalysis?.intent && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                          {lead.aiAnalysis.intent}
                        </span>
                      )}
                    </div>

                    {/* Property Requirement */}
                    <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 mb-2">
                      <HomeIcon className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      <span className="line-clamp-1">{lead.propertyRequirement}</span>
                    </div>

                    {/* One-Line Summary */}
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed bg-zinc-50 dark:bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 mb-4">
                      {summaryText}
                    </p>
                  </div>

                  {/* Card Footer: Budget, Timeline, & Delete */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-3">
                      {/* Budget */}
                      <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <DollarSign className="w-3.5 h-3.5 shrink-0" />
                        {lead.budget}
                      </span>
                      {/* Timeline */}
                      <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {lead.timeline}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteLead(lead.id, e)}
                      className="text-zinc-400 hover:text-rose-500 p-1.5 rounded-lg transition"
                      title="Delete lead"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-12 text-center max-w-xl mx-auto shadow-xs space-y-5 my-8">
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
              <Layers className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {activeTab === 'ALL'
                  ? 'No leads currently in your pipeline'
                  : `No ${activeTab.toLowerCase()} leads found`}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1.5 leading-relaxed">
                Test the prioritization algorithm right away by loading our 5 realistic real estate
                profiles, or submit a custom buyer intake.
              </p>
            </div>

            {/* Dual CTAs in Empty State */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleLoadSamples}
                disabled={isLoadingSamples}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Sparkles className={`w-4 h-4 ${isLoadingSamples ? 'animate-spin' : ''}`} />
                <span>{isLoadingSamples ? 'Loading Sample Leads...' : 'Load 5 Sample Leads (Hot, Warm, Cold)'}</span>
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold text-xs text-zinc-700 dark:text-zinc-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-indigo-500" />
                <span>+ Add a New Lead</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* New Lead Intake Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-4">
              <div>
                <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-indigo-600" />
                  New Real Estate Lead Intake
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Enter buyer requirement details. Saves immediately and dispatches to Gemini AI.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Intake Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field 1: Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  1. Customer Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    disabled={isSubmitting}
                    placeholder="e.g. Vikram Singhania"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 transition disabled:opacity-60 disabled:cursor-not-allowed ${
                      errors.name
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500'
                    }`}
                  />
                </div>
                {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
              </div>

              {/* Field 2 & 3: Location and Property Requirement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    2. Location <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    <input
                      type="text"
                      disabled={isSubmitting}
                      placeholder="e.g. Bandra West, Mumbai"
                      value={formData.location}
                      onChange={(e) => {
                        setFormData({ ...formData, location: e.target.value });
                        if (errors.location) setErrors({ ...errors, location: '' });
                      }}
                      className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 transition disabled:opacity-60 disabled:cursor-not-allowed ${
                        errors.location
                          ? 'border-rose-400 focus:ring-rose-500'
                          : 'border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500'
                      }`}
                    />
                  </div>
                  {errors.location && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.location}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    3. Property Requirement <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <HomeIcon className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    <input
                      type="text"
                      disabled={isSubmitting}
                      placeholder="e.g. 3 BHK Sea-View Luxury Apartment"
                      value={formData.propertyRequirement}
                      onChange={(e) => {
                        setFormData({ ...formData, propertyRequirement: e.target.value });
                        if (errors.propertyRequirement)
                          setErrors({ ...errors, propertyRequirement: '' });
                      }}
                      className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 transition disabled:opacity-60 disabled:cursor-not-allowed ${
                        errors.propertyRequirement
                          ? 'border-rose-400 focus:ring-rose-500'
                          : 'border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500'
                      }`}
                    />
                  </div>
                  {errors.propertyRequirement && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.propertyRequirement}</p>
                  )}
                </div>
              </div>

              {/* Field 4 & 5: Budget and Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    4. Budget <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    <input
                      type="text"
                      disabled={isSubmitting}
                      placeholder="e.g. ₹5.5 Cr ($700k)"
                      value={formData.budget}
                      onChange={(e) => {
                        setFormData({ ...formData, budget: e.target.value });
                        if (errors.budget) setErrors({ ...errors, budget: '' });
                      }}
                      className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 transition disabled:opacity-60 disabled:cursor-not-allowed ${
                        errors.budget
                          ? 'border-rose-400 focus:ring-rose-500'
                          : 'border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500'
                      }`}
                    />
                  </div>
                  {errors.budget && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.budget}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    5. Timeline <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-3 text-zinc-400 pointer-events-none" />
                    <select
                      disabled={isSubmitting}
                      value={formData.timeline}
                      onChange={(e) => {
                        setFormData({ ...formData, timeline: e.target.value as LeadTimeline });
                        if (errors.timeline) setErrors({ ...errors, timeline: '' });
                      }}
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {TIMELINE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Field 6: Customer Message */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    6. Customer Message <span className="text-rose-500">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-mono ${
                      formData.customerMessage.length > MESSAGE_MAX_LENGTH
                        ? 'text-rose-500 font-bold'
                        : 'text-zinc-400'
                    }`}
                  >
                    {formData.customerMessage.length} / {MESSAGE_MAX_LENGTH} characters
                  </span>
                </div>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                  <textarea
                    rows={3}
                    maxLength={MESSAGE_MAX_LENGTH}
                    disabled={isSubmitting}
                    placeholder="Describe specific preferences: floor level, balcony orientation, gated amenities, financing status, etc."
                    value={formData.customerMessage}
                    onChange={(e) => {
                      setFormData({ ...formData, customerMessage: e.target.value });
                      if (errors.customerMessage) setErrors({ ...errors, customerMessage: '' });
                    }}
                    className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 transition disabled:opacity-60 disabled:cursor-not-allowed ${
                      errors.customerMessage
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500'
                    }`}
                  />
                </div>
                {errors.customerMessage && (
                  <p className="text-[11px] text-rose-500 mt-1">{errors.customerMessage}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{submissionStep || 'Processing...'}</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Save & Qualify Lead</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
