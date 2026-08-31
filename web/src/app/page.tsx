"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle, Play, Loader2, ArrowRight, Sparkles, Building2, Briefcase } from "lucide-react";

interface MatchAnalysis {
  match_score: number;
  matching_keywords: string[];
  missing_keywords: string[];
  tailored_summary: string;
  tailored_bullet_points: string[];
}

interface AgentResult {
  application_status: string;
  match_analysis?: MatchAnalysis;
  error_logs: string[];
}

export default function CareerCopilotDashboard() {
  const [loading, setLoading] = useState(false);
  const [jobTitle, setJobTitle] = useState("AI Workflow Engineer");
  const [company, setCompany] = useState("Shivay Intelligence");
  const [description, setDescription] = useState(
    "Build multi-agent workflows using LangGraph, Python, and FastAPI."
  );
  const [applyUrl, setApplyUrl] = useState("https://httpbin.org/forms/post");
  const [skills, setSkills] = useState("Python, FastAPI, LangGraph, Docker");
  const [result, setResult] = useState<AgentResult | null>(null);

  const handleRunAgent = async () => {
    setLoading(true);
    setResult(null);

    const payload = {
      job: {
        title: jobTitle,
        company: company,
        description: description,
        apply_url: applyUrl,
        required_skills: skills.split(",").map((s) => s.trim()),
      },
      candidate_profile: {
        name: "Krena Patel",
        email: "krena.patel@example.com",
        phone: "+91 9876543210",
        linkedin: "https://linkedin.com/in/krenapatel",
        github: "https://github.com/krenaa",
        portfolio: "https://krenapatel.dev",
        skills: ["Python", "FastAPI", "Docker", "React", "PostgreSQL", "LangGraph", "Playwright"],
      },
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setResult({
        application_status: "FAILED_TO_CONNECT",
        error_logs: ["Could not communicate with the FastAPI agent server."],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-indigo-400" />
              Career Copilot
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Autonomous multi-agent ATS optimizer & application autopilot
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Backend Connected (127.0.0.1:8000)
          </div>
        </div>

        {/* Input & Live Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form Panel */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-200">Target Role Parameters</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-400">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">Company</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">Application URL</label>
                <input
                  type="text"
                  value={applyUrl}
                  onChange={(e) => setApplyUrl(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">Job Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>
            </div>

            <button
              onClick={handleRunAgent}
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4 rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Orchestrating Agents...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Dispatch Application Agent
                </>
              )}
            </button>
          </div>

          {/* Right Generative UI Results Panel */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-6 flex flex-col">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Agent Execution & Generative UI</h2>

            {!result && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg p-8 text-center text-slate-500">
                <Briefcase className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">Click "Dispatch Application Agent" to trigger the LangGraph workflow.</p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-8 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-300">LangGraph Pipeline Active</p>
                  <p className="text-xs text-slate-500">Matching ATS keywords & initializing Playwright browser...</p>
                </div>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-6">
                {/* Status Bar */}
                <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-3">
                    {result.application_status === "APPLICATION_SUBMITTED" ? (
                      <CheckCircle className="h-6 w-6 text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-amber-400" />
                    )}
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Status</div>
                      <div className="text-sm font-semibold text-white">{result.application_status}</div>
                    </div>
                  </div>

                  {result.match_analysis && (
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">ATS Fit</div>
                      <div className="text-xl font-bold text-indigo-400">
                        {result.match_analysis.match_score}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Keyword Analysis Chips */}
                {result.match_analysis && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Matched ATS Keywords
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {result.match_analysis.matching_keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    {result.match_analysis.missing_keywords.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Missing Keywords
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {result.match_analysis.missing_keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-md bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tailored Professional Summary */}
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        AI Generated Cover Summary
                      </h3>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {result.match_analysis.tailored_summary}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}