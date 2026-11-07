import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { reviewerApi } from "../services/endpoints";
import LoadingState from "../components/LoadingState";
import {
  ShieldAlert,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Sparkles,
  RefreshCw,
  Clock,
  BookOpen,
  FileText
} from "lucide-react";

export default function ReviewerDashboard() {
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modal state for rejection reason
  const [rejectingQuestionId, setRejectingQuestionId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Tracking AI requests to display custom loaders per-row
  const [aiLoadingIds, setAiLoadingIds] = useState(new Set());

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await reviewerApi.pending();
      setPending(res.data);
    } catch (err) {
      console.error("Error fetching pending questions:", err);
      setError("Ma suurtagelin in la soo rogo su'aalaha sugaya dib-u-eegista. (Failed to load pending queue).");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleReview = async (questionId, status, reason = "") => {
    try {
      await reviewerApi.reviewQuestion(questionId, {
        status,
        rejection_reason: reason
      });
      // Remove question from list on success
      setPending((prev) => prev.filter((q) => q.id !== questionId));
      setRejectingQuestionId(null);
      setRejectionReason("");
    } catch (err) {
      console.error("Error submitting review:", err);
      alert("Fadlan isku day markale. (Review submission failed).");
    }
  };

  const handleAiAssist = async (questionId) => {
    try {
      setAiLoadingIds((prev) => new Set([...prev, questionId]));
      const res = await reviewerApi.aiAssist(questionId);
      
      // Update local question data with AI explanations
      setPending((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, explanation_text: res.data.explanation_text, reflex_step_title: res.data.reflex_step_title }
            : q
        )
      );
    } catch (err) {
      console.error("AI Assist failed:", err);
      alert("AI generator details failed to fetch.");
    } finally {
      setAiLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans">
      {/* Background Glows */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[36rem] w-[36rem] rounded-full bg-indigo-500/[0.05] blur-[120px]" />
      <div className="pointer-events-none absolute top-[40%] -right-48 h-[36rem] w-[36rem] rounded-full bg-emerald-500/[0.03] blur-[120px]" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#334155] bg-[#0f172a]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 rounded-xl border border-[#334155] bg-[#1e293b]/60 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Ku Laabo Dashboard</span>
          </button>
          <span className="font-outfit text-lg font-extrabold tracking-tight">
            SomPrep <span className="text-indigo-400">Reviewer Portal</span>
          </span>
          <button
            onClick={fetchPending}
            className="rounded-xl border border-[#334155] bg-[#1e293b]/60 p-2 text-slate-300 hover:text-white hover:bg-[#1e293b] transition"
            title="Refresh List"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="font-outfit text-3xl font-extrabold text-white leading-tight">
            Academic Question Review Panel
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review AI-drafted question explanations, verify correct choices, and approve to publish live.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-950/40 p-4 text-xs text-red-400 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <LoadingState label="Loading review queue..." fullScreen={false} />
        ) : pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#334155] p-12 text-center text-slate-400">
            <FileText className="h-12 w-12 mx-auto text-slate-600 mb-3" />
            <p className="text-sm font-semibold">Maya wax su'aalo ah oo sugaya dib-u-eegista.</p>
            <p className="text-xs text-slate-500">All questions are reviewed and active in the curriculum question bank.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pending.map((q) => (
              <div
                key={q.id}
                className="rounded-3xl border border-[#334155] bg-[#1e293b]/40 p-6 space-y-4"
              >
                {/* Question Info row */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider pb-3 border-b border-[#334155]/60">
                  <div className="flex gap-3">
                    <span>Language: {q.language}</span>
                    <span>•</span>
                    <span>Source: {q.source_type}</span>
                  </div>
                  <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-lg">
                    {q.difficulty_level}
                  </span>
                </div>

                {/* Question text */}
                <h3 className="font-outfit text-base font-bold text-white leading-relaxed">
                  {q.question_text}
                </h3>

                {/* Choices list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {q.choices.map((c, i) => (
                    <div
                      key={c.id}
                      className={`text-xs font-semibold p-3 rounded-xl border flex items-center gap-3 ${
                        c.is_correct
                          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                          : "border-[#334155] bg-[#0f172a]/40 text-slate-400"
                      }`}
                    >
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        c.is_correct ? "bg-emerald-500 text-white" : "bg-[#1e293b] text-slate-400"
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span>{c.choice_text}</span>
                    </div>
                  ))}
                </div>

                {/* Explanation walkthrough block */}
                {q.explanation_text ? (
                  <div className="border border-indigo-500/20 bg-indigo-500/5 p-4 rounded-2xl space-y-2 mt-4">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">
                      Reflex step: {q.reflex_step_title || "None"}
                    </span>
                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {q.explanation_text}
                    </pre>
                  </div>
                ) : (
                  <div className="pt-2">
                    <button
                      onClick={() => handleAiAssist(q.id)}
                      disabled={aiLoadingIds.has(q.id)}
                      className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-bold text-indigo-400 hover:bg-indigo-500/20 transition active:scale-[0.98] disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>{aiLoadingIds.has(q.id) ? "Generat-gareynaya..." : "Get AI Assist explanation"}</span>
                    </button>
                  </div>
                )}

                {/* Bottom actions */}
                <div className="pt-4 border-t border-[#334155]/60 flex justify-end gap-3">
                  <button
                    onClick={() => setRejectingQuestionId(q.id)}
                    className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition active:scale-[0.98]"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => handleReview(q.id, "approved")}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/10 transition active:scale-[0.98]"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Approve to Publish</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reject Modal */}
      {rejectingQuestionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#334155] bg-[#1e293b] p-6 shadow-2xl space-y-4">
            <h3 className="font-outfit font-bold text-white text-lg">Specify Rejection Reason</h3>
            <textarea
              className="w-full h-24 rounded-xl border border-[#334155] bg-[#0f172a] text-xs p-3 focus:outline-none focus:border-indigo-500 text-slate-300"
              placeholder="e.g. Inaccurate formula, spelling issue..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setRejectingQuestionId(null);
                  setRejectionReason("");
                }}
                className="flex-1 rounded-xl border border-[#334155] bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview(rejectingQuestionId, "rejected", rejectionReason)}
                disabled={!rejectionReason.trim()}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2.5 text-xs font-bold text-white transition disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
