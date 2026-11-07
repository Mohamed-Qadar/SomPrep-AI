import React, { useEffect, useState } from "react";
import api from "../../services/api";
import {
  Activity,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  RefreshCw,
} from "lucide-react";

const STATUS_STYLES = {
  safe: { cls: "border-emerald-500/25 bg-emerald-500/5", chip: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", Icon: CheckCircle2, label: "Safe" },
  warning: { cls: "border-amber-500/25 bg-amber-500/5", chip: "bg-amber-500/10 text-amber-400 border-amber-500/20", Icon: AlertTriangle, label: "Warning" },
  critical: { cls: "border-rose-500/30 bg-rose-500/5", chip: "bg-rose-500/10 text-rose-400 border-rose-500/20", Icon: XCircle, label: "Critical" },
  info: { cls: "border-slate-700 bg-slate-900/30", chip: "bg-slate-500/10 text-slate-300 border-slate-500/20", Icon: Info, label: "Info" },
};

function overallBanner(overall) {
  if (overall === "critical")
    return { cls: "from-rose-950/30 to-[#120826] border-rose-900/40", text: "text-rose-400", label: "Critical issues found" };
  if (overall === "warning")
    return { cls: "from-amber-950/20 to-[#120826] border-amber-900/40", text: "text-amber-400", label: "Warnings present" };
  return { cls: "from-emerald-950/20 to-[#120826] border-emerald-900/40", text: "text-emerald-400", label: "All systems safe" };
}

export default function SystemHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/payments_system/admin/system-health");
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError("Ka rarka xaaladda nidaamka wuu guuldareystay. (Failed to load system health.)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const banner = overallBanner(data?.overall);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className={`rounded-3xl bg-gradient-to-r ${banner.cls} border p-6 flex items-center justify-between gap-4 shadow-xl`}>
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            <Activity className="h-3 w-3" /> Production Checklist
          </span>
          <h2 className="text-xl font-black font-outfit text-white">Xaaladda Nidaamka (System Health)</h2>
          {data && (
            <p className={`text-xs font-bold ${banner.text}`}>{banner.label}</p>
          )}
        </div>
        <button
          onClick={load}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw className="h-4 w-4 text-indigo-400" /> <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/5 text-center text-xs text-red-400 font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
      ) : !data ? null : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.checks.map((c) => {
            const s = STATUS_STYLES[c.status] || STATUS_STYLES.info;
            const Icon = s.Icon;
            return (
              <div key={c.key} className={`rounded-2xl border p-5 ${s.cls}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white">{c.label}</h4>
                    <p className="mt-1 text-sm font-mono text-slate-200 break-words">{c.value}</p>
                    {c.detail && <p className="mt-1.5 text-[10px] text-slate-400 leading-relaxed">{c.detail}</p>}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold shrink-0 ${s.chip}`}>
                    <Icon className="h-3 w-3" /> {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data && (
        <p className="text-center text-[10px] text-slate-600">
          Generated {new Date(data.generated_at).toLocaleString()} · No secret values are shown.
        </p>
      )}
    </div>
  );
}
