'use client';

import React, { useState, useEffect } from 'react';
import {
  Lead,
  LeadInputFields,
  LeadQualification,
  LeadStatus,
  LeadPriority,
  CallSentiment,
} from '@/types/lead';
import { leadStorage } from '@/lib/storage';
import {
  Sparkles,
  User,
  Building,
  Mail,
  Phone,
  Briefcase,
  FileText,
  Calendar,
  MessageSquare,
  PhoneCall,
  Flame,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);

  // New Lead Form State (6 Core Input Fields + optional Follow-up Date + Priority)
  const [formData, setFormData] = useState<LeadInputFields & { followUpDate: string; priority: LeadPriority }>({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    notes: '',
    followUpDate: '',
    priority: 'MEDIUM',
  });

  // Call Update Form State
  const [callSummary, setCallSummary] = useState('');
  const [callOutcome, setCallOutcome] = useState('');
  const [callNextAction, setCallNextAction] = useState('');
  const [callSentiment, setCallSentiment] = useState<CallSentiment>('POSITIVE');
  const [callDuration, setCallDuration] = useState<number>(15);

  // Chat message input
  const [chatInput, setChatInput] = useState('');

  // Active Tab in Lead Details: 'analysis' | 'calls' | 'chat'
  const [activeTab, setActiveTab] = useState<'analysis' | 'calls' | 'chat'>('analysis');

  // Load leads from storage on mount
  useEffect(() => {
    async function load() {
      const data = await leadStorage.getAll();
      setLeads(data);
      if (data.length > 0) {
        setSelectedLeadId(data[0].id);
      }
    }
    load();

    // Check Gemini API status
    fetch('/api/analyze-lead')
      .then((res) => res.json())
      .then((data) => setGeminiConfigured(Boolean(data.geminiConfigured)))
      .catch(() => setGeminiConfigured(false));
  }, []);

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || leads[0] || null;

  // Handle creating a new lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.company.trim()) {
      alert('Please provide at least a Name and Company.');
      return;
    }

    try {
      const newLead = await leadStorage.create({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        role: formData.role,
        notes: formData.notes,
        followUpDate: formData.followUpDate || undefined,
        priority: formData.priority,
      });

      // Clear form
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        role: '',
        notes: '',
        followUpDate: '',
        priority: 'MEDIUM',
      });

      // Refresh list and select new lead
      const updated = await leadStorage.getAll();
      setLeads(updated);
      setSelectedLeadId(newLead.id);
    } catch (err) {
      console.error('Error creating lead:', err);
    }
  };

  // Trigger Gemini AI Lead Analysis
  const handleAnalyzeLead = async () => {
    if (!selectedLead) return;
    setIsAnalyzing(true);

    try {
      const res = await fetch('/api/analyze-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedLead.name,
          email: selectedLead.email,
          phone: selectedLead.phone,
          company: selectedLead.company,
          role: selectedLead.role,
          notes: selectedLead.notes,
        }),
      });

      const data = await res.json();
      if (data.analysis) {
        const updated = await leadStorage.setAiAnalysis(selectedLead.id, data.analysis);
        const all = await leadStorage.getAll();
        setLeads(all);
        setSelectedLeadId(updated.id);
        setActiveTab('analysis');
      } else {
        alert(data.error || 'Failed to analyze lead.');
      }
    } catch (err) {
      console.error('Failed to trigger AI analysis:', err);
      alert('Network error while analyzing lead.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Log a new Call Update
  const handleAddCallUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !callSummary.trim()) return;

    try {
      await leadStorage.addCallUpdate(selectedLead.id, {
        summary: callSummary,
        outcome: callOutcome || 'Follow-up noted.',
        nextAction: callNextAction || 'Continue engagement.',
        sentiment: callSentiment,
        durationMinutes: Number(callDuration) || 15,
        loggedBy: 'Sales Rep',
      });

      setCallSummary('');
      setCallOutcome('');
      setCallNextAction('');

      const all = await leadStorage.getAll();
      setLeads(all);
    } catch (err) {
      console.error('Failed to add call update:', err);
    }
  };

  // Send a Chat Message
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !chatInput.trim()) return;

    const userText = chatInput.trim();
    setChatInput('');

    try {
      // Add user message
      await leadStorage.addChatMessage(selectedLead.id, {
        role: 'user',
        content: userText,
      });

      // Quick simulated assistant reply or AI context response
      setTimeout(async () => {
        await leadStorage.addChatMessage(selectedLead.id, {
          role: 'assistant',
          content: `Noted regarding ${selectedLead.company}: "${userText}". Saved to conversation timeline.`,
        });
        const all = await leadStorage.getAll();
        setLeads(all);
      }, 500);

      const all = await leadStorage.getAll();
      setLeads(all);
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
  };

  // Delete a lead
  const handleDeleteLead = async (id: string) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      await leadStorage.delete(id);
      const all = await leadStorage.getAll();
      setLeads(all);
      if (selectedLeadId === id) {
        setSelectedLeadId(all.length > 0 ? all[0].id : null);
      }
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800';
    if (score >= 60) return 'text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800';
    return 'text-rose-500 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800';
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight">MasalAI</h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Lead Intelligence
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                AI qualification, meeting timelines & pluggable storage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Gemini API Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900">
              <span
                className={`h-2 w-2 rounded-full ${
                  geminiConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-zinc-600 dark:text-zinc-300">
                {geminiConfigured ? 'Gemini 2.5 Active' : 'Gemini Key Config Ready'}
              </span>
            </div>

            <a
              href="https://github.com/hrishitapundir-commits/MasalAI"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              GitHub <ExternalLink className="w-3 h-3 text-zinc-400" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column: Intake Form & Lead Directory */}
        <section className="lg:col-span-4 space-y-6">
          {/* 6 Input Fields Intake Form */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-500" />
                New Lead Intake
              </h2>
              <span className="text-[11px] text-zinc-400">6 Core Fields</span>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3">
              {/* Field 1: Name */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  1. Contact Full Name *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maya Patel"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Field 2 & 3: Email & Phone */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    2. Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-2.5 top-3 text-zinc-400" />
                    <input
                      type="email"
                      placeholder="maya@co.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full text-xs pl-8 pr-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    3. Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-2.5 top-3 text-zinc-400" />
                    <input
                      type="tel"
                      placeholder="+1 (555)..."
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full text-xs pl-8 pr-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Field 4 & 5: Company & Role */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    4. Company *
                  </label>
                  <div className="relative">
                    <Building className="w-3.5 h-3.5 absolute left-2.5 top-3 text-zinc-400" />
                    <input
                      type="text"
                      required
                      placeholder="Apex Corp"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full text-xs pl-8 pr-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    5. Role / Title
                  </label>
                  <div className="relative">
                    <Briefcase className="w-3.5 h-3.5 absolute left-2.5 top-3 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="COO / Head of Ops"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full text-xs pl-8 pr-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Field 6: Business Notes / Inquiry */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  6. Lead Notes / Requirement
                </label>
                <div className="relative">
                  <FileText className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                  <textarea
                    rows={2}
                    placeholder="Details about customer pain points, budget, or rollout timeline..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Optional Follow-up Date */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Follow-up Date (Optional)
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Lead to LocalStorage
              </button>
            </form>
          </div>

          {/* Stored Leads List */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Pipeline Directory ({leads.length})
              </h2>
              <span className="text-[10px] text-zinc-400">LocalStorage Adapter</span>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {leads.map((lead) => {
                const isSelected = lead.id === selectedLead?.id;
                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-start justify-between ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                          {lead.name}
                        </span>
                        {lead.aiAnalysis?.qualification && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getBadgeColor(
                              lead.aiAnalysis.qualification
                            )}`}
                          >
                            {lead.aiAnalysis.qualification}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {lead.role ? `${lead.role} · ` : ''}
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {lead.company}
                        </span>
                      </div>
                      {lead.followUpDate && (
                        <div className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 mt-1">
                          <Clock className="w-2.5 h-2.5" />
                          Follow-up: {lead.followUpDate}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLead(lead.id);
                      }}
                      className="text-zinc-400 hover:text-rose-500 p-1 rounded-md transition"
                      title="Delete lead"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Column: Lead Detail, Gemini AI Analysis, Call Timeline & Chat */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          {selectedLead ? (
            <>
              {/* Lead Profile Banner */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold tracking-tight">{selectedLead.name}</h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        {selectedLead.status}
                      </span>
                      {selectedLead.aiAnalysis && (
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${getBadgeColor(
                            selectedLead.aiAnalysis.qualification
                          )}`}
                        >
                          <Flame className="w-3 h-3" />
                          {selectedLead.aiAnalysis.qualification} LEAD
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {selectedLead.role} at{' '}
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {selectedLead.company}
                      </span>
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-zinc-600 dark:text-zinc-400">
                      {selectedLead.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-zinc-400" />
                          {selectedLead.email}
                        </span>
                      )}
                      {selectedLead.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-zinc-400" />
                          {selectedLead.phone}
                        </span>
                      )}
                      {selectedLead.followUpDate && (
                        <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          Scheduled Follow-up: {selectedLead.followUpDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AI Qualification Trigger Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAnalyzeLead}
                      disabled={isAnalyzing}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Analyzing with Gemini...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          {selectedLead.aiAnalysis ? 'Re-Analyze with Gemini' : 'Qualify with Gemini AI'}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Initial Intake Notes Preview */}
                {selectedLead.notes && (
                  <div className="mt-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80 text-xs">
                    <span className="font-semibold text-zinc-500 dark:text-zinc-400 block mb-0.5">
                      Intake Inquiry Notes:
                    </span>
                    <p className="text-zinc-700 dark:text-zinc-300 italic">
                      &quot;{selectedLead.notes}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Tabs Navigation */}
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
                  AI Analysis & Insights
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
                  Call Updates ({selectedLead.callUpdates.length})
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
                  Chat History ({selectedLead.chatHistory.length})
                </button>
              </div>

              {/* Tab 1: AI Analysis */}
              {activeTab === 'analysis' && (
                <div className="space-y-4">
                  {selectedLead.aiAnalysis ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-5">
                      {/* Fit Score & Summary */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex-1">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                            Executive AI Briefing
                          </span>
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mt-1">
                            {selectedLead.aiAnalysis.summary}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div
                            className={`p-3 rounded-2xl border text-center ${getScoreColor(
                              selectedLead.aiAnalysis.score
                            )}`}
                          >
                            <span className="block text-2xl font-black">
                              {selectedLead.aiAnalysis.score}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">
                              Fit Score
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Pain Points & Opportunities */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2.5 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            Identified Pain Points
                          </h4>
                          <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                            {selectedLead.aiAnalysis.painPoints.map((pt, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-rose-500 font-bold">•</span>
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2.5 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                            Key Expansion Opportunities
                          </h4>
                          <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                            {selectedLead.aiAnalysis.opportunities.map((op, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>{op}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Recommended Pitch */}
                      <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Recommended Rep Pitch Angle
                        </h4>
                        <p className="text-xs text-indigo-950 dark:text-indigo-200">
                          {selectedLead.aiAnalysis.recommendedPitch}
                        </p>
                      </div>

                      {/* Suggested Discovery Questions */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                          Suggested Call Discovery Questions
                        </h4>
                        <div className="space-y-1.5">
                          {selectedLead.aiAnalysis.suggestedQuestions.map((q, i) => (
                            <div
                              key={i}
                              className="text-xs p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                            >
                              <span className="h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                {i + 1}
                              </span>
                              <span>{q}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-sm">No AI Analysis Yet</h3>
                      <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                        Click &quot;Qualify with Gemini AI&quot; to evaluate this lead based on the 6
                        intake fields and get instant fit scoring, pain point synthesis, and tailored pitch suggestions.
                      </p>
                      <button
                        onClick={handleAnalyzeLead}
                        disabled={isAnalyzing}
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-700 transition"
                      >
                        Run Gemini Analysis Now
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
                      Log Call / Meeting Update
                    </h3>
                    <form onSubmit={handleAddCallUpdate} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-zinc-500 mb-1">
                            Duration (minutes)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={callDuration}
                            onChange={(e) => setCallDuration(Number(e.target.value))}
                            className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-zinc-500 mb-1">Sentiment</label>
                          <select
                            value={callSentiment}
                            onChange={(e) => setCallSentiment(e.target.value as CallSentiment)}
                            className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                          >
                            <option value="POSITIVE">Positive</option>
                            <option value="NEUTRAL">Neutral</option>
                            <option value="NEGATIVE">Negative</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-zinc-500 mb-1">Discussion Summary *</label>
                        <input
                          type="text"
                          required
                          placeholder="Discussed pilot scope, team size, and integration timeline..."
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
                            placeholder="Agreed on pricing proposal"
                            value={callOutcome}
                            onChange={(e) => setCallOutcome(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-zinc-500 mb-1">Next Action</label>
                          <input
                            type="text"
                            placeholder="Follow up with legal on Thursday"
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

                  {/* Call Timeline List */}
                  <div className="space-y-3">
                    {selectedLead.callUpdates.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic p-4 text-center">
                        No call updates logged yet. Use the form above to record meeting notes.
                      </p>
                    ) : (
                      selectedLead.callUpdates.map((call) => (
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

                          <p className="text-xs text-zinc-800 dark:text-zinc-200 mt-2">
                            {call.summary}
                          </p>

                          <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap gap-4 text-[11px] text-zinc-500">
                            {call.outcome && (
                              <span>
                                <strong className="text-zinc-700 dark:text-zinc-300">Outcome:</strong>{' '}
                                {call.outcome}
                              </span>
                            )}
                            {call.nextAction && (
                              <span>
                                <strong className="text-zinc-700 dark:text-zinc-300">
                                  Next Step:
                                </strong>{' '}
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

              {/* Tab 3: Chat History */}
              {activeTab === 'chat' && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs flex flex-col h-[460px]">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                    Lead Conversation Timeline
                  </h3>

                  <div className="flex-1 overflow-y-auto space-y-3 p-2">
                    {selectedLead.chatHistory.length === 0 ? (
                      <p className="text-xs text-zinc-400 text-center mt-12">
                        No messages recorded yet. Start a discussion below.
                      </p>
                    ) : (
                      selectedLead.chatHistory.map((msg) => (
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

                  <form onSubmit={handleSendChat} className="mt-3 flex items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <input
                      type="text"
                      placeholder="Type a lead note or message..."
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
            </>
          ) : (
            <div className="p-12 text-center text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              No leads currently available. Create one using the form on the left.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
