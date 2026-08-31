"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Bot,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Send,
  Cpu,
  Layers,
  History,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import confetti from "canvas-confetti";

interface MatchAnalysis {
  match_score: number;
  matching_keywords: string[];
  missing_keywords: string[];
  tailored_summary: string;
  tailored_bullet_points: string[];
}

interface ApplicationHistoryItem {
  id: number;
  title: string;
  company: string;
  apply_url: string;
  match_score: number | null;
  application_status: string;
  created_at: string;
}

interface AgentResult {
  application_status: string;
  match_analysis?: MatchAnalysis;
  error_logs: string[];
}

export default function CareerCopilotDashboard() {
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [history, setHistory] = useState<ApplicationHistoryItem[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // Form State
  const [jobTitle, setJobTitle] = useState("AI Workflow Engineer");
  const [company, setCompany] = useState("Shivay Intelligence");
  const [applyUrl, setApplyUrl] = useState("https://httpbin.org/forms/post");
  const [skills, setSkills] = useState("Python, FastAPI, LangGraph, Docker");
  const [description, setDescription] = useState(
    "Develop autonomous multi-agent systems and real-time LangGraph workflows integrated with FastAPI backend services."
  );

  const [result, setResult] = useState<AgentResult | null>(null);

  // Fetch Database History
  const fetchHistory = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // Backend not yet reachable
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleRunAgent = async () => {
    setLoading(true);
    setResult(null);
    setLogs([]);
    setActiveStep(1);

    addLog(`Initializing LangGraph agent for "${jobTitle}" at ${company}...`);

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
      addLog("Node 1: Extracting ATS keywords and evaluating match vector...");
      setActiveStep(2);

      const res = await fetch("http://127.0.0.1:8000/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

      addLog("Node 2: Conditional routing passed. Dispatching Playwright headless browser...");
      setActiveStep(3);

      const data: AgentResult = await res.json();
      setResult(data);

      addLog(`Execution completed with status: ${data.application_status}`);
      setActiveStep(4);

      if (data.application_status === "APPLICATION_SUBMITTED") {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
      }

      fetchHistory();
    } catch (err: any) {
      addLog(`Error: ${err.message || "Failed to reach backend"}`);
      setResult({
        application_status: "FAILED",
        error_logs: [err.message || "Connection failure"],
      });
      setActiveStep(0);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-950/20";
    if (score >= 60) return "text-amber-400 border-amber-500/30 bg-amber-950/20";
    return "text-rose-400 border-rose-500/30 bg-rose-950/20";
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-200 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-[#0B1120]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight">CareerCopilot</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded">
                  Autonomous v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none">LangGraph • FastMCP • Playwright</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>FastAPI Backend: <strong className="text-white font-mono">127.0.0.1:8000</strong></span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Target Inputs & Pipeline Stepper (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Form Card */}
          <div className="bg-[#0E1626] border border-slate-800/90 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80" />
            
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                Target Job Specification
              </h2>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium">Job Title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full mt-1.5 bg-[#090D16] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition font-medium"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Company</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full mt-1.5 bg-[#090D16] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-medium">Application Portal URL</label>
                <input
                  type="text"
                  value={applyUrl}
                  onChange={(e) => setApplyUrl(e.target.value)}
                  className="w-full mt-1.5 bg-[#090D16] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">Required Skills</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="w-full mt-1.5 bg-[#090D16] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition font-medium"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">Role Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1.5 bg-[#090D16] border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition leading-relaxed resize-none"
                />
              </div>

              <button
                onClick={handleRunAgent}
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Executing LangGraph Agent...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Dispatch Agent Autopilot</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Stepper Card */}
          <div className="bg-[#0E1626] border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-indigo-400" />
              Agent Workflow Pipeline
            </h3>

            <div className="space-y-3">
              {[
                { step: 1, title: "Scout & Payload Ingestion", desc: "Parsed candidate profile and job requirements." },
                { step: 2, title: "ATS Matcher & Synthesis", desc: "Extracted keywords and generated tailored bullets via Groq." },
                { step: 3, title: "Playwright Form Autopilot", desc: "Navigated portal and filled input fields automatically." },
                { step: 4, title: "State Persistence", desc: "Stored result record into SQLAlchemy database." },
              ].map((item) => (
                <div
                  key={item.step}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                    activeStep === item.step
                      ? "bg-indigo-950/40 border-indigo-500/50 text-white"
                      : activeStep > item.step
                      ? "bg-slate-900/40 border-emerald-500/30 text-slate-300"
                      : "bg-[#090D16]/50 border-slate-800/60 text-slate-500"
                  }`}
                >
                  <div className="mt-0.5">
                    {activeStep > item.step ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : activeStep === item.step ? (
                      <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin" />
                    ) : (
                      <Clock className="h-4 w-4 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold">{item.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Generative Output & Telemetry Console (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Result Card */}
          <div className="bg-[#0E1626] border border-slate-800/90 rounded-2xl p-6 shadow-xl min-h-[380px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  Agent Execution Output
                </h2>
                {result && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                    result.application_status === "APPLICATION_SUBMITTED"
                      ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                      : "bg-amber-950/60 text-amber-300 border-amber-800"
                  }`}>
                    {result.application_status}
                  </span>
                )}
              </div>

              {!result && !loading && (
                <div className="py-20 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Bot className="h-6 w-6" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium">Ready to dispatch agent</p>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Fill in the target role parameters and click Dispatch to start the autonomous LangGraph pipeline.
                  </p>
                </div>
              )}

              {loading && (
                <div className="py-20 text-center space-y-4">
                  <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mx-auto" />
                  <div>
                    <p className="text-sm text-slate-200 font-medium">Executing State Machine...</p>
                    <p className="text-xs text-slate-500">Running LLM structured extraction and browser automation</p>
                  </div>
                </div>
              )}

              {result && result.match_analysis && (
                <div className="mt-5 space-y-5">
                  {/* Score & Summary Banner */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-[#090D16] border border-slate-800">
                    <div className={`h-16 w-16 rounded-xl border flex flex-col items-center justify-center ${getScoreColor(result.match_analysis.match_score)}`}>
                      <span className="text-xl font-extrabold">{result.match_analysis.match_score}%</span>
                      <span className="text-[9px] uppercase font-bold tracking-tighter opacity-80">ATS Fit</span>
                    </div>

                    <div className="flex-1">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tailored Cover Pitch</div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {result.match_analysis.tailored_summary}
                      </p>
                    </div>
                  </div>

                  {/* Skills Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" /> Matched Keywords
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.match_analysis.matching_keywords.map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-[11px]">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> Missing Keywords
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.match_analysis.missing_keywords.length > 0 ? (
                          result.match_analysis.missing_keywords.map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-rose-950/50 border border-rose-800/60 text-rose-300 text-[11px]">
                              {kw}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">None (100% matched)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bullet Points */}
                  <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800 space-y-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Generated ATS Bullet Points
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {result.match_analysis.tailored_bullet_points.map((bp, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <ChevronRight className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
                          <span>{bp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Live Terminal Log Streamer */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
                <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                Live Agent Execution Logs
              </div>
              <div className="bg-[#050811] rounded-lg p-3 font-mono text-[11px] text-slate-400 h-24 overflow-y-auto space-y-1 border border-slate-900">
                {logs.length === 0 ? (
                  <span className="text-slate-600">Waiting for agent execution...</span>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="leading-tight">
                      <span className="text-indigo-400">$</span> {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Application History Table */}
          <div className="bg-[#0E1626] border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-400" />
                Recent Applications Log
              </h3>
              <button onClick={fetchHistory} className="text-slate-400 hover:text-white transition">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="pb-2">Role & Company</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Match</th>
                    <th className="pb-2 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-500 text-xs">
                        No applications recorded yet.
                      </td>
                    </tr>
                  ) : (
                    history.slice(0, 5).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/30 transition">
                        <td className="py-2.5 font-medium">
                          <div className="text-white">{item.title}</div>
                          <div className="text-[10px] text-slate-400">{item.company}</div>
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 border border-emerald-800/80 text-emerald-300">
                            {item.application_status}
                          </span>
                        </td>
                        <td className="py-2.5 font-semibold text-indigo-400">
                          {item.match_score ? `${item.match_score}%` : "N/A"}
                        </td>
                        <td className="py-2.5 text-right text-slate-500 text-[11px]">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}