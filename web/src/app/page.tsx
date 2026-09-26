"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coffee,
  Copy,
  Download,
  FileCheck,
  FileText,
  FileUp,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  PauseCircle,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Wand2,
  XCircle,
} from "lucide-react";

interface GapAnalysisResult {
  missing: string[];
  weak: string[];
  strong: string[];
}

interface WeakImprovement {
  skill: string;
  recommended_bullets: string[];
}

interface InterviewQuestion {
  question: string;
  targeted_skill: string;
  suggested_talking_points: string;
}

interface Tier1Insights {
  weak_improvements: WeakImprovement[];
  interview_questions: InterviewQuestion[];
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
  insights?: Tier1Insights | null;
}

const PRESET_EXAMPLES = [
  {
    name: "AI & LangGraph Engineer",
    jd: `Senior AI Workflow Engineer
Role & Responsibilities:
- Build autonomous multi-agent pipelines and real-time workflows using LangGraph and Python.
- Containerize and deploy services using Docker and Kubernetes in AWS cloud.
- Design relational schemas in PostgreSQL and configure Redis caching layers.
- Implement structured outputs, RAG pipelines, and LLM evaluation benchmarks.`,
    resume: `Candidate: Krena Patel
Senior Full-Stack & AI Engineer (4 Years Experience)
Summary:
Built multi-agent systems and high-throughput backend APIs for enterprise clients.
Key Experience:
- Engineered asynchronous microservices with Python, FastAPI, and PostgreSQL.
- Containerized development and staging pipelines using Docker.
- Explored LangGraph prototypes for ambient AI assistants and agent graphs.
- Implemented CI/CD pipelines, Git workflows, and automated testing with pytest.`,
  },
  {
    name: "Full Stack React / Node",
    jd: `Senior Full Stack Developer
Requirements:
- 5+ years experience with TypeScript, React, Next.js, and Node.js.
- Strong proficiency in GraphQL, Tailwind CSS, and PostgreSQL.
- Experience with Docker, AWS ECS, and CI/CD pipelines.`,
    resume: `Software Engineer (3 Years)
- Built modern frontend user interfaces with React, Next.js, and TypeScript.
- Designed REST APIs with Node.js and Express.
- Basic familiarity with Docker and relational SQL databases.`,
  },
];

