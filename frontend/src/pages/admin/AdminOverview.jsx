import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { examsApi, adminApi, packagesApi } from "../../services/endpoints";
import api from "../../services/api";
import {
  BookOpen,
  Users,
  CreditCard,
  Wallet,
  Shield,
  Activity,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

function StatCard({ icon: Icon, label, value, hint, to, accent = "indigo" }) {
  const accents = {
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };
  const body = (
    <div className="glass-panel rounded-2xl p-5 border border-brand-border shadow-xl h-full transition hover:border-brand-primary/40">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-black text-white">{value ?? "—"}</p>
          {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
        </div>
        <div className={`rounded-xl border p-2.5 ${accents[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function AdminOverview() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [stats, setStats] = useState({});
  const [recentLogs, setRecentLogs] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [questions, teachers, packages, submissions, logs] = await Promise.allSettled([
        examsApi.questions(),
        adminApi.teachers(),
        packagesApi.adminList(),
        api.get("/api/payments_system/admin/submissions"),
        isAdmin ? api.get("/api/payments_system/admin/audit-logs", { params: { limit: 6 } }) : Promise.reject(),
      ]);

      const next = {};
      if (questions.status === "fulfilled") next.questions = questions.value.data.length;
      if (teachers.status === "fulfilled") {
        next.teachers = teachers.value.data.length;
        next.activeTeachers = teachers.value.data.filter((t) => t.is_active).length;
      }
      if (packages.status === "fulfilled") {
        next.activePackages = packages.value.data.filter((p) => p.is_active).length;
        next.totalPackages = packages.value.data.length;
      }
      if (submissions.status === "fulfilled") {
        const subs = submissions.value.data;
        next.pendingPayments = subs.filter((s) => s.status === "pending" || s.status === "under_review").length;
        next.approvedPayments = subs.filter((s) => s.status === "approved").length;
        setPendingPayments(
          subs
            .filter((s) => s.status === "pending" || s.status === "under_review")
            .slice(0, 5)
        );
      }
      if (logs.status === "fulfilled") {
        const data = logs.value.data;
        setRecentLogs((Array.isArray(data) ? data : data.items || []).slice(0, 6));
      }
      setStats(next);
      setLoading(false);
    };
    load();
  }, [isAdmin]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#1c0f38] to-[#120826] border border-indigo-950/60 p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-0" />
        <div className="relative z-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 bg-brand-danger/10 px-3 py-1 rounded-full border border-brand-danger/20">
            Xarunta Maamulka · Admin Control Center
          </span>
          <h2 className="mt-2 text-2xl font-black font-outfit text-white">
            Ku soo dhowow, {user?.full_name}!
          </h2>
          <p className="mt-1 text-xs text-slate-400 font-medium">
            {loading ? "Waxaa la soo rarayaa xogta..." : "Halkan ka maamul nuxurka, lacag-bixinta, iyo nidaamka oo dhan."}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Questions Bank" value={stats.questions}
          hint="Total exam questions" to="/admin/manage?tab=questions" />
        <StatCard icon={Users} label="Teachers" value={stats.teachers}
          hint={stats.teachers != null ? `${stats.activeTeachers} active` : undefined}
          to="/admin/manage?tab=teachers" accent="emerald" />
        <StatCard icon={CreditCard} label="Active Packages" value={stats.activePackages}
          hint={stats.totalPackages != null ? `${stats.totalPackages} total in catalog` : undefined}
          to="/admin/manage?tab=packages" accent="indigo" />
        <StatCard icon={Wallet} label="Pending Payments" value={stats.pendingPayments}
          hint={stats.approvedPayments != null ? `${stats.approvedPayments} approved all-time` : undefined}
          to="/admin/payment-review" accent={stats.pendingPayments > 0 ? "amber" : "emerald"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Pending payment queue */}
        <div className="glass-panel rounded-2xl border border-brand-border shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border/60">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Payment Queue (Sugaya)</h3>
            </div>
            <Link to="/admin/payment-review" className="flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:underline">
              Review all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {pendingPayments.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-slate-500">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-emerald-500/60" />
              No payments waiting for review.
            </div>
          ) : (
            <ul className="divide-y divide-brand-border/40">
              {pendingPayments.map((s) => (
                <li key={s.id} className="px-5 py-3 flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-200 truncate">{s.package_name || s.package_id}</p>
                    <p className="text-slate-500">{s.sender_phone} · {s.transaction_id}</p>
                  </div>
                  <span className="shrink-0 font-black text-emerald-400">${Number(s.amount_paid ?? 0).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent admin activity (admin only) */}
        <div className="glass-panel rounded-2xl border border-brand-border shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border/60">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Recent Admin Activity</h3>
            </div>
            {isAdmin && (
              <Link to="/admin/audit-logs" className="flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:underline">
                Audit logs <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          {!isAdmin ? (
            <div className="px-5 py-8 text-center text-xs text-slate-500">
              <XCircle className="h-6 w-6 mx-auto mb-2 text-slate-600" />
              Audit history is visible to full admins only.
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-slate-500">No recorded activity yet.</div>
          ) : (
            <ul className="divide-y divide-brand-border/40">
              {recentLogs.map((log) => (
                <li key={log.id} className="px-5 py-3 flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-200 truncate">{log.action_type}</p>
                    <p className="text-slate-500 truncate">
                      {log.admin_name || `admin #${log.admin_id}`} · {log.target_type} {log.target_id}
                    </p>
                  </div>
                  <span className="shrink-0 text-slate-500 font-mono">
                    {log.created_at ? new Date(log.created_at).toLocaleDateString() : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* System shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: "/admin/moderation", label: "Moderation", Icon: Users },
          { to: "/admin/system-health", label: "System Health", Icon: Activity, adminOnly: true },
          { to: "/admin/payment-accounts", label: "Payment Accounts", Icon: Wallet, adminOnly: true },
          { to: "/reviewer", label: "Reviewer Portal", Icon: BookOpen },
        ]
          .filter((l) => !l.adminOnly || isAdmin)
          .map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-center justify-between gap-2 rounded-xl border border-brand-border bg-slate-900/40 px-4 py-3.5 transition hover:border-brand-primary/50 hover:bg-slate-800/40"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Icon className="h-4 w-4 text-brand-primary shrink-0" />
                <span className="text-xs font-bold text-slate-200 truncate">{label}</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-brand-primary shrink-0" />
            </Link>
          ))}
      </div>
    </div>
  );
}
