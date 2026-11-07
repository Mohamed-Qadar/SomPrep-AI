import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { lmsApi } from "../../services/endpoints";
import LoadingState from "../../components/LoadingState";
import {
  Sparkles,
  Video,
  FileSpreadsheet,
  Users,
  Trophy,
  Activity,
  ArrowRight,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalVideos: 0,
    totalExams: 0,
    totalSubmissions: 0,
    avgScore: 0,
    studentsReached: 0,
  });
  const [recentAttempts, setRecentAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // One aggregated backend call (replaces the old per-exam N+1 requests).
      const res = await lmsApi.analytics();
      const a = res.data;
      setStats({
        totalCourses: a.total_courses,
        totalVideos: a.total_videos,
        totalExams: a.total_exams,
        totalSubmissions: a.submitted_attempts,
        avgScore: Math.round(a.average_score),
        studentsReached: a.students_reached,
      });
      setRecentAttempts(a.recent_attempts);
    } catch (err) {
      console.error("Error loading teacher dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading dashboard stats..." />;
  }

  const statCards = [
    {
      label: "Koorsooyinka (Courses)",
      value: stats.totalCourses,
      desc: "Structured courses built",
      icon: Video,
      color: "from-blue-600/20 to-blue-500/10 border-blue-500/20 text-blue-400",
      to: "/teacher/courses",
    },
    {
      label: "Imtixaanada (Exams)",
      value: stats.totalExams,
      desc: "Active online tests",
      icon: FileSpreadsheet,
      color: "from-brand-indigo/20 to-indigo-500/10 border-brand-indigo/20 text-brand-indigo",
      to: "/teacher/exams",
    },
    {
      label: "Ardayda (Students Reached)",
      value: stats.studentsReached,
      desc: `${stats.totalSubmissions} attempts submitted`,
      icon: Users,
      color: "from-emerald-600/20 to-emerald-500/10 border-brand-emerald/20 text-brand-emerald",
      to: "/teacher/students",
    },
    {
      label: "Celceliska Dhibcaha (Avg Score)",
      value: `${stats.avgScore}%`,
      desc: "Average score across tests",
      icon: Trophy,
      color: "from-amber-600/20 to-amber-500/10 border-amber-500/20 text-amber-400",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-border bg-slate-900/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-brand-primary/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-indigo/10 border border-brand-indigo/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-indigo">
              <Sparkles className="h-3 w-3 animate-pulse" />
              <span>SomPrep AI Teacher Workspace</span>
            </div>
            <h1 className="font-outfit text-3xl font-black text-white sm:text-4xl">
              Ku soo dhowow, Macallin {user?.full_name}!
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Maamul imtixaanadaada, fiidiyowyadaada, iyo dhibcaha ardaydaada. AI coach-keenu wuxuu diyaar u yahay inuu caawiyo ardayda.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/teacher/exams"
              className="flex items-center gap-1.5 rounded-xl bg-brand-primary hover:bg-blue-600 px-5 py-3 text-xs font-bold text-white transition-all shadow-md hover:shadow-brand-primary/20"
            >
              <span>Samee Imtixaan (Create Exam)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          const body = (
            <div
              className={`rounded-2xl border bg-gradient-to-br p-6 shadow-lg backdrop-blur-xl flex justify-between items-start transition hover:brightness-110 ${card.color}`}
            >
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">{card.label}</span>
                <span className="text-3xl font-black text-white font-mono block">{card.value}</span>
                <span className="text-[11px] text-slate-500 block">{card.desc}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-brand-border">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
          return card.to ? (
            <Link key={idx} to={card.to}>{body}</Link>
          ) : (
            <React.Fragment key={idx}>{body}</React.Fragment>
          );
        })}
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent student activity log */}
        <div className="lg:col-span-2 glass-panel border border-brand-border rounded-2xl p-6 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-brand-primary" />
              <h2 className="font-outfit text-lg font-bold text-white">Dhaqdhaqaaqa Imtixaanada (Recent Activity)</h2>
            </div>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </div>

          {recentAttempts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <Clock className="h-10 w-10 text-slate-600 mb-2" />
              <p className="text-slate-400 text-sm">Ardaydu weli ma bilaabin wax imtixaano ah.</p>
            </div>
          ) : (
            <div className="divide-y divide-brand-border/40">
              {recentAttempts.map((attempt) => (
                <div key={attempt.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand-indigo/15 border border-brand-indigo/25 flex items-center justify-center text-brand-indigo font-bold text-xs uppercase">
                      {attempt.student_name?.charAt(0) || "S"}
                    </div>
                    <div>
                      <span className="font-semibold text-white text-sm block">{attempt.student_name}</span>
                      <span className="text-xs text-slate-500 block">
                        Attempted: <span className="text-slate-400">{attempt.exam_title}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-mono font-bold block ${
                      (attempt.score || 0) >= 70 ? "text-brand-success" : "text-brand-danger"
                    }`}>
                      {attempt.score !== null ? `${Math.round(attempt.score)}%` : "In Progress"}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {attempt.submitted_at 
                        ? new Date(attempt.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) 
                        : "Ongoing"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick info panel */}
        <div className="glass-panel border border-brand-border rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="font-outfit text-lg font-bold text-white">Xogta Macallinka (Your Profile)</h2>
          <div className="space-y-3 pt-2 text-sm">
            <div className="flex justify-between py-2 border-b border-brand-border/40">
              <span className="text-slate-400">Maaddada:</span>
              <span className="font-semibold text-brand-indigo">{user?.subject || "Not set"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-brand-border/40">
              <span className="text-slate-400">Iskoolka:</span>
              <span className="font-semibold text-white">{user?.school || "Not set"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-brand-border/40">
              <span className="text-slate-400">Taleefanka:</span>
              <span className="font-mono text-slate-300">{user?.phone_number}</span>
            </div>
          </div>
          <div className="pt-4">
            <Link
              to="/teacher/profile"
              className="block text-center rounded-xl border border-brand-border hover:border-white py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-all"
            >
              Beddel Macluumaadka (Edit Profile)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