export default function ResumeGapAnalyzerPage() {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [jobDescription, setJobDescription] = useState(PRESET_EXAMPLES[0].jd);
  const [resumeText, setResumeText] = useState(PRESET_EXAMPLES[0].resume);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedBulletKey, setCopiedBulletKey] = useState<string | null>(null);
  const [copiedQuestionKey, setCopiedQuestionKey] = useState<number | null>(null);

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // HITL state
  const [threadId, setThreadId] = useState<string | null>(null);
  const [hitlReview, setHitlReview] = useState<GapAnalysisResult | null>(null);
  const [userAdjustment, setUserAdjustment] = useState("");

  // Final Output state & Tier 1 Insights
  const [finalOutput, setFinalOutput] = useState<GapAnalysisResult | null>(null);
  const [insights, setInsights] = useState<Tier1Insights | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});

  const handleSelectPreset = (index: number) => {
    setSelectedPreset(index);
    setJobDescription(PRESET_EXAMPLES[index].jd);
    setResumeText(PRESET_EXAMPLES[index].resume);
    setHitlReview(null);
    setFinalOutput(null);
    setInsights(null);
    setError(null);
    setUploadedFileName(null);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploadingFile(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      let response: Response;
      try {
        response = await fetch("/api/upload-resume", {
          method: "POST",
          body: formData,
        });
      } catch {
        response = await fetch("http://localhost:8000/api/upload-resume", {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      setResumeText(data.extracted_text);
      setUploadedFileName(file.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Resume file upload error: ${msg}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const onDropFile = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleStartAnalysis = async () => {
    if (!jobDescription.trim() || !resumeText.trim()) {
      setError("Please ensure both Job Description and Resume text are provided.");
      return;
    }

    setLoading(true);
    setError(null);
    setFinalOutput(null);
    setInsights(null);
    setHitlReview(null);

    try {
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
        `Failed to run analysis: ${msg}. Please ensure FastAPI backend is running on port 8000.`
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
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`
        );
      }

      const data: FinalResponse = await response.json();
      setFinalOutput(data.final_output);
      if (data.insights) {
        setInsights(data.insights);
      }
      setHitlReview(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to finalize analysis: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickMoveSkill = (
    skill: string,
    from: "missing" | "weak" | "strong",
    to: "missing" | "weak" | "strong"
  ) => {
    if (!hitlReview) return;
    const updated = { ...hitlReview };
    updated[from] = updated[from].filter((s) => s !== skill);
    if (!updated[to].includes(skill)) {
      updated[to].push(skill);
    }
    setHitlReview(updated);

    const note = `Move ${skill} from ${from} to ${to}`;
    setUserAdjustment((prev) => (prev ? `${prev}; ${note}` : note));
  };

  const buildMarkdownReport = () => {
    if (!finalOutput) return "";
    let md = `# Resume Gap Analysis & Action Plan Report\n\n`;

    md += `## 1. Skill Gap Evaluation\n\n`;
    md += `### Missing Skills (${finalOutput.missing.length})\n`;
    md += finalOutput.missing.length > 0
      ? finalOutput.missing.map((s) => `- ${s}`).join("\n") + "\n\n"
      : "_None detected_\n\n";

    md += `### Weak Skills (${finalOutput.weak.length})\n`;
    md += finalOutput.weak.length > 0
      ? finalOutput.weak.map((s) => `- ${s}`).join("\n") + "\n\n"
      : "_None detected_\n\n";

    md += `### Strong Skills (${finalOutput.strong.length})\n`;
    md += finalOutput.strong.length > 0
      ? finalOutput.strong.map((s) => `- ${s}`).join("\n") + "\n\n"
      : "_None detected_\n\n";

    if (insights?.weak_improvements && insights.weak_improvements.length > 0) {
      md += `## 2. Weak-to-Strong Resume Bullet Recommendations\n\n`;
      insights.weak_improvements.forEach((item) => {
        md += `### Skill: ${item.skill}\n`;
        item.recommended_bullets.forEach((bullet) => {
          md += `- ${bullet}\n`;
        });
        md += `\n`;
      });
    }

    if (insights?.interview_questions && insights.interview_questions.length > 0) {
      md += `## 3. Targeted Technical Interview Questions & Talking Points\n\n`;
      insights.interview_questions.forEach((q, idx) => {
        md += `### Question ${idx + 1} (${q.targeted_skill})\n`;
        md += `**Q:** ${q.question}\n\n`;
        md += `**Strategic Talking Points:**\n${q.suggested_talking_points}\n\n`;
      });
    }

    return md;
  };

  const handleCopyMarkdown = () => {
    const md = buildMarkdownReport();
    if (!md) return;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = buildMarkdownReport();
    if (!md) return;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resume_gap_analysis_report_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopySingleBullet = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBulletKey(key);
    setTimeout(() => setCopiedBulletKey(null), 1800);
  };

  const handleCopyQuestion = (idx: number, q: InterviewQuestion) => {
    const text = `Question: ${q.question}\nTargeted Skill: ${q.targeted_skill}\nStrategic Talking Points:\n${q.suggested_talking_points}`;
    navigator.clipboard.writeText(text);
    setCopiedQuestionKey(idx);
    setTimeout(() => setCopiedQuestionKey(null), 1800);
  };

  const toggleQuestionExpanded = (idx: number) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleReset = () => {
    setHitlReview(null);
    setFinalOutput(null);
    setInsights(null);
    setThreadId(null);
    setUserAdjustment("");
    setError(null);
    setUploadedFileName(null);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8 font-sans selection:bg-amber-200/60 selection:text-amber-950 relative">
      {/* Warm Parchment Ambient Radial Glows */}
      <div className="absolute top-0 left-1/4 w-[550px] h-[350px] bg-amber-200/25 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-20 right-1/4 w-[500px] h-[350px] bg-orange-100/30 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="w-full max-w-5xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E7DFD5] gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#F0E9DF] border border-[#DDD3C5] flex items-center justify-center text-amber-800 shadow-sm">
            <Coffee className="w-5 h-5 text-amber-800" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                Resume Gap Analyzer
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[#F0EAE1] text-amber-900 border border-[#DDD1C2] shadow-xs">
                LangGraph HITL + Tier 1
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Actionable skill gap diagnosis, tailored bullet rewrite & technical interview prep
            </p>
          </div>
        </div>

        {/* Status / Reset */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFE9DF] border border-[#DDD2C2] text-xs font-medium text-stone-800 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Artisan Engine Ready</span>
          </div>

          {(finalOutput || hitlReview) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
              New Analysis
            </button>
          )}
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="w-full max-w-5xl mb-6 p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div className="flex-grow">
            <p className="font-semibold text-orange-950">Notice</p>
            <p className="mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-stone-400 hover:text-stone-700 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="w-full max-w-5xl flex flex-col gap-8">
        {/* Step 1: Input Setup (Visible when not reviewing or finished) */}
        {!hitlReview && !finalOutput && (
          <div className="flex flex-col gap-6">
            {/* Presets Selector */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[#EAE2D7]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Select Benchmark Preset
                </span>
              </div>
              <div className="flex items-center gap-2">
                {PRESET_EXAMPLES.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectPreset(index)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      selectedPreset === index
                        ? "bg-amber-800 text-amber-50 shadow-xs"
                        : "bg-white/80 hover:bg-stone-100 text-stone-600 border border-stone-200"
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Job Description Panel */}
              <div className="flex flex-col rounded-2xl bg-white border border-[#E8DFD3] shadow-sm overflow-hidden focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-100/60 transition-all duration-200">
                <div className="flex items-center justify-between px-4 py-3 bg-[#FAF6F0] border-b border-[#EFE8DD]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                      Target Job Description
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-400">
                    {jobDescription.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <textarea
                  rows={13}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste target job requirements and duties here..."
                  className="w-full p-4 bg-transparent text-stone-800 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none resize-none placeholder:text-stone-400"
                />
              </div>

              {/* Resume Panel with PDF Drag-and-Drop Parser */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={onDropFile}
                className={`flex flex-col rounded-2xl bg-white border transition-all duration-200 shadow-sm overflow-hidden ${
                  isDragOver
                    ? "border-amber-600 ring-4 ring-amber-100 bg-amber-50/20"
                    : "border-[#E8DFD3] focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-100/60"
                }`}
              >
                {/* Header with Upload PDF & Stats */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAF6F0] border-b border-[#EFE8DD] flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-stone-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                      Candidate Resume
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.md"
                      onChange={onFileInputChange}
                      className="hidden"
                    />

                    {/* PDF Upload Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-amber-900 text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {uploadingFile ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
                          <span>Parsing PDF...</span>
                        </>
                      ) : (
                        <>
                          <FileUp className="w-3.5 h-3.5 text-amber-700" />
                          <span>Upload PDF</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setResumeText("");
                        setUploadedFileName(null);
                      }}
                      title="Clear text"
                      className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-[#EDE5D8] transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono text-stone-400">
                      {resumeText.split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                </div>

                {/* Uploaded File Notification Tag */}
                {uploadedFileName && (
                  <div className="px-4 py-1.5 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between text-xs text-amber-900">
                    <div className="flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="font-semibold">Imported:</span>
                      <span className="font-mono truncate max-w-[240px]">
                        {uploadedFileName}
                      </span>
                    </div>
                    <button
                      onClick={() => setUploadedFileName(null)}
                      className="text-stone-400 hover:text-stone-600 text-[11px] underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <textarea
                  rows={12}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste candidate experience or drop a PDF resume file directly here..."
                  className="w-full p-4 bg-transparent text-stone-800 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none resize-none placeholder:text-stone-400"
                />

                {/* Sub Dropzone Cue */}
                <div className="px-4 py-2 bg-[#FAF7F2] border-t border-[#EFE8DD] text-[11px] text-stone-400 flex items-center justify-between">
                  <span>💡 Tip: Drag & drop any PDF or text resume into this card</span>
                  <span>Supports .pdf, .txt, .md</span>
                </div>
              </div>
            </div>

            {/* Run Button Banner */}
            <div className="flex items-center justify-end pt-2">
              <button
                onClick={handleStartAnalysis}
                disabled={loading}
                className="w-full sm:w-auto relative group overflow-hidden flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-700 via-amber-800 to-stone-900 hover:from-amber-800 hover:to-black text-amber-50 font-semibold text-sm tracking-wide shadow-md shadow-amber-950/15 hover:shadow-lg hover:shadow-amber-950/25 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-100" />
                    <span>Evaluating Gaps...</span>
                  </>
                ) : (
                  <>
                    <span>Run Gap Analysis</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Human-in-the-Loop Review Panel */}
        {hitlReview && !finalOutput && (
          <section className="bg-white border border-amber-300/80 rounded-2xl p-6 sm:p-7 shadow-xl shadow-amber-900/5 relative overflow-hidden">
            {/* Top Amber Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-700" />

            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100/70 border border-amber-300 flex items-center justify-center text-amber-800">
                  <PauseCircle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                    Human-in-the-Loop Review
                  </h2>
                  <p className="text-xs text-stone-500">
                    Execution paused at <code className="text-amber-900 font-mono bg-amber-50 px-1 py-0.5 rounded border border-amber-200">interrupt()</code>. Click any arrow (<ArrowUpRight className="inline w-3 h-3 text-amber-700" />) to promote, or enter feedback.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100/80 text-amber-900 border border-amber-300 shadow-xs">
                Confirmation Required
              </span>
            </div>

            {/* 3 Columns Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Missing Skills (Terracotta) */}
              <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200 flex flex-col">
                <div className="flex items-center justify-between mb-3 text-orange-950 text-xs font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-orange-700" /> Missing
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-orange-900 text-xs font-semibold border border-orange-200 shadow-xs">
                    {hitlReview.missing.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 flex-grow content-start">
                  {hitlReview.missing.length > 0 ? (
                    hitlReview.missing.map((s, i) => (
                      <div
                        key={i}
                        className="group flex items-center gap-1.5 px-2.5 py-1 bg-white border border-orange-200 text-orange-900 text-xs font-medium rounded-lg shadow-xs"
                      >
                        <span>{s}</span>
                        <button
                          onClick={() => handleQuickMoveSkill(s, "missing", "weak")}
                          title="Move to Weak"
                          className="text-orange-400 group-hover:text-amber-700 hover:scale-110 transition cursor-pointer"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-stone-400 italic py-2">
                      None detected
                    </span>
                  )}
                </div>
              </div>

              {/* Weak Skills (Caramel Bronze) */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col">
                <div className="flex items-center justify-between mb-3 text-amber-950 text-xs font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-700" /> Weak / Partial
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-amber-900 text-xs font-semibold border border-amber-200 shadow-xs">
                    {hitlReview.weak.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 flex-grow content-start">
                  {hitlReview.weak.length > 0 ? (
                    hitlReview.weak.map((s, i) => (
                      <div
                        key={i}
                        className="group flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-200 text-amber-900 text-xs font-medium rounded-lg shadow-xs"
                      >
                        <span>{s}</span>
                        <button
                          onClick={() => handleQuickMoveSkill(s, "weak", "strong")}
                          title="Promote to Strong"
                          className="text-amber-400 group-hover:text-emerald-700 hover:scale-110 transition cursor-pointer"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-stone-400 italic py-2">
                      None detected
                    </span>
                  )}
                </div>
              </div>

              {/* Strong Skills (Olive Sage) */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col">
                <div className="flex items-center justify-between mb-3 text-emerald-950 text-xs font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Strong
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-emerald-900 text-xs font-semibold border border-emerald-200 shadow-xs">
                    {hitlReview.strong.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 flex-grow content-start">
                  {hitlReview.strong.length > 0 ? (
                    hitlReview.strong.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-emerald-200 text-emerald-900 text-xs font-medium rounded-lg shadow-xs"
                      >
                        <span>{s}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-stone-400 italic py-2">
                      None detected
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Human Feedback Input */}
            <div className="bg-[#FAF6F0] border border-[#E9DFD2] p-4 rounded-xl mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700" />
                  Natural Language Adjustment
                </label>
                <span className="text-[11px] text-stone-400 font-mono">Optional</span>
              </div>
              <input
                type="text"
                value={userAdjustment}
                onChange={(e) => setUserAdjustment(e.target.value)}
                placeholder="e.g. Move Docker to strong; candidate has 3 years production Docker experience"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs sm:text-sm focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 transition placeholder:text-stone-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-1">
              <button
                onClick={() => handleResumeAnalysis("")}
                disabled={loading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-300 hover:bg-[#F5EFE7] text-stone-700 text-xs font-semibold tracking-wide transition cursor-pointer"
              >
                Approve As Is
              </button>
              <button
                onClick={() => handleResumeAnalysis()}
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-amber-50 text-xs font-semibold shadow-md shadow-amber-950/15 transition cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-100" />
                    <span>Finalizing Insights...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Confirm & Generate Insights</span>
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Step 3: Final Output View (Artisan Cards + Tier 1 Insights) */}
        {finalOutput && (
          <div className="flex flex-col gap-8">
            {/* Section A: Confirmed Gap Analysis Cards */}
            <section className="bg-white border border-[#E7DED1] rounded-2xl p-6 sm:p-7 shadow-sm">
              {/* Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#EFE8DD] gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-stone-900 tracking-tight">
                      Final Confirmed Gap Analysis
                    </h2>
                    <p className="text-xs text-stone-500">
                      Evaluated with LangGraph Human-in-the-Loop review
                    </p>
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyMarkdown}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FAF6F0] hover:bg-[#F2ECE1] border border-[#DDD3C5] text-xs font-medium text-stone-700 transition cursor-pointer shadow-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-emerald-800 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-stone-500" />
                        <span>Copy Report</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700 transition cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-stone-500" />
                    <span>Download .md</span>
                  </button>
                </div>
              </div>

              {/* 3 Artisan Result Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Missing Column (Terracotta) */}
                <div className="bg-orange-50/50 border border-orange-200/80 rounded-xl p-5 flex flex-col shadow-xs">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-orange-100">
                    <div className="flex items-center gap-2 text-orange-900 text-xs font-bold uppercase tracking-wider">
                      <XCircle className="w-4 h-4 text-orange-600" />
                      <span>Missing Skills</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-orange-900 font-semibold text-xs border border-orange-200 shadow-xs">
                      {finalOutput.missing.length}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mb-3.5">
                    Required by JD but not present in candidate resume.
                  </p>
                  <div className="flex flex-col gap-2 flex-grow">
                    {finalOutput.missing.length > 0 ? (
                      finalOutput.missing.map((item, idx) => (
                        <div
                          key={idx}
                          className="px-3.5 py-2.5 rounded-lg bg-white border border-orange-200/80 text-orange-950 text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs"
                        >
                          <span>{item}</span>
                          <span className="text-[10px] text-orange-800 font-semibold uppercase tracking-wider bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                            Gap
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-stone-400 italic py-6 text-center">
                        No missing skills detected!
                      </div>
                    )}
                  </div>
                </div>

                {/* Weak Column (Caramel Bronze) */}
                <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-5 flex flex-col shadow-xs">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-100">
                    <div className="flex items-center gap-2 text-amber-900 text-xs font-bold uppercase tracking-wider">
                      <HelpCircle className="w-4 h-4 text-amber-600" />
                      <span>Weak Skills</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-amber-900 font-semibold text-xs border border-amber-200 shadow-xs">
                      {finalOutput.weak.length}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mb-3.5">
                    Mentioned in passing or lacking project depth.
                  </p>
                  <div className="flex flex-col gap-2 flex-grow">
                    {finalOutput.weak.length > 0 ? (
                      finalOutput.weak.map((item, idx) => (
                        <div
                          key={idx}
                          className="px-3.5 py-2.5 rounded-lg bg-white border border-amber-200/80 text-amber-950 text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs"
                        >
                          <span>{item}</span>
                          <span className="text-[10px] text-amber-800 font-semibold uppercase tracking-wider bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Needs Proof
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-stone-400 italic py-6 text-center">
                        No weak skills detected.
                      </div>
                    )}
                  </div>
                </div>

                {/* Strong Column (Olive Sage) */}
                <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-5 flex flex-col shadow-xs">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Strong Skills</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-emerald-900 font-semibold text-xs border border-emerald-200 shadow-xs">
                      {finalOutput.strong.length}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mb-3.5">
                    Clearly demonstrated and backed by hands-on experience.
                  </p>
                  <div className="flex flex-col gap-2 flex-grow">
                    {finalOutput.strong.length > 0 ? (
                      finalOutput.strong.map((item, idx) => (
                        <div
                          key={idx}
                          className="px-3.5 py-2.5 rounded-lg bg-white border border-emerald-200/80 text-emerald-950 text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs"
                        >
                          <span>{item}</span>
                          <span className="text-[10px] text-emerald-800 font-semibold uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Matched
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-stone-400 italic py-6 text-center">
                        No strong skills detected.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Section B: Tier 1 Feature 1 - Actionable Weak-to-Strong Bullets */}
            {insights && insights.weak_improvements && insights.weak_improvements.length > 0 && (
              <section className="bg-white border border-[#E7DED1] rounded-2xl p-6 sm:p-7 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-[#EFE8DD] mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-800 shadow-xs">
                      <Wand2 className="w-5 h-5 text-amber-800" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
                          Weak-to-Strong Bullet Recommendations
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                          Tier 1
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">
                        Action-verb, metric-driven resume lines to convert skill gaps into demonstrable strengths
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  {insights.weak_improvements.map((improvement, skillIdx) => (
                    <div
                      key={skillIdx}
                      className="rounded-xl border border-stone-200 bg-[#FCFAF7] p-4 sm:p-5 shadow-xs"
                    >
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EFE8DE] flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-700" />
                          <span className="text-sm font-bold text-stone-900">
                            {improvement.skill}
                          </span>
                          <span className="text-[11px] text-stone-500">
                            • Gap Target
                          </span>
                        </div>
                        <span className="text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono">
                          {improvement.recommended_bullets.length} suggested bullets
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {improvement.recommended_bullets.map((bullet, bulletIdx) => {
                          const itemKey = `${skillIdx}-${bulletIdx}`;
                          const isCopied = copiedBulletKey === itemKey;
                          return (
                            <div
                              key={bulletIdx}
                              className="group flex items-start justify-between gap-3 p-3 rounded-lg bg-white border border-[#EBE3D8] hover:border-amber-300 text-stone-800 text-xs sm:text-sm leading-relaxed transition shadow-xs"
                            >
                              <div className="flex items-start gap-2.5 flex-grow">
                                <span className="text-amber-700 font-bold shrink-0 mt-0.5">
                                  •
                                </span>
                                <span>{bullet}</span>
                              </div>
                              <button
                                onClick={() => handleCopySingleBullet(itemKey, bullet)}
                                className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer ${
                                  isCopied
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                    : "bg-[#FAF7F2] hover:bg-[#F2EBE0] border-stone-200 text-stone-600"
                                }`}
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-700" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-stone-400 group-hover:text-stone-700" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Section C: Tier 1 Feature 3 - Anticipated Technical Interview Questions */}
            {insights && insights.interview_questions && insights.interview_questions.length > 0 && (
              <section className="bg-white border border-[#E7DED1] rounded-2xl p-6 sm:p-7 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-[#EFE8DD] mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-800 shadow-xs">
                      <HelpCircle className="w-5 h-5 text-amber-800" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
                          Targeted Technical Interview Anticipator
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                          Tier 1
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">
                        Interview questions hiring managers will likely ask regarding your gaps, with strategic talking points
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {insights.interview_questions.map((q, idx) => {
                    const isExpanded = expandedQuestions[idx] ?? true;
                    const isCopied = copiedQuestionKey === idx;

                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-stone-200 bg-[#FCFAF7] overflow-hidden shadow-xs transition"
                      >
                        {/* Question Header */}
                        <div className="p-4 sm:p-5 flex items-start justify-between gap-3 bg-white border-b border-[#EFE8DE]">
                          <div className="flex items-start gap-3 flex-grow">
                            <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold uppercase tracking-wider">
                                  Probing: {q.targeted_skill}
                                </span>
                              </div>
                              <h3 className="text-xs sm:text-sm font-semibold text-stone-900 leading-snug">
                                {q.question}
                              </h3>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleCopyQuestion(idx, q)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer ${
                                isCopied
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                  : "bg-[#FAF7F2] hover:bg-[#F2EBE0] border-stone-200 text-stone-600"
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-700" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-stone-400" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => toggleQuestionExpanded(idx)}
                              className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                              title={isExpanded ? "Collapse talking points" : "Expand talking points"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Strategic Talking Points */}
                        {isExpanded && (
                          <div className="p-4 sm:p-5 bg-[#FAF7F2] flex items-start gap-3">
                            <div className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center shrink-0 mt-0.5 text-stone-600">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-700" />
                            </div>
                            <div className="flex-grow">
                              <p className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                                Strategic Talking Points & Answering Framework
                              </p>
                              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans">
                                {q.suggested_talking_points}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}