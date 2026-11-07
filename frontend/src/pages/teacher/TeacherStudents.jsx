import React, { useEffect, useMemo, useState } from "react";
import { lmsApi } from "../../services/endpoints";
import LoadingState from "../../components/LoadingState";
import { getPackageLabel } from "../../utils/packageLabels";
import { Users, Search, Trophy, Clock } from "lucide-react";

export default function TeacherStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");

  useEffect(() => {
    lmsApi.students()
      .then((res) => setStudents(res.data))
      .catch((err) => {
        console.error("Failed to load students:", err);
        setError("Ardayda lama soo rari karin. (Could not load students.)");
      })
      .finally(() => setLoading(false));
  }, []);

  const grades = useMemo(
    () => Array.from(new Set(students.map((s) => s.grade_level))).sort((a, b) => a - b),
    [students]
  );

  const filtered = students.filter((s) => {
    const matchesGrade = gradeFilter === "all" || s.grade_level === parseInt(gradeFilter, 10);
    const q = query.toLowerCase();
    const matchesQuery = !q || s.full_name.toLowerCase().includes(q) || s.phone_number.includes(q);
    return matchesGrade && matchesQuery;
  });

  if (loading) return <LoadingState label="Loading students..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-black font-outfit text-white">
          <Users className="h-5 w-5 text-brand-primary" />
          Ardaydayda (My Students)
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Ardayda fasallada aad wax ka dhigto, horumarkooda imtixaanadaada, iyo xaaladda package-kooda.
        </p>
      </div>

      {error && <p className="text-sm text-brand-danger">{error}</p>}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            placeholder="Search by name or phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-brand-border bg-slate-900 py-2.5 pl-10 pr-4 text-xs text-white focus:border-brand-primary focus:outline-none"
          />
        </div>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="rounded-xl border border-brand-border bg-slate-900 py-2.5 px-4 text-xs text-white focus:border-brand-primary focus:outline-none"
        >
          <option value="all">All grades</option>
          {grades.map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-brand-border bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-border bg-slate-950/40 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4 pl-5">Student</th>
                <th className="p-4">Grade</th>
                <th className="p-4">Package</th>
                <th className="p-4">My-Exam Attempts</th>
                <th className="p-4">Avg Score</th>
                <th className="p-4 pr-5">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40 text-xs text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No students match this filter.</td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="p-4 pl-5">
                      <div className="font-bold text-white">{s.full_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{s.phone_number}</div>
                    </td>
                    <td className="p-4 font-semibold">Grade {s.grade_level}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        s.package_active
                          ? "bg-brand-success/10 text-brand-success"
                          : "bg-slate-700/40 text-slate-400"
                      }`}>
                        {s.package_active ? getPackageLabel(s.package_type) : "No active package"}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold">{s.attempts_count}</td>
                    <td className="p-4">
                      {s.average_score != null ? (
                        <span className="flex items-center gap-1 font-black text-indigo-300">
                          <Trophy className="h-3 w-3" /> {s.average_score}%
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-4 pr-5 text-slate-500">
                      {s.last_activity ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(s.last_activity).toLocaleDateString()}
                        </span>
                      ) : "—"}
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
