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
} from 'lucide-react';

const MESSAGE_MAX_LENGTH = 500;

export default function HomePage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<string>('');
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);

  // Form State for Phase 2: 6 Required Fields
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

  // Validation Errors
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

  // Form Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full Name is required.';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Target Location is required.';
    }
    if (!formData.propertyRequirement.trim()) {
      newErrors.propertyRequirement = 'Property requirement is required (e.g. 3BHK, Villa).';
    }
    if (!formData.budget.trim()) {
      newErrors.budget = 'Budget is required (e.g. $750k, ₹2.5 Cr).';
    }
    if (!formData.timeline) {
      newErrors.timeline = 'Please select a purchase timeline.';
    }
    if (!formData.customerMessage.trim()) {
      newErrors.customerMessage = 'Customer message is required.';
    } else if (formData.customerMessage.length > MESSAGE_MAX_LENGTH) {
      newErrors.customerMessage = `Message exceeds limit of ${MESSAGE_MAX_LENGTH} characters.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionStep('Saving lead to LocalStorage...');

    try {
      // 1. Save Lead in storage immediately
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

      // 2. Mark status as analyzing & send for AI analysis
      setSubmissionStep('Sending lead to Gemini AI for qualification...');
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
          // Success: Update lead with analysis
          await leadStorage.setAiAnalysis(newLead.id, data.analysis);
        } else {
          // Failure: Keep the lead saved, mark failure status with error reason
          const errReason = data.error || 'Gemini qualification request failed.';
          await leadStorage.setAnalysisStatus(newLead.id, 'failed', errReason);
        }
      } catch (analysisErr) {
        // Network or fetch failure: Keep lead saved, mark failed
        const errReason =
          analysisErr instanceof Error ? analysisErr.message : 'Network failure during analysis.';
        await leadStorage.setAnalysisStatus(newLead.id, 'failed', errReason);
      }

      // 3. Open the lead's detail page
      setSubmissionStep('Opening lead detail page...');
      router.push(`/leads/${newLead.id}`);
    } catch (err) {
      console.error('Submission error:', err);
      alert('Error while saving lead: ' + (err instanceof Error ? err.message : String(err)));
      setIsSubmitting(false);
    }
  };

  // Delete a lead
  const handleDeleteLead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this lead from local storage?')) {
      await leadStorage.delete(id);
      loadLeads();
    }
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
      {/* Top Navbar */}
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
                  Phase 2: Lead Intake
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Real Estate qualification with validation, failure recovery & storage
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

      {/* Main Grid: Form on Left/Center, Directory on Right */}
      <main className="max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column: Phase 2 Lead Intake Form (7 Cols) */}
        <section className="lg:col-span-7">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-5">
              <div>
                <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-indigo-600" />
                  Real Estate Lead Intake Form
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  All 6 fields are required with length validation and automatic AI analysis routing.
                </p>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                6 Required Inputs
              </span>
            </div>

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
                    placeholder="e.g. Vikram Singhania"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 transition ${
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
                {/* Field 2: Location */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    2. Location <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="e.g. Bandra West, Mumbai"
                      value={formData.location}
                      onChange={(e) => {
                        setFormData({ ...formData, location: e.target.value });
                        if (errors.location) setErrors({ ...errors, location: '' });
                      }}
                      className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 transition ${
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

                {/* Field 3: Property requirement */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    3. Property Requirement <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <HomeIcon className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="e.g. 3 BHK Sea-View Luxury Apartment"
                      value={formData.propertyRequirement}
                      onChange={(e) => {
                        setFormData({ ...formData, propertyRequirement: e.target.value });
                        if (errors.propertyRequirement)
                          setErrors({ ...errors, propertyRequirement: '' });
                      }}
                      className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 transition ${
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

              {/* Field 4 & 5: Budget and Timeline dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Field 4: Budget */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    4. Budget <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="e.g. ₹5.5 Cr ($700k)"
                      value={formData.budget}
                      onChange={(e) => {
                        setFormData({ ...formData, budget: e.target.value });
                        if (errors.budget) setErrors({ ...errors, budget: '' });
                      }}
                      className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 transition ${
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

                {/* Field 5: Timeline (Dropdown) */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    5. Timeline <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-3 text-zinc-400 pointer-events-none" />
                    <select
                      value={formData.timeline}
                      onChange={(e) => {
                        setFormData({ ...formData, timeline: e.target.value as LeadTimeline });
                        if (errors.timeline) setErrors({ ...errors, timeline: '' });
                      }}
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                    >
                      {TIMELINE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.timeline && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.timeline}</p>
                  )}
                </div>
              </div>

              {/* Field 6: Customer Message (With Length Cap) */}
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
                    placeholder="Describe specific preferences: floor level, balcony orientation, gated amenities, financing status, etc."
                    value={formData.customerMessage}
                    onChange={(e) => {
                      setFormData({ ...formData, customerMessage: e.target.value });
                      if (errors.customerMessage) setErrors({ ...errors, customerMessage: '' });
                    }}
                    className={`w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 transition ${
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

              {/* Optional Contact Details (Collapsible or compact) */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="client@mail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Phone (Optional)</label>
                  <input
                    type="tel"
                    placeholder="+91..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{submissionStep || 'Processing lead...'}</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Submit Lead & Run AI Qualification</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-[11px] text-zinc-400 text-center mt-2">
                  Saves instantly to storage, analyzes via Gemini, and automatically opens the lead detail page.
                </p>
              </div>
            </form>
          </div>
        </section>

        {/* Right Column: Pipeline Directory & Recent Leads (5 Cols) */}
        <section className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Pipeline Directory ({leads.length})
              </h2>
              <span className="text-[10px] text-zinc-400">LocalStorage Module</span>
            </div>

            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {leads.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-xs">
                  No leads recorded yet. Fill out the form to add your first real estate prospect.
                </div>
              ) : (
                leads.map((lead) => {
                  const isFailed =
                    lead.analysisStatus === 'failed' || Boolean(lead.analysisError);

                  return (
                    <div
                      key={lead.id}
                      onClick={() => router.push(`/leads/${lead.id}`)}
                      className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-white dark:bg-zinc-900 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition cursor-pointer flex flex-col gap-2 group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                              {lead.name}
                            </span>
                            {lead.aiAnalysis?.qualification ? (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getBadgeColor(
                                  lead.aiAnalysis.qualification
                                )}`}
                              >
                                {lead.aiAnalysis.qualification}
                              </span>
                            ) : isFailed ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Analysis Incomplete
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {lead.propertyRequirement}
                          </p>
                        </div>

                        <button
                          onClick={(e) => handleDeleteLead(lead.id, e)}
                          className="text-zinc-400 hover:text-rose-500 p-1 rounded-md transition"
                          title="Delete lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <DollarSign className="w-3 h-3" />
                          {lead.budget}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-zinc-400" />
                          {lead.location}
                        </span>
                        <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                          <Clock className="w-3 h-3" />
                          {lead.timeline}
                        </span>
                      </div>

                      {/* Retry Indicator if failed */}
                      {isFailed && (
                        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-[10px] text-amber-700 dark:text-amber-300">
                          <span>Analysis failed: preserved in storage</span>
                          <span className="font-semibold underline flex items-center gap-1">
                            View & Retry <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
