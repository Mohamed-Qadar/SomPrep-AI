import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { teacherApi } from "../../services/endpoints";
import LoadingState from "../../components/LoadingState";
import {
  ArrowLeft,
  Users,
  Trophy,
  Activity,
  BarChart2,
  Calendar,
  Clock,
  ExternalLink,
} from "lucide-react";

export default function ExamResults() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    avgScore: 0,
    highScore: 0,
    lowScore: 0,
  });

  useEffect(() => {
    fetchResults();
  }, [examId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const res = await teacherApi.examResults(examId);
      const data = res.data;
      setResults(data);

      if (data.length > 0) {
        const scores = data.map((d) => d.score || 0);
        const total = scores.reduce((acc, curr) => acc + curr, 0);
        const avg = total / data.length;
        const max = Math.max(...scores);
        const min = Math.min(...scores);

        setStats({
          totalSubmissions: data.length,
          avgScore: Math.round(avg),
          highScore: Math.round(max),
          lowScore: Math.round(min),
        });
      }
    } catch (err) {
      console.error("Error loading exam results:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading exam statistics..." />;
  }

  const statCards = [
    {
      label: "Isku dayada (Attempts)",
      value: stats.totalSubmissions,
      icon: Users,
      color: "from-blue-600/20 to-blue-500/10 border-blue-500/20 text-blue-400",
    },
    {
      label: "Celceliska Dhibcaha",
      value: `${stats.avgScore}%`,
      icon: BarChart2,
      color: "from-brand-indigo/20 to-indigo-500/10 border-brand-indigo/20 text-brand-indigo",
    },
    {
      label: "Dhibcaha ugu Sareeya",
      value: `${stats.highScore}%`,
      icon: Trophy,
      color: "from-emerald-600/20 to-emerald-500/10 border-brand-emerald/20 text-brand-emerald",
    },
    {
      label: "Dhibcaha ugu Hooseeya",
      value: `${stats.lowScore}%`,
      icon: Activity,
      color: "from-amber-600/20 to-amber-500/10 border-amber-500/20 text-amber-400",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-brand-border/60 pb-5">
        <button
          onClick={() => navigate("/teacher/exams")}
          className="rounded-lg p-2 hover:bg-slate-800 border border-transparent hover:border-brand-border transition-all text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-outfit text-2xl font-black text-white">Natiijada Imtixaanka (Exam Performance)</h1>
          <p className="text-slate-500 text-xs mt-0.5">Eeg sida ay ardaydu u qabteen imtixaankan.</p>
        </div>
      </div>

      {/* Stats Cards */}
      {results.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className={`rounded-2xl border bg-gradient-to-br p-6 shadow-lg backdrop-blur-xl flex justify-between items-start ${card.color}`}
              >
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">{card.label}</span>
                  <span className="text-3xl font-black text-white font-mono block">{card.value}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-brand-border">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel border border-brand-border rounded-2xl p-16 text-center shadow-xl">
          <Users className="h-12 w-12 text-slate-650 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Ma jiraan arday weli u fariisatay imtixaankan.</p>
        </div>
      )}

      {/* Attempts Table */}
      {results.length > 0 && (
        <div className="glass-panel border border-brand-border rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-brand-border/60 bg-slate-900/20">
            <h2 className="font-outfit text-lg font-bold text-white">Natiijooyinka Ardayda (Student Submissions)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-border bg-slate-900/30 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="p-4 pl-6">Ardayga (Student)</th>
                  <th className="p-4">Taariikhda (Submitted At)</th>
                  <th className="p-4">Muddada (Time Spent)</th>
                  <th className="p-4">Dhibcaha (Score)</th>
                  <th className="p-4 pr-6 text-right">Xaaladda (Status)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40 text-sm text-slate-350">
                {results.map((r) => {
                  const minutes = Math.floor(r.time_spent_seconds / 60);
                  const seconds = r.time_spent_seconds % 60;
                  return (
                    <tr key={r.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-brand-indigo/15 border border-brand-indigo/25 flex items-center justify-center text-brand-indigo font-bold text-xs uppercase">
                            {r.student_name?.charAt(0) || "S"}
                          </div>
                          <div>
                            <span className="font-semibold text-white block">{r.student_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs">
                        {r.submitted_at 
                          ? new Date(r.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) 
                          : "Ongoing"}
                      </td>
                      <td className="p-4 font-mono text-xs">
                        {minutes}m {seconds}s
                      </td>
                      <td className={`p-4 font-mono font-bold ${(r.score || 0) >= 70 ? "text-brand-success" : "text-brand-danger"}`}>
                        {r.score !== null ? `${Math.round(r.score)}%` : "N/A"}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          r.submitted_at
                            ? "bg-brand-success/10 text-brand-success border-brand-success/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}>
                          {r.submitted_at ? "Completed" : "In Progress"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
