"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  PauseCircle,
  RefreshCw,
  Sparkles,
  UserCheck,
  XCircle,
} from "lucide-react";

interface GapAnalysisResult {
  missing: string[];
  weak: string[];
  strong: string[];
}

interface AnalyzeResponse {
  thread_id: string;
  status: string;
  proposed_gap: GapAnalysisResult | null;
  interrupt_message?: string;
}

interface FinalResponse {
  thread_id: string;
  status: string;
  final_output: GapAnalysisResult | null;
}

const DEFAULT_JD = `Senior AI Workflow Engineer
Requirements:
- Strong proficiency in Python, FastAPI, and LangGraph workflow orchestration.
- Containerization and orchestration with Docker and Kubernetes.
- Relational databases (PostgreSQL) and cloud infrastructure (AWS).`;

const DEFAULT_RESUME = `Krena Patel - AI & Backend Engineer
Summary:
Full Stack & AI Engineer with 4 years building scalable services.
Key Experience:
- Engineered asynchronous microservices with Python and FastAPI.
- Designed relational schemas and query optimizations in PostgreSQL.
- Containerized development and staging pipelines using Docker.
- Explored LangGraph for prototype agent pipelines.`;

export default function ResumeGapAnalyzerPage() {
  const [jobDescription, setJobDescription] = useState(DEFAULT_JD);
  const [resumeText, setResumeText] = useState(DEFAULT_RESUME);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // HITL state
  const [threadId, setThreadId] = useState<string | null>(null);
  const [hitlReview, setHitlReview] = useState<GapAnalysisResult | null>(null);
  const [userAdjustment, setUserAdjustment] = useState("");

  // Final Output state
  const [finalOutput, setFinalOutput] = useState<GapAnalysisResult | null>(null);

  const handleStartAnalysis = async () => {
    if (!jobDescription.trim() || !resumeText.trim()) {
      setError("Please paste both a Job Description and Resume text.");
      return;
    }

    setLoading(true);
    setError(null);
    setFinalOutput(null);
    setHitlReview(null);

    try {
      // Tries relative /api/analyze (via Next.js rewrite proxy) or direct backend
      let response: Response;
      try {
        response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_description_text: jobDescription,
            resume_text: resumeText,
          }),
        });
      } catch {
        // Fallback to direct localhost:8000
        response = await fetch("http://localhost:8000/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_description_text: jobDescription,
            resume_text: resumeText,
          }),
        });
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `Server returned ${response.status}: ${response.statusText} ${errorBody}`
        );
      }

      const data: AnalyzeResponse = await response.json();
      setThreadId(data.thread_id);

      if (data.status === "WAITING_FOR_REVIEW" && data.proposed_gap) {
        setHitlReview(data.proposed_gap);
      } else if (data.proposed_gap) {
        setFinalOutput(data.proposed_gap);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        `Failed to run analysis: ${msg}. Please ensure FastAPI backend is running: python -m uvicorn src.api:app --port 8000`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResumeAnalysis = async (customAdjustment?: string) => {
    if (!threadId) return;

    setLoading(true);
    setError(null);

    const feedbackToSend =
      customAdjustment !== undefined ? customAdjustment : userAdjustment;

    try {
      let response: Response;
      try {
        response = await fetch("/api/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            thread_id: threadId,
            user_feedback: feedbackToSend,
          }),
        });
      } catch {
        response = await fetch("http://localhost:8000/api/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            thread_id: threadId,
            user_feedback: feedbackToSend,
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data: FinalResponse = await response.json();
      setFinalOutput(data.final_output);
      setHitlReview(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to resume analysis: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setHitlReview(null);
    setFinalOutput(null);
    setThreadId(null);
    setUserAdjustment("");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Header */}
      <header className="w-full max-w-5xl mb-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 justify-center sm:justify-start">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Resume Gap Analyzer
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Compare target Job Descriptions against candidate resumes with LangGraph Human-in-the-Loop review.
          </p>
        </div>

        {finalOutput && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition"
          >
            <RefreshCw className="w-4 h-4" />
            Analyze Another Pair
          </button>
        )}
      </header>

      {/* Error Alert */}
      {error && (
        <div className="w-full max-w-5xl mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
          <div className="text-sm leading-relaxed">{error}</div>
        </div>
      )}

      {/* Main Container */}
      <main className="w-full max-w-5xl flex flex-col gap-8">
        {/* Step 1: Input Textareas (Shown when not in Final state) */}
        {!finalOutput && !hitlReview && (
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">
                1
              </span>
              Input Job Description & Resume
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Job Description Textarea */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Target Job Description
                </label>
                <textarea
                  rows={9}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the target job description requirements here..."
                  className="w-full p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-y"
                />
              </div>

              {/* Resume Textarea */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Candidate Resume Text
                </label>
                <textarea
                  rows={9}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste candidate resume or project experience here..."
                  className="w-full p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-y"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleStartAnalysis}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Extracting & Comparing Skills...
                  </>
                ) : (
                  <>
                    Run Gap Analysis
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Step 2: Human-in-the-Loop Review Interruption Modal/Card */}
        {hitlReview && !finalOutput && (
          <section className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-indigo-500" />

            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">
                  Human-in-the-Loop Confirmation
                </h2>
              </div>
              <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-semibold rounded-full border border-amber-500/20">
                LangGraph interrupt() Paused
              </span>
            </div>

            <p className="text-sm text-slate-300 mb-6">
              The agent has parsed and compared the skills. Review the proposed categorization below before the output is finalized.
            </p>

            {/* Proposed Buckets Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Missing */}
              <div className="p-4 bg-slate-950/60 border border-red-900/40 rounded-xl">
                <div className="flex items-center gap-1.5 text-red-400 font-semibold text-xs uppercase tracking-wider mb-2">
                  <XCircle className="w-4 h-4" /> Missing ({hitlReview.missing.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {hitlReview.missing.length > 0 ? (
                    hitlReview.missing.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 bg-red-950/60 border border-red-800/40 text-red-300 text-xs rounded-md">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">None</span>
                  )}
                </div>
              </div>

              {/* Weak */}
              <div className="p-4 bg-slate-950/60 border border-amber-900/40 rounded-xl">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs uppercase tracking-wider mb-2">
                  <HelpCircle className="w-4 h-4" /> Weak ({hitlReview.weak.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {hitlReview.weak.length > 0 ? (
                    hitlReview.weak.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 bg-amber-950/60 border border-amber-800/40 text-amber-300 text-xs rounded-md">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">None</span>
                  )}
                </div>
              </div>

              {/* Strong */}
              <div className="p-4 bg-slate-950/60 border border-emerald-900/40 rounded-xl">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs uppercase tracking-wider mb-2">
                  <CheckCircle2 className="w-4 h-4" /> Strong ({hitlReview.strong.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {hitlReview.strong.length > 0 ? (
                    hitlReview.strong.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-xs rounded-md">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">None</span>
                  )}
                </div>
              </div>
            </div>

            {/* Adjustment Input */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Human Adjustment (Optional)
              </label>
              <input
                type="text"
                value={userAdjustment}
                onChange={(e) => setUserAdjustment(e.target.value)}
                placeholder="e.g. Move Docker to strong; add PostgreSQL to strong"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-500 mt-2">
                Type any correction to override the AI categorizations before finalization.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                onClick={() => handleResumeAnalysis("")}
                disabled={loading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium transition cursor-pointer"
              >
                Approve As Is
              </button>
              <button
                onClick={() => handleResumeAnalysis()}
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    Confirm & Finalize
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Step 3: Final Output Display */}
        {finalOutput && (
          <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-white">Final Confirmed Gap Analysis</h2>
                  <p className="text-xs text-slate-400">Verified and finalized with human-in-the-loop review</p>
                </div>
              </div>
            </div>

            {/* 3 Result Buckets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Missing Column */}
              <div className="bg-slate-950/70 border border-red-900/30 rounded-xl p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3 border-b border-red-950/60 pb-2">
                  <span className="flex items-center gap-1.5 text-red-400 font-bold text-sm">
                    <XCircle className="w-4 h-4" /> Missing
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-950 text-red-400 font-mono">
                    {finalOutput.missing.length}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">Skills explicitly required by the JD but absent from the resume.</p>
                <div className="flex flex-col gap-2 flex-grow">
                  {finalOutput.missing.length > 0 ? (
                    finalOutput.missing.map((item, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 bg-red-950/30 border border-red-800/30 text-red-200 rounded-lg text-sm font-medium"
                      >
                        {item}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic py-4 text-center">No missing skills detected!</div>
                  )}
                </div>
              </div>

              {/* Weak Column */}
              <div className="bg-slate-950/70 border border-amber-900/30 rounded-xl p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3 border-b border-amber-950/60 pb-2">
                  <span className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                    <HelpCircle className="w-4 h-4" /> Weak
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 font-mono">
                    {finalOutput.weak.length}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">Mentioned in passing or listed without project/metric backing.</p>
                <div className="flex flex-col gap-2 flex-grow">
                  {finalOutput.weak.length > 0 ? (
                    finalOutput.weak.map((item, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 bg-amber-950/30 border border-amber-800/30 text-amber-200 rounded-lg text-sm font-medium"
                      >
                        {item}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic py-4 text-center">No weak skills detected.</div>
                  )}
                </div>
              </div>

              {/* Strong Column */}
              <div className="bg-slate-950/70 border border-emerald-900/30 rounded-xl p-5 flex flex-col">
                <div className="flex items-center justify-between mb-3 border-b border-emerald-950/60 pb-2">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Strong
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-mono">
                    {finalOutput.strong.length}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">Clearly demonstrated matches backed by hands-on experience.</p>
                <div className="flex flex-col gap-2 flex-grow">
                  {finalOutput.strong.length > 0 ? (
                    finalOutput.strong.map((item, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 bg-emerald-950/30 border border-emerald-800/30 text-emerald-200 rounded-lg text-sm font-medium"
                      >
                        {item}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic py-4 text-center">No strong skills detected.</div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}