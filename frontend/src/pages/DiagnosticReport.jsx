import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { examsApi } from "../services/endpoints";
import {
  ShieldAlert,
  ArrowLeft,
  Clock,
  Tv,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
  ChevronRight,
  BookOpen,
  Award
} from "lucide-react";

export default function DiagnosticReport() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await examsApi.diagnostic(attemptId);
        setReport(res.data);
      } catch (err) {
        console.error("Error fetching diagnostic report:", err);
        setError("Ma suurtagelin in la soo rogo warbixinta baadhista. (Failed to load diagnostic report).");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [attemptId]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans">
      {/* Background Glows */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[36rem] w-[36rem] rounded-full bg-indigo-500/[0.05] blur-[120px]" />
      <div className="pointer-events-none absolute top-[40%] -right-48 h-[36rem] w-[36rem] rounded-full bg-emerald-500/[0.03] blur-[120px]" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#334155] bg-[#0f172a]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button
            onClick={() => navigate(`/results/${attemptId}`)}
            className="flex items-center gap-2 rounded-xl border border-[#334155] bg-[#1e293b]/60 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Ku Laabo Natiijooyinka</span>
          </button>
          <span className="font-outfit text-lg font-extrabold tracking-tight">
            SomPrep <span className="text-indigo-400">Diagnostic Hub</span>
          </span>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Title */}
        <div>
          <h1 className="font-outfit text-3xl font-extrabold text-white leading-tight">
            Reflex Diagnostic Report
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Analyzing topic performance, time metrics, and reflex breakdowns from your exam.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-950/40 p-4 text-xs text-red-400 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : report ? (
          <div className="space-y-8 animate-fade-in">
            {/* Top Score & Time Overview cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Attempt Score */}
              <div className="rounded-3xl border border-[#334155] bg-[#1e293b]/40 p-6 flex flex-col items-center justify-center text-center space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Attempt Score
                </span>
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <svg className="absolute inset-0 h-full w-full -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="46"
                      className="stroke-[#0f172a] fill-none stroke-[6]"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="46"
                      className="stroke-indigo-500 fill-none stroke-[6] transition-all duration-1000"
                      strokeDasharray={2 * Math.PI * 46}
                      strokeDashoffset={2 * Math.PI * 46 * (1 - report.score / 100)}
                    />
                  </svg>
                  <span className="font-outfit text-2xl font-black text-white">
                    {Math.round(report.score)}%
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">
                  {report.correct_answers} Correct · {report.wrong_answers} Wrong
                </span>
              </div>

              {/* Time management statistics */}
              <div className="md:col-span-2 rounded-3xl border border-[#334155] bg-[#1e293b]/40 p-6 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Time Management Index
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                      report.time_management.status === "Efficient"
                        ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                        : report.time_management.status === "Average"
                        ? "text-amber-400 border-amber-500/20 bg-amber-500/5"
                        : "text-red-400 border-red-500/20 bg-red-500/5"
                    }`}>
                      {report.time_management.status} Pace
                    </span>
                  </div>
                  <h3 className="font-outfit text-lg font-bold text-white">
                    Average {report.time_management.average_seconds_per_question}s / Question
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {report.time_management.tip}
                  </p>
                </div>
                <div className="pt-4 border-t border-[#334155] flex justify-between text-xs text-slate-500">
                  <span>Total Time Spent: {Math.floor(report.time_management.time_spent_seconds / 60)} Mins</span>
                  <span>Subject: {report.subject_name}</span>
                </div>
              </div>
            </div>

            {/* Syllabus Gaps and video remediation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Weak Topics list */}
              <div className="rounded-3xl border border-[#334155] bg-[#1e293b]/40 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-400" />
                  <h3 className="font-outfit text-base font-bold text-white">Weak Subtopics Identified</h3>
                </div>
                {report.weakness_grid.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No weak subtopics. Excellent performance!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {report.weakness_grid.map((sub, i) => (
                      <div key={i} className="flex justify-between items-center bg-[#0f172a]/40 border border-[#334155] p-3 rounded-xl">
                        <div className="space-y-0.5">
                          <span className="block text-xs font-bold text-slate-200">{sub.name}</span>
                          <span className="text-[10px] text-slate-500">Status: {sub.status}</span>
                        </div>
                        <span className="text-xs font-bold text-red-400">{sub.score}% score</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action plan / video recommendation */}
              <div className="rounded-3xl border border-[#334155] bg-[#1e293b]/40 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Tv className="h-5 w-5 text-indigo-400" />
                  <h3 className="font-outfit text-base font-bold text-white">Remediation Action Plan</h3>
                </div>
                {report.remediation_lessons.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No remediation required. Maintain this path!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {report.remediation_lessons.map((lesson, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center bg-[#0f172a]/40 border border-[#334155] p-3 rounded-xl hover:border-slate-500 transition cursor-pointer"
                        onClick={() => navigate(`/video/${lesson.subtopic_id}`)}
                      >
                        <div className="space-y-0.5">
                          <span className="block text-xs font-bold text-slate-200">{lesson.video_title}</span>
                          <span className="text-[10px] text-slate-500">Chapter: {lesson.subtopic_name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Repeated mistakes / Reflex breakdown */}
            <div className="rounded-3xl border border-[#334155] bg-[#1e293b]/40 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h3 className="font-outfit text-base font-bold text-white">Conceptual Reflex Breakdown</h3>
              </div>
              {report.repeated_mistakes.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No mistake reflexes mapped for this attempt.
                </div>
              ) : (
                <div className="space-y-4">
                  {report.repeated_mistakes.map((mistake, i) => (
                    <div key={i} className="border border-[#334155] bg-[#0f172a]/50 p-4 rounded-2xl space-y-2">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>QUESTION REFLEX {i + 1}</span>
                        <span className="uppercase text-amber-400 font-semibold">{mistake.difficulty_level}</span>
                      </div>
                      <p className="text-xs text-slate-300 italic">
                        "{mistake.question_text}"
                      </p>
                      <div className="border-t border-[#334155]/60 pt-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-indigo-400 shrink-0" />
                        <span className="text-xs font-bold text-indigo-300">
                          {mistake.reflex_step_title}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
