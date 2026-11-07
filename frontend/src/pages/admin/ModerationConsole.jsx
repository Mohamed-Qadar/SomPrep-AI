import React, { useEffect, useState } from "react";
import { moderationApi } from "../../services/endpoints";
import {
  Shield,
  Trash2,
  UserX,
  Check,
  AlertTriangle,
  Loader2,
  Calendar,
  MessageSquare,
  User
} from "lucide-react";

export default function ModerationConsole() {
  const [reports, setReports] = useState([]);
  const [blockedWords, setBlockedWords] = useState([]);
  const [newWord, setNewWord] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionInProgress, setActionInProgress] = useState(null); // reportId
  const [statusMessage, setStatusMessage] = useState(null);

  const showStatus = (type, text) => {
    setStatusMessage({ type, text });
  };

  useEffect(() => {
    if (!statusMessage) return undefined;
    const timer = setTimeout(() => setStatusMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const loadReports = async () => {
    setLoading(true);
    setError("");
    try {
      const [reportRes, wordRes] = await Promise.all([
        moderationApi.reports(),
        moderationApi.blockedWords(),
      ]);
      setReports(reportRes.data);
      setBlockedWords(wordRes.data);
    } catch (err) {
      console.error(err);
      setError("Ka rarka dacwooyinka wuu guuldareystay. (Failed to load reported messages.)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleAction = async (reportId, action) => {
    if (action === "ban_user" && !confirm("Ma hubtaa inaad rabto inaad mamnuucdo (ban) ardaygan? Koontadiisa waa la damin doonaa.")) return;
    if (action === "mute_user" && !confirm("Ma hubtaa inaad rabto inaad ardaygan si ku meel gaar ah u aamusiiso?")) return;
    if (action === "delete_message" && !confirm("Ma hubtaa inaad rabto inaad masaxdo farriintaan?")) return;

    setActionInProgress(reportId);
    try {
      await moderationApi.resolveReport(reportId, { action, mute_hours: 24 });
      // Remove or update report in local state
      setReports(prev => prev.filter(r => r.id !== reportId));
      showStatus("success", "Go'aanka moderation-ka waa la fuliyey.");
    } catch (err) {
      console.error(err);
      showStatus("error", "Fulinta go'aanka moderation-ka wuu guuldareystay.");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAddWord = async (e) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    try {
      const res = await moderationApi.createBlockedWord({ word: newWord.trim() });
      setBlockedWords((prev) => {
        const withoutExisting = prev.filter((item) => item.id !== res.data.id);
        return [...withoutExisting, res.data].sort((a, b) => a.word.localeCompare(b.word));
      });
      setNewWord("");
    } catch (err) {
      showStatus("error", err.response?.data?.detail || "Blocked word could not be saved.");
    }
  };

  const handleToggleWord = async (wordId) => {
    try {
      const res = await moderationApi.toggleBlockedWord(wordId);
      setBlockedWords((prev) => prev.map((item) => item.id === wordId ? res.data : item));
    } catch (err) {
      showStatus("error", "Blocked word update failed.");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-rose-950/20 to-[#120826] border border-rose-900/35 p-6 flex items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
              Moderation Console
            </span>
          </div>
          <h2 className="text-xl font-black font-outfit text-white">Console Maaraynta & Anshaxa</h2>
          <p className="text-xs text-slate-400 font-medium">
            Dib u eeg farriimaha ay ardaydu soo sheegeen si aad u ilaaliso anshaxa iyo bedqabka madasha.
          </p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
          <Shield className="h-6 w-6" />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/5 text-center text-xs text-red-400 font-semibold">
          {error}
        </div>
      )}

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-center text-xs font-semibold ${
            statusMessage.type === "success"
              ? "border-emerald-500/25 bg-emerald-950/10 text-emerald-300"
              : "border-red-500/25 bg-red-950/10 text-red-300"
          }`}
          role="status"
          aria-live="polite"
        >
          {statusMessage.text}
        </div>
      )}

      {/* Reports List */}
      <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-6 shadow-md">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
          Flagged Message Reports ({reports.length})
        </h3>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Check className="h-8 w-8 text-emerald-400 mx-auto" />
            <h4 className="text-xs font-bold text-white">Platform is Safe & Clean!</h4>
            <p className="text-[11px] text-slate-500">Waqtigan xaadirka ah ma jiraan farriimo la soo sheegay oo sugaya go'aan ka gaarid.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="p-5 rounded-xl border border-slate-850 bg-slate-900/30 flex flex-col md:flex-row md:items-center justify-between gap-5 transition hover:border-slate-800"
              >
                {/* Message & Reporter info */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold text-slate-500">
                    <span className="flex items-center gap-1 text-slate-350">
                      <User className="h-3 w-3" />
                      <span>Sender: {rep.message_sender_name}</span>
                    </span>
                    <span>•</span>
                    <span className="text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      Reason: {rep.reason}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(rep.created_at).toLocaleString()}</span>
                    </span>
                  </div>

                  {/* Flagged Message bubble */}
                  <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-850 text-xs text-slate-200 leading-relaxed font-mono relative pl-8">
                    <MessageSquare className="h-4 w-4 text-slate-600 absolute left-2.5 top-3.5" />
                    <p className="whitespace-pre-line">{rep.message_content}</p>
                  </div>

                  <div className="text-[10px] text-slate-500 font-semibold">
                    Reported by: <span className="text-indigo-400">{rep.reported_by_name}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex md:flex-col gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleAction(rep.id, "delete_message")}
                    disabled={actionInProgress === rep.id}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 text-[11px] font-bold transition disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Masax (Delete)</span>
                  </button>

                  <button
                    onClick={() => handleAction(rep.id, "mute_user")}
                    disabled={actionInProgress === rep.id}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 text-amber-400 hover:text-amber-300 text-[11px] font-bold transition disabled:opacity-50"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Aamusi (Mute)</span>
                  </button>

                  <button
                    onClick={() => handleAction(rep.id, "ban_user")}
                    disabled={actionInProgress === rep.id}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-650/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 hover:text-red-300 text-[11px] font-bold transition disabled:opacity-50"
                  >
                    <UserX className="h-3.5 w-3.5" />
                    <span>Mamnuuc (Ban)</span>
                  </button>

                  <button
                    onClick={() => handleAction(rep.id, "dismiss")}
                    disabled={actionInProgress === rep.id}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white text-[11px] font-bold border border-slate-750 transition disabled:opacity-50"
                  >
                    <span>Dhaaf (Dismiss)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-6 shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Blocked Words ({blockedWords.length})</h3>
            <p className="mt-1 text-[11px] text-slate-500">Words here are checked by the backend moderation filter.</p>
          </div>
          <form onSubmit={handleAddWord} className="flex gap-2">
            <input
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Add word"
              className="w-44 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
            />
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-[11px] font-bold text-white hover:bg-indigo-700">
              Add
            </button>
          </form>
        </div>

        <div className="mt-5 flex max-h-56 flex-wrap gap-2 overflow-y-auto">
          {blockedWords.map((item) => (
            <button
              key={item.id}
              onClick={() => handleToggleWord(item.id)}
              className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition ${
                item.is_active
                  ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
                  : "border-slate-700 bg-slate-900 text-slate-500"
              }`}
              title={item.is_active ? "Click to disable" : "Click to enable"}
            >
              {item.word}
            </button>
          ))}
          {blockedWords.length === 0 && (
            <p className="text-xs text-slate-500">No blocked words configured.</p>
          )}
        </div>
      </div>
    </div>
  );
}
