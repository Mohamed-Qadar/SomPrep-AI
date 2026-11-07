import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { studentTeacherExamsApi } from "../../services/endpoints";
import { downloadAuthenticatedFile } from "../../utils/downloadFile";
import {
  ClipboardList,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Loader2,
  FileSpreadsheet,
  Download,
  Award
} from "lucide-react";

export default function StudentTeacherExams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState("active"); // "active" or "history"

  const fetchExamsAndAttempts = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [examsRes, attemptsRes] = await Promise.all([
        studentTeacherExamsApi.exams(),
        studentTeacherExamsApi.myAttempts()
      ]);
      setExams(examsRes.data);
      setAttempts(attemptsRes.data);
    } catch (err) {
      console.error("Error loading student teacher exams:", err);
      setErrorMsg(
        "Kuma guuleysan in la soo raro imtixaanada macallinka. (Failed to load teacher exams.)"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExamsAndAttempts();
  }, [fetchExamsAndAttempts]);

  const handleDownloadMaterial = async (material) => {
    try {
      await downloadAuthenticatedFile(material.download_url, material.original_filename);
    } catch (err) {
      console.error("Material download failed:", err);
      setErrorMsg(
        "Agabka lama soo dejin karin. Hubi in package-kaagu firfircoon yahay. (Download failed — check your package is active.)"
      );
    }
  };

  // Split exams based on completed status
  const getCategorizedExams = () => {
    const activeList = [];
    const completedList = [];

    exams.forEach((exam) => {
      const attempt = attempts.find((att) => att.exam_id === exam.id);
      const isCompleted = attempt && attempt.submitted_at;
      
      if (isCompleted) {
        completedList.push({
          ...exam,
          attempt
        });
      } else {
        activeList.push({
          ...exam,
          attempt // might be undefined or in-progress
        });
      }
    });

    return { activeList, completedList };
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
          <p className="mt-4 text-xs text-slate-400 font-semibold">
            Imtixaanada Macallinka waa la soo rarayaa...
          </p>
        </div>
      </div>
    );
  }

  const { activeList, completedList } = getCategorizedExams();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-r from-[#1c0f38] to-[#120826] border border-indigo-950/60 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            School Exams
          </span>
          <h2 className="text-2xl font-black font-outfit text-white">
            Imtixaanada Macallinka (Teacher Exams)
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Halkan ka hel imtixaanada uu kuu soo asaydh-gareeyey macallinkaaga fasalku.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-4 flex items-center gap-3 text-red-400 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-850">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === "active"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Imtixaanada Furan (Active Exams - {activeList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2 ${
            activeTab === "history"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <CheckCircle className="h-4 w-4" />
          <span>Taariikhda Imtixaanada (History - {completedList.length})</span>
        </button>
      </div>

      {/* Content Area */}
      <div>
        {activeTab === "active" ? (
          activeList.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-12 text-center text-slate-500 text-xs space-y-2">
              <ClipboardList className="mx-auto h-12 w-12 text-slate-600" />
              <p className="font-bold text-slate-400">
                Laguma asign-gareyn wax imtixaan ah hadda.
              </p>
              <p className="text-[10px] text-slate-500">
                No teacher exams assigned to your grade level yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeList.map((exam) => {
                const isInProgress = exam.attempt && !exam.attempt.submitted_at;
                return (
                  <div
                    key={exam.id}
                    className="rounded-2xl border border-slate-800 bg-[#130b24] p-6 flex flex-col justify-between gap-5 shadow-md hover:border-indigo-500/20 transition duration-200"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {exam.subject}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{exam.duration_minutes} mins</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-white font-outfit">
                          {exam.title}
                          <span className="ml-2 align-middle rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-300">
                            {exam.exam_type || "test"}
                          </span>
                        </h4>
                        {exam.instructions && (
                          <p className="text-xs text-slate-400 mt-2 line-clamp-2 bg-slate-950/20 p-2.5 rounded-xl border border-slate-850/50 leading-relaxed">
                            {exam.instructions}
                          </p>
                        )}
                      </div>

                      {exam.materials?.length > 0 && (
                        <div className="rounded-xl border border-slate-850 bg-slate-950/25 p-3 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Study materials
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {exam.materials.map((material) => (
                              <button
                                key={material.id}
                                type="button"
                                onClick={() => handleDownloadMaterial(material)}
                                className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1.5 text-[10px] font-bold text-indigo-300 hover:bg-indigo-500/20"
                              >
                                <Download className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{material.original_filename}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-850">
                      <div className="flex items-center gap-1.5">
                        {isInProgress ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold animate-pulse">
                            In Progress
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-bold uppercase">
                            Open for attempt
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => navigate(`/exam/teacher/${exam.id}`)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition active:scale-[0.98] ${
                          isInProgress
                            ? "bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20"
                            : "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                        }`}
                      >
                        <span>{isInProgress ? "Sii Wad (Continue)" : "Bilow (Start Exam)"}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : completedList.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-12 text-center text-slate-500 text-xs space-y-2">
            <CheckCircle className="mx-auto h-12 w-12 text-slate-600" />
            <p className="font-bold text-slate-400">
              Ma jiro imtixaan aad dhamaysay weli.
            </p>
            <p className="text-[10px] text-slate-500">
              Your completed exams will appear here once submitted.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-[#130b24] overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/30 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Exam Title</th>
                    <th className="px-6 py-4">Submitted Date</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60 text-xs text-slate-300">
                  {completedList.map((exam) => {
                    const score = exam.attempt.score;
                    const dateStr = exam.attempt.submitted_at
                      ? new Date(exam.attempt.submitted_at).toLocaleDateString()
                      : "N/A";
                    
                    return (
                      <tr key={exam.id} className="hover:bg-slate-800/10 transition">
                        <td className="px-6 py-4 font-semibold">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px] font-bold">
                            {exam.subject}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-white">{exam.title}</td>
                        <td className="px-6 py-4 text-slate-400">{dateStr}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`font-black text-sm ${
                              score >= 80
                                ? "text-emerald-400"
                                : score >= 50
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}
                          >
                            {score.toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => navigate(`/results/${exam.attempt.id}?type=teacher`)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-[10px] font-bold text-slate-300 hover:text-white transition"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            <span>Dib u Eeg (Review)</span>
                          </button>
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
    </div>
  );
}
