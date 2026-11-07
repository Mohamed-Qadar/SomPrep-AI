import React, { useEffect, useState } from "react";
import api from "../../services/api";
import LoadingState from "../../components/LoadingState";
import { Webhook, ShieldCheck, ShieldOff, RefreshCw } from "lucide-react";

const STATUS_STYLES = {
  processed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  invalid_signature: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  unverified: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  duplicate: "bg-slate-700/40 text-slate-400 border-slate-600/40",
  received: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

export default function WebhookEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/payments_system/admin/webhook-events", { params: { limit: 200 } });
      setEvents(res.data);
    } catch (err) {
      console.error("Failed to load webhook events:", err);
      setError("Webhook events could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState label="Loading webhook events..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black font-outfit text-white">
            <Webhook className="h-5 w-5 text-brand-primary" />
            Payment Webhook Events
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Every provider callback, verified or not. Only signature-verified events that pass the full
            validation chain ever activate a subscription.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-xl border border-brand-border px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800/60 shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error && <p className="text-sm text-brand-danger">{error}</p>}

      <div className="rounded-2xl border border-brand-border bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-border bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4 pl-5">Received</th>
                <th className="p-4">Provider</th>
                <th className="p-4">Transaction</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Signature</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-5">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40 text-xs text-slate-300">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No provider callbacks received yet.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="p-4 pl-5 font-mono text-slate-400">
                      {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="p-4 font-bold text-white capitalize">{e.provider}</td>
                    <td className="p-4 font-mono">{e.transaction_id || "—"}</td>
                    <td className="p-4 font-black text-emerald-400">
                      {e.amount != null ? `$${Number(e.amount).toFixed(2)}` : "—"}
                    </td>
                    <td className="p-4">
                      {e.signature_valid ? (
                        <span className="flex items-center gap-1 text-emerald-400"><ShieldCheck className="h-3.5 w-3.5" /> valid</span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-400"><ShieldOff className="h-3.5 w-3.5" /> none/invalid</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[e.status] || STATUS_STYLES.received}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="p-4 pr-5 text-slate-500 max-w-[16rem] truncate" title={e.error || ""}>
                      {e.error || (e.processed ? "activated" : "—")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
