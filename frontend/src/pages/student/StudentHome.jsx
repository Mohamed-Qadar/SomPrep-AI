import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Star,
  Play,
  Zap,
  Flame,
  Trophy,
  Brain,
  Check,
  BookOpen,
  TrendingUp,
  Tv,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Shield,
  Loader2
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { aiCoachApi, examsApi, studentTeacherExamsApi } from "../../services/endpoints";
import { dashboardTechnologyCards } from "../../data/technologySkills";
import { getPackageLabel } from "../../utils/packageLabels";

export default function StudentHome() {
  const navigate = useNavigate();
  const { user, subscriptionActive } = useAuth();

  const [roadmap, setRoadmap] = useState([]);
  const [coach, setCoach] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [_readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Teacher Exams
  const [teacherExams, setTeacherExams] = useState([]);
  const [teacherAttempts, setTeacherAttempts] = useState([]);

  // Accordion state for roadmap preview (first 2 subjects)
  const [expandedCats, setExpandedCats] = useState({});

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    const [roadmapRes, attemptsRes, coachRes, readinessRes, teacherExamsRes, teacherAttemptsRes] = await Promise.allSettled([
      examsApi.roadmap(),
      examsApi.attempts(),
      aiCoachApi.brief(),
      examsApi.readiness(),
      studentTeacherExamsApi.exams(),
      studentTeacherExamsApi.myAttempts(),
    ]);

    if (roadmapRes.status === "fulfilled") {
      const data = roadmapRes.value.data;
      setRoadmap(data);
      // Expand first 2 categories by default in preview
      const init = {};
      data.slice(0, 2).forEach((cat) => {
        init[cat.id] = false; // start collapsed as accordion style
      });
      setExpandedCats(init);
    }
    if (attemptsRes.status === "fulfilled") setAttempts(attemptsRes.value.data);
    if (coachRes.status === "fulfilled") setCoach(coachRes.value.data);
    if (readinessRes.status === "fulfilled") setReadiness(readinessRes.value.data);
    if (teacherExamsRes.status === "fulfilled") setTeacherExams(teacherExamsRes.value.data);
    if (teacherAttemptsRes.status === "fulfilled") setTeacherAttempts(teacherAttemptsRes.value.data);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const toggleCat = (id) => setExpandedCats((p) => ({ ...p, [id]: !p[id] }));

  // Helper: Node click
  const handleNodeClick = (catId, sub) => {
    if (!user?.package_active) {
      navigate("/paywall?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!sub.is_video_completed) {
      navigate(`/video/${sub.id}`);
    } else {
      navigate(`/exam/${catId}?subtopicId=${sub.id}&name=${encodeURIComponent(sub.name)}`);
    }
  };

  // Metrics
  const allSubs = roadmap.flatMap((c) => c.topics.flatMap((t) => t.subtopics));
  const completedSubs = allSubs.filter((s) => s.is_completed).length;
  const totalSubs = allSubs.length;
  const streak = user?.current_streak ?? 0;

  const getWeakestSubject = () => {
    if (!attempts || attempts.length === 0) return "Nil";
    const subjectMap = {};
    attempts.forEach((att) => {
      const subName = att.category?.name || att.subtopic?.category?.name || "General";
      if (!subjectMap[subName]) {
        subjectMap[subName] = { total: 0, count: 0 };
      }
      subjectMap[subName].total += att.score;
      subjectMap[subName].count += 1;
    });
    let weakest = null;
    let minAvg = 101;
    Object.keys(subjectMap).forEach((name) => {
      const avg = subjectMap[name].total / subjectMap[name].count;
      if (avg < minAvg) {
        minAvg = avg;
        weakest = name;
      }
    });
    return weakest ? weakest : "None";
  };

  // Coach parsing
  const coachBody = coach?.coach_message?.replace("=== KOOCHKA AI: REFIK ===\n\n", "") || "";
  const splitIdx = coachBody.indexOf("─────────────────────");
  const coachSomali = splitIdx >= 0 ? coachBody.slice(0, splitIdx).trim() : coachBody;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
          <p className="mt-4 text-xs text-slate-400 font-semibold">Guddiga waxbarashada waa la soo rarayaa...</p>
        </div>
      </div>
    );
  }

  if (user?.package_active === false) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-12">
        <div className="rounded-3xl border border-red-500/25 bg-[#2d121b]/40 p-8 text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl" />
          <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 text-3xl mx-auto shrink-0">
            🔒
          </div>
          <div className="space-y-2">
            <h3 className="font-outfit text-xl font-bold text-white">Xaaladda Biilkaagu waa dhacday</h3>
            <p className="text-sm text-slate-350 font-semibold">
              Package-kaaga cusboonsii si aad u hesho dhammaan casharada iyo imtixaanada!
            </p>
            <p className="text-xs text-slate-500 font-medium">
              Your package has expired. Please renew your package to regain full access to learning materials.
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard/profile")}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-6 py-3.5 text-xs font-bold text-white transition active:scale-[0.98] shadow-lg shadow-red-600/20"
          >
            <span>Renew Package (Cusboonsii Package)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* SECTION 1: HERO WELCOME CARD */}
      <div className="rounded-3xl bg-gradient-to-r from-[#1c0f38] to-[#120826] border border-indigo-950/60 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Ku soo dhowow Portal-ka Ardayga
          </span>
          <h2 className="text-2xl font-black font-outfit text-white">Ku soo dhowow, {user?.full_name}!</h2>
          <p className="text-xs text-slate-400 font-medium">
            Class Level {user?.grade_level || 12} · {subscriptionActive ? getPackageLabel(user?.package_type) : "No active package"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/dashboard/exams")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition active:scale-[0.98] shadow-lg shadow-indigo-600/25"
          >
            <Trophy className="h-4 w-4" />
            <span>Start Mock Exam</span>
          </button>
          <button
            onClick={() => navigate("/dashboard/exams")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
          >
            <span>Mock Center</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Exams Completed */}
        <div className="rounded-2xl bg-[#130b24] border border-slate-800/80 p-5 flex flex-col justify-between shadow-md">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exams Completed</span>
            <span className="block text-2xl font-extrabold text-white mt-1.5">{attempts.length}</span>
          </div>
          <div className="mt-4 space-y-1">
            <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-500"
                style={{ width: `${Math.min((attempts.length / 20) * 100, 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-500 font-semibold block">Target: 20 completed exams</span>
          </div>
        </div>

        {/* Card 2: Study Streak */}
        <div className="rounded-2xl bg-[#130b24] border border-slate-800/80 p-5 flex flex-col justify-between shadow-md">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Study Streak</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-2xl font-extrabold text-amber-400">{streak}</span>
              <span className="text-xs text-slate-400 font-semibold">days</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg w-fit">
            <Flame className="h-3.5 w-3.5" />
            <span>Keep the fire burning!</span>
          </div>
        </div>

        {/* Card 3: Subjects Progress */}
        <div className="rounded-2xl bg-[#130b24] border border-slate-800/80 p-5 flex flex-col justify-between shadow-md">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Concept Progress</span>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-2xl font-extrabold text-emerald-400">
                {completedSubs}/{totalSubs || 0}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Nodes</span>
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${totalSubs > 0 ? (completedSubs / totalSubs) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Weakest Subject */}
        <div className="rounded-2xl bg-[#130b24] border border-slate-800/80 p-5 flex flex-col justify-between shadow-md">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weakest Area</span>
            <span className="block text-sm font-extrabold text-red-400 mt-2 truncate max-w-full">
              {getWeakestSubject()}
            </span>
          </div>
          <div className="mt-4">
            <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg block w-fit">
              Needs Concept Review
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: AI COACH REFIK */}
      {coach && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/10 p-6 flex flex-col md:flex-row gap-5 items-start justify-between">
          <div className="flex gap-4 items-start">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-2xl animate-coach-bob shrink-0">
              🚀
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">AI Coach Refik Insight</span>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line max-w-2xl">
                {coachSomali}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/dashboard/ai-coach")}
            className="w-full md:w-auto shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-500/35 bg-indigo-600/10 hover:bg-indigo-600/20 text-xs font-bold text-indigo-300 transition"
          >
            <span>Get AI Advice</span>
          </button>
        </div>
      )}

      {/* SECTION 4: TEACHER-ASSIGNED EXAMS */}
      {teacherExams && teacherExams.filter(exam => exam.grade_level === user?.grade_level).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-400" />
            <h3 className="font-outfit text-base font-extrabold text-white">
              Imtixaanada Macallinka · Teacher Exams
            </h3>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {teacherExams.filter(exam => exam.grade_level === user?.grade_level).map((exam) => {
              const attempt = teacherAttempts.find((att) => att.exam_id === exam.id);
              const isCompleted = attempt && attempt.submitted_at;
              const isInProgress = attempt && !attempt.submitted_at;

              return (
                <div
                  key={exam.id}
                  className="min-w-[280px] w-[280px] rounded-2xl border border-slate-800 bg-[#130b24] p-5 flex flex-col justify-between gap-4 shadow-md shrink-0 hover:border-indigo-500/30 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {exam.subject}
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold">
                        {exam.duration_minutes} Mins
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white line-clamp-1">
                      {exam.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Assigned by: School Faculty
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-850">
                    <div>
                      {isCompleted ? (
                        <span className="text-[10px] font-bold text-emerald-400">
                          Score: {attempt.score.toFixed(0)}%
                        </span>
                      ) : isInProgress ? (
                        <span className="text-[10px] font-bold text-amber-400 animate-pulse">
                          In Progress
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">
                          Not Started
                        </span>
                      )}
                    </div>

                    <div>
                      {isCompleted ? (
                        <button
                          onClick={() => navigate(`/results/${attempt.id}?type=teacher`)}
                          className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white transition"
                        >
                          Review
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/exam/teacher/${exam.id}`)}
                          className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold text-white transition ${
                            isInProgress
                              ? "bg-amber-500 hover:bg-amber-600"
                              : "bg-indigo-500 hover:bg-indigo-600"
                          }`}
                        >
                          {isInProgress ? "Continue" : "Start Exam"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 5: TECHNOLOGY SKILLS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Tv className="h-5 w-5 text-indigo-400" />
          <h3 className="font-outfit text-base font-extrabold text-white">
            Practical Digital Learning · Xirfadaha
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboardTechnologyCards.map((card, index) => {
            const Icon = [Tv, Trophy, Sparkles, Brain][index] || Tv;
            return (
              <div
                key={card.title}
                className="rounded-2xl border border-slate-800 bg-[#130b24] p-5 flex flex-col justify-between gap-4 shadow-md hover:border-indigo-500/20 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-bold text-white">{card.title}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    {card.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    Interactive Modules
                  </span>
                  <button
                    onClick={() => navigate(card.path)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-[10px] font-bold text-indigo-300 transition"
                  >
                    <span>Start Track</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 6: CONCEPT ROADMAP PREVIEW */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            <h3 className="font-outfit text-base font-extrabold text-white">
              Concept Roadmap Preview
            </h3>
          </div>
          <button
            onClick={() => navigate("/dashboard/roadmap")}
            className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
          >
            <span>View Full Roadmap</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {roadmap.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-8 text-center text-slate-500 text-xs">
            No subjects loaded.
          </div>
        ) : (
          <div className="space-y-3">
            {roadmap.slice(0, 2).map((cat) => (
              <div key={cat.id} className="rounded-2xl border border-slate-800 bg-[#130b24] overflow-hidden">
                <button
                  onClick={() => toggleCat(cat.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/10 transition text-left"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>📚</span>
                      {cat.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-none">{cat.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-bold text-slate-500 border border-slate-850 rounded-lg px-2 py-0.5 bg-slate-900/40">
                      Grade {cat.grade_level}
                    </span>
                    {expandedCats[cat.id] ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </button>

                {expandedCats[cat.id] && (
                  <div className="border-t border-slate-850 px-5 py-4 space-y-3 bg-[#0c031a]/25">
                    {cat.topics.map((topic) => (
                      <div key={topic.id} className="space-y-2">
                        <div className="border-l-2 border-indigo-500/50 pl-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                            {topic.name}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {topic.subtopics.map((sub, sIdx) => {
                            const isDone = sub.is_completed;
                            const isLocked = !sub.is_unlocked;
                            return (
                              <div
                                key={sub.id}
                                onClick={() => !isLocked && handleNodeClick(cat.id, sub)}
                                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                                  isDone
                                    ? "border-emerald-500/20 bg-emerald-950/5 hover:bg-emerald-950/10"
                                    : isLocked
                                    ? "border-slate-900 bg-slate-900/20 opacity-50 cursor-not-allowed"
                                    : "border-indigo-500/20 bg-indigo-950/5 hover:border-indigo-500/30"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-white truncate">{sub.name}</p>
                                  <p className="text-[9px] text-slate-500 mt-0.5">
                                    Videos: {sub.video_completed_count}/{sub.total_videos_count}
                                  </p>
                                </div>
                                <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                                  isDone ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-500/10 text-indigo-400"
                                }`}>
                                  {isDone ? <Check className="h-3 w-3" /> : <Play className="h-2.5 w-2.5 fill-indigo-400" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
