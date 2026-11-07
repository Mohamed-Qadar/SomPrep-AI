import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { teacherApi } from "../../services/endpoints";
import LoadingState from "../../components/LoadingState";
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  BarChart2,
  Calendar,
  HelpCircle,
  Eye,
  ToggleLeft,
  Settings,
} from "lucide-react";

export default function TeacherExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await teacherApi.exams();
      setExams(res.data);
    } catch (err) {
      console.error("Error loading teacher exams:", err);
      setError("Waxaa dhacay qalad intii lagu jiray soo dejinta imtixaanada.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm("Ma hubtaa inaad rabto inaad tirto imtixaankan? Tallaabadan dib looma soo celin karo.");
    if (!confirm) return;

    try {
      setError("");
      setSuccess("");
      await teacherApi.deleteExam(id);
      setExams((prev) => prev.filter((e) => e.id !== id));
      setSuccess("Imtixaanka waa la tirtiray si guul leh!");
    } catch (err) {
      console.error("Error deleting exam:", err);
      setError("Ma suurtagelin in la tirtiro imtixaanka.");
    }
  };

  const handleToggleOpen = async (id) => {
    try {
      setError("");
      setSuccess("");
      const res = await teacherApi.toggleOpenExam(id);
      setExams((prev) =>
        prev.map((e) => (e.id === id ? res.data : e))
      );
      setSuccess("Xaaladda imtixaanka waa la beddelay si guul leh!");
    } catch (err) {
      console.error("Error toggling open:", err);
      setError("Ma suurtagelin in la beddelo xaaladda imtixaanka.");
    }
  };

  const handleToggleReview = async (id) => {
    try {
      setError("");
      setSuccess("");
      const res = await teacherApi.toggleReviewExam(id);
      setExams((prev) =>
        prev.map((e) => (e.id === id ? res.data : e))
      );
      setSuccess("Oggolaanshaha eegista dhibcaha waa la beddelay!");
    } catch (err) {
      console.error("Error toggling review:", err);
      setError("Ma suurtagelin in la beddelo oggolaanshaha eegista.");
    }
  };

  if (loading) {
    return <LoadingState label="Loading exams..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-border/60 pb-5">
        <div>
          <h1 className="font-outfit text-2xl font-black text-white flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-brand-primary" />
            <span>Maamulka Imtixaanada (My Exams)</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Samee imtixaanada maadooyinkaaga, eeg dhibcaha ardaydu keeneen, kuna maamul xaaladda imtixaanka halkan.
          </p>
        </div>
        <Link
          to="/teacher/exams/create"
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-lg hover:shadow-brand-primary/20 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Samee Imtixaan (Create Exam)</span>
        </Link>
      </div>

      {error && (
        <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-sm rounded-xl p-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-brand-success/10 border border-brand-success/20 text-brand-success text-sm rounded-xl p-4">
          {success}
        </div>
      )}

      {exams.length === 0 ? (
        <div className="glass-panel border border-brand-border rounded-2xl p-16 text-center shadow-xl">
          <FileSpreadsheet className="h-12 w-12 text-slate-650 mx-auto mb-3" />
          <p className="text-slate-400 text-sm mb-4">Ma jiraan imtixaano aad u diyaarisay ardayda weli.</p>
          <Link
            to="/teacher/exams/create"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:underline"
          >
            <span>Diyaari imtixaankii ugu horreeyay</span>
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="glass-panel border border-brand-border rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-border bg-slate-900/30 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="p-4 pl-6">Imtihanka (Exam Details)</th>
                  <th className="p-4">Su'aalo (Questions)</th>
                  <th className="p-4">Muddada</th>
                  <th className="p-4">Imtixaanku waa Furan yahay</th>
                  <th className="p-4">Ogolow Review</th>
                  <th className="p-4 pr-6 text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40 text-sm text-slate-350">
                {exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="p-4 pl-6">
                      <div>
                        <div className="font-semibold text-white leading-tight">{exam.title}</div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                          <span className="font-medium text-brand-indigo">{exam.subject}</span>
                          <span>·</span>
                          <span>Grade {exam.grade_level}</span>
                          <span>·</span>
                          <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-300">
                            {exam.exam_type || "test"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs font-semibold text-white">
                      {exam.questions?.length || 0} questions
                    </td>
                    <td className="p-4 font-mono text-xs">{exam.duration_minutes} mins</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleOpen(exam.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${
                          exam.is_open
                            ? "bg-brand-success/10 text-brand-success border-brand-success/20 hover:bg-brand-success/20"
                            : "bg-brand-danger/10 text-brand-danger border-brand-danger/20 hover:bg-brand-danger/20"
                        }`}
                      >
                        {exam.is_open ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            <span>Open</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            <span>Closed</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleReview(exam.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${
                          exam.allow_review
                            ? "bg-brand-indigo/10 text-brand-indigo border-brand-indigo/20 hover:bg-brand-indigo/20"
                            : "bg-slate-900 text-slate-500 border-slate-700 hover:text-white"
                        }`}
                      >
                        {exam.allow_review ? "Allowed" : "Blocked"}
                      </button>
                    </td>
                    <td className="p-4 pr-6 text-right shrink-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/teacher/exams/${exam.id}/results`}
                          className="rounded-lg p-2 text-slate-400 hover:text-brand-success hover:bg-brand-success/10 transition-colors flex items-center gap-1 text-xs font-semibold"
                          title="View Results"
                        >
                          <BarChart2 className="h-4 w-4" />
                          <span>Results</span>
                        </Link>
                        <button
                          onClick={() => handleDelete(exam.id)}
                          className="rounded-lg p-2 text-slate-500 hover:text-brand-danger hover:bg-brand-danger/10 transition-colors"
                          title="Delete Exam"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
