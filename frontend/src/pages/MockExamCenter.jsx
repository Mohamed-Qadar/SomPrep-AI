import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { examsApi } from "../services/endpoints";
import { useAuth } from "../context/AuthContext";
import PackageGate from "../components/PackageGate";
import {
  ShieldAlert,
  ArrowLeft,
  Clock,
  Award,
  BookOpen,
  ChevronRight,
  TrendingUp,
  Brain,
  FileText
} from "lucide-react";

export default function MockExamCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mockExams, setMockExams] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedMode, setSelectedMode] = useState("full"); // "full", "subject", "weakness", "challenge"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch readiness, mock exams, and categories in parallel
        const [examsRes, readinessRes, categoriesRes] = await Promise.all([
          examsApi.mockExams(),
          examsApi.readiness(),
          examsApi.categories()
        ]);
        setMockExams(examsRes.data);
        setReadiness(readinessRes.data);
        setCategories(categoriesRes.data || []);
      } catch (err) {
        console.error("Error fetching mock data:", err);
        setError("Ma suurtagelin in la soo rogo xogta imtixaanada. (Failed to load mock exams data).");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <PackageGate grade={user?.grade_level}>
      <div className="min-h-screen bg-[#0f172a] text-white font-sans">
      {/* Background Glows */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[36rem] w-[36rem] rounded-full bg-indigo-500/[0.05] blur-[120px]" />
      <div className="pointer-events-none absolute top-[40%] -right-48 h-[36rem] w-[36rem] rounded-full bg-emerald-500/[0.03] blur-[120px]" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#334155] bg-[#0f172a]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 rounded-xl border border-[#334155] bg-[#1e293b]/60 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Ku Laabo Dashboard</span>
          </button>
          <span className="font-outfit text-lg font-extrabold tracking-tight">
            SomPrep <span className="text-indigo-400">AI Mock Center</span>
          </span>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Title */}
        <div>
          <h1 className="font-outfit text-3xl font-extrabold text-white leading-tight">
            National Exam Simulation Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Experience realistic examination conditions aligned with unified Somali education tracks.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-950/40 p-4 text-xs text-red-400 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Readiness Dashboard Panel */}
        {readiness && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 rounded-3xl border border-[#334155] bg-[#1e293b]/30 p-6 sm:p-8">
            {/* Left dial widget */}
            <div className="flex flex-col items-center justify-center text-center space-y-3 md:border-r border-[#334155] md:pr-8">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Exam Readiness Score
              </span>
              <div className="relative flex h-32 w-32 items-center justify-center">
                {/* SVG circular dial background */}
                <svg className="absolute inset-0 h-full w-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    className="stroke-[#0f172a] fill-none stroke-[8]"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    className="stroke-indigo-500 fill-none stroke-[8] transition-all duration-1000"
                    strokeDasharray={2 * Math.PI * 54}
                    strokeDashoffset={2 * Math.PI * 54 * (1 - readiness.readiness_score / 100)}
                  />
                </svg>
                <span className="font-outfit text-3xl font-black text-white">
                  {readiness.readiness_score}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500 max-w-[200px]">
                Computed from syllabus mastery progress & mock average score indices.
              </p>
            </div>

            {/* Middle metrics grid */}
            <div className="grid grid-cols-2 gap-4 items-center md:px-8">
              <div className="rounded-2xl bg-[#0f172a]/50 p-4 border border-[#334155]">
                <TrendingUp className="h-5 w-5 text-indigo-400 mb-2" />
                <span className="block text-2xl font-black text-white">{readiness.syllabus_progress}%</span>
                <span className="text-[10px] text-slate-500">Syllabus Completion</span>
              </div>
              <div className="rounded-2xl bg-[#0f172a]/50 p-4 border border-[#334155]">
                <Brain className="h-5 w-5 text-emerald-400 mb-2" />
                <span className="block text-2xl font-black text-white">{readiness.mock_average}%</span>
                <span className="text-[10px] text-slate-500">Mock Exam Average</span>
              </div>
            </div>

            {/* Right details / status list */}
            <div className="flex flex-col justify-center space-y-4 md:pl-8">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-[#334155]">
                <span className="text-slate-400">Total Subtopics:</span>
                <span className="font-bold text-white">{readiness.total_subtopics}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-[#334155]">
                <span className="text-slate-400">Completed Nodes:</span>
                <span className="font-bold text-emerald-400">{readiness.completed_subtopics}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Simulations Completed:</span>
                <span className="font-bold text-indigo-400">{readiness.mock_exams_taken}</span>
              </div>
            </div>
          </div>
        )}

        {/* Mock Exam Selector Tabs & Grid */}
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
            {[
              { id: "full", label: "Full Mock Exam", desc: "120 Mins · Blueprint based" },
              { id: "subject", label: "Subject Practice", desc: "20 Questions · Focused" },
              { id: "weakness", label: "Weakness Revise", desc: "Retry wrong answers" },
              { id: "challenge", label: "Timed Challenge", desc: "10 Questions · 10 Mins" }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`flex-1 min-w-[140px] text-center p-3.5 rounded-xl border transition-all duration-200 active:scale-[0.98] ${
                  selectedMode === mode.id
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                    : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-white"
                }`}
              >
                <span className="block text-xs font-bold">{mode.label}</span>
                <span className="block text-[9px] text-slate-500 mt-0.5">{mode.desc}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : selectedMode === "full" ? (
            mockExams.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#334155] p-12 text-center text-slate-400">
                <FileText className="h-12 w-12 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-semibold">Maya wax imtixaan ah oo diyaar ah.</p>
                <p className="text-xs text-slate-500">No mock exams match your selected region and grade.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="rounded-3xl border border-[#334155] bg-[#1e293b]/40 p-6 flex flex-col justify-between hover:border-slate-500 transition-all duration-300 shadow-lg"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 px-2.5 py-1 rounded-lg">
                          {exam.regional_board} Track
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{exam.duration_minutes} Mins</span>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-outfit text-base font-bold text-white leading-snug">
                          {exam.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Mock Exam for Grade {exam.grade_level} National Curriculums.
                        </p>
                      </div>
                    </div>

                    <div className="pt-6">
                      <button
                        onClick={() => navigate(`/exam/mock/${exam.id}`)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-500/10 transition active:scale-[0.98]"
                      >
                        <span>Start Simulation Exam</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : selectedMode === "subject" ? (
            categories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#334155] p-12 text-center text-slate-400">
                <FileText className="h-12 w-12 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-semibold">Ma jiraan maaddooyin diyaar ah.</p>
                <p className="text-xs text-slate-500">No subjects matches your level.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="rounded-3xl border border-[#334155] bg-[#1e293b]/40 p-6 flex flex-col justify-between hover:border-slate-500 transition-all duration-300 shadow-lg"
                  >
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 px-2 py-0.5 rounded-lg">
                        Grade {cat.grade_level} Subject
                      </span>
                      <h3 className="font-outfit text-base font-bold text-white leading-snug">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-slate-450 mt-1 line-clamp-2">
                        {cat.description || "Casharo iyo su'aalo tijaabo ah oo ku saabsan maaddadan."}
                      </p>
                    </div>
                    <div className="pt-6">
                      <button
                        onClick={() => navigate(`/exam/${cat.id}`)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 py-3 text-xs font-bold text-white transition active:scale-[0.98]"
                      >
                        <span>Start Subject Practice</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : selectedMode === "weakness" ? (
            <div className="max-w-xl mx-auto rounded-3xl border border-indigo-500/20 bg-[#1e293b]/40 p-8 text-center space-y-6 shadow-xl">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl shrink-0">
                📓
              </div>
              <div className="space-y-2">
                <h3 className="font-outfit text-lg font-bold text-white">Wrong Answer Revision Exam</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Engine-ka SomPrep AI wuxuu soo aruurinayaa dhammaan su'aalihii aad ku khaldantay imtixaannadii hore si aad mar kale isku tijaabiso oo aad u xaqiijiso inaad fahantay.
                </p>
              </div>
              <button
                onClick={() => navigate("/exam/weakness")}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-indigo-600 hover:from-red-600 hover:to-indigo-700 py-3.5 text-xs font-bold text-white shadow-lg transition active:scale-[0.98]"
              >
                <span>Start Weakness Revision Exam</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="max-w-xl mx-auto rounded-3xl border border-[#334155] bg-[#1e293b]/40 p-8 text-center space-y-6 shadow-xl">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center text-3xl shrink-0">
                ⚡
              </div>
              <div className="space-y-2">
                <h3 className="font-outfit text-lg font-bold text-white">Speed Timed Challenge</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tani waa imtixaan gaaban oo ka kooban 10 su'aalood oo kaliya, kuwaas oo lagaa rabo inaad ku xalliso muddo 10 daqiiqo ah. Wuxuu tijaabinayaa xawaarahaaga iyo saxnaantaaga.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 text-left">
                  Dooro Maaddada aad rabto:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => navigate(`/exam/${cat.id}?challenge=true`)}
                      className="p-3 text-left rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-xs font-bold text-slate-350 hover:text-white transition active:scale-[0.98]"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
    </PackageGate>
  );
}
