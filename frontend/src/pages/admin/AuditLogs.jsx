import React, { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import {
  Shield,
  Search,
  Loader2,
  AlertTriangle,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

const ACTION_TYPES = [
  "payment_approved",
  "payment_rejected",
  "payment_marked_duplicate",
  "payment_under_review",
  "payment_account_created",
  "payment_account_updated",
  "payment_account_enabled",
  "payment_account_disabled",
  "teacher_enabled",
  "teacher_disabled",
];

const PAGE_SIZE = 15;

function actionBadge(action) {
  const map = {
    payment_approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    payment_rejected: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    payment_marked_duplicate: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    payment_under_review: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    payment_account_created: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    payment_account_updated: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    payment_account_enabled: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    payment_account_disabled: "bg-slate-500/10 text-slate-300 border-slate-500/20",
    teacher_enabled: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    teacher_disabled: "bg-slate-500/10 text-slate-300 border-slate-500/20",
  };
  const cls = map[action] || "bg-slate-500/10 text-slate-300 border-slate-500/20";
  return (
    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold whitespace-nowrap ${cls}`}>
      {action.replace(/_/g, " ")}
    </span>
  );
}

function ValueCell({ value }) {
  if (!value) return <span className="text-slate-600">—</span>;
  let pretty = value;
  try {
    pretty = JSON.stringify(JSON.parse(value), null, 0);
  } catch {
    /* keep as-is */
  }
  return (
    <span className="text-[10px] text-slate-400 font-mono break-words" title={pretty}>
      {pretty.length > 90 ? pretty.slice(0, 90) + "…" : pretty}
    </span>
  );
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [actionType, setActionType] = useState("");
  const [adminName, setAdminName] = useState("");
  const [targetType, setTargetType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (actionType) params.action_type = actionType;
      const res = await api.get("/api/payments_system/admin/audit-logs", {
        params: { limit: 500, ...params },
      });
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setError("Ka rarka diiwaanka waxqabadka maamulka wuu guuldareystay. (Failed to load audit logs.)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
     
  }, [actionType]);

  const targetTypes = useMemo(
    () => Array.from(new Set(logs.map((l) => l.target_type).filter(Boolean))),
    [logs]
  );

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (adminName && !(l.admin_name || "").toLowerCase().includes(adminName.toLowerCase())) return false;
      if (targetType && l.target_type !== targetType) return false;
      if (fromDate && new Date(l.created_at) < new Date(fromDate)) return false;
      if (toDate && new Date(l.created_at) > new Date(toDate + "T23:59:59")) return false;
      if (search) {
        const hay = `${l.admin_name} ${l.action_type} ${l.target_type} ${l.target_id} ${l.ip_address} ${l.old_value} ${l.new_value}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [logs, adminName, targetType, fromDate, toDate, search]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [adminName, targetType, fromDate, toDate, search, actionType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-950/20 to-[#120826] border border-indigo-900/35 p-6 flex items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            <Shield className="h-3 w-3" /> Audit Trail
          </span>
          <h2 className="text-xl font-black font-outfit text-white">Diiwaanka Waxqabadka Maamulka (Audit Logs)</h2>
          <p className="text-xs text-slate-400 font-medium">
            Dhammaan ficilada muhiimka ah: ansixinta/diidmada lacagaha, isbeddelka akoonada, iyo doorka macallimiinta.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
        >
          <RefreshCw className="h-4 w-4 text-indigo-400" /> <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-[#130b24] p-4 rounded-2xl border border-slate-800">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search anything…"
            className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-650 focus:outline-none"
          />
        </div>
        <input
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          placeholder="Admin name"
          className="px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-white placeholder-slate-650 focus:outline-none"
        />
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none"
        >
          <option value="">All actions</option>
          {ACTION_TYPES.map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none"
        >
          <option value="">All targets</option>
          {targetTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="flex-1 px-2 py-2 bg-slate-900 border border-slate-850 rounded-xl text-[11px] text-slate-300 focus:outline-none" />
          <span className="text-slate-600 text-xs">→</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="flex-1 px-2 py-2 bg-slate-900 border border-slate-850 rounded-xl text-[11px] text-slate-300 focus:outline-none" />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/5 text-center text-xs text-red-400 font-semibold">
          {error}
        </div>
      )}

      {/* States */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-12 text-center space-y-2">
          <ClipboardList className="h-8 w-8 text-slate-600 mx-auto" />
          <h4 className="text-xs font-bold text-white">No audit entries</h4>
          <p className="text-[11px] text-slate-500">Lama helin diiwaan waafaqsan shaandhaynta.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block rounded-2xl border border-slate-800 bg-[#130b24] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="p-3">Date / Time</th>
                    <th className="p-3">Admin</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Target</th>
                    <th className="p-3">ID</th>
                    <th className="p-3">IP</th>
                    <th className="p-3">Old</th>
                    <th className="p-3">New</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs text-slate-300">
                  {pageRows.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-800/10">
                      <td className="p-3 whitespace-nowrap text-[10px] text-slate-400">{new Date(l.created_at).toLocaleString()}</td>
                      <td className="p-3 font-bold text-white whitespace-nowrap">{l.admin_name || "—"}</td>
                      <td className="p-3">{actionBadge(l.action_type)}</td>
                      <td className="p-3 text-slate-400">{l.target_type || "—"}</td>
                      <td className="p-3 font-mono text-slate-400">{l.target_id || "—"}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-500">{l.ip_address || "—"}</td>
                      <td className="p-3 max-w-[160px]"><ValueCell value={l.old_value} /></td>
                      <td className="p-3 max-w-[160px]"><ValueCell value={l.new_value} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {pageRows.map((l) => (
              <div key={l.id} className="rounded-2xl border border-slate-800 bg-[#130b24] p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  {actionBadge(l.action_type)}
                  <span className="text-[9px] text-slate-500">{new Date(l.created_at).toLocaleString()}</span>
                </div>
                <div className="text-xs text-white font-bold">{l.admin_name || "—"}</div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                  <div><span className="text-slate-600 uppercase block">Target</span>{l.target_type || "—"} #{l.target_id || "—"}</div>
                  <div><span className="text-slate-600 uppercase block">IP</span><span className="font-mono">{l.ip_address || "—"}</span></div>
                </div>
                <div className="text-[10px]"><span className="text-slate-600 uppercase">Old:</span> <ValueCell value={l.old_value} /></div>
                <div className="text-[10px]"><span className="text-slate-600 uppercase">New:</span> <ValueCell value={l.new_value} /></div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{filtered.length} entr{filtered.length === 1 ? "y" : "ies"}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-bold text-white">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
