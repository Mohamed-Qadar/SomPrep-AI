import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  LogOut,
  Star,
  Lock,
  Play,
  ChevronDown,
  ChevronUp,
  Zap,
  Flame,
  Trophy,
  Brain,
  AlertTriangle,
  Check,
  X,
  CreditCard,
  Phone,
  Loader2,
  BookOpen,
  TrendingUp,
  Tv,
  Settings,
  Cpu,
  Database,
  Code2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { aiCoachApi, authApi, examsApi, studentTeacherExamsApi } from "../services/endpoints";
import { dashboardTechnologyCards } from "../data/technologySkills";
import { packagesData } from "../data/packagesData";

function StarRating({ count, size = "sm" }) {
  const sz = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          className={`${sz} ${
            n <= count
              ? "text-amber-400 fill-amber-400 animate-star-glow"
              : "text-slate-700"
          }`}
        />
      ))}
    </div>
  );
}

function CoachAvatar({ mood }) {
  const configs = {
    celebration:    { emoji: "🏆", bg: "bg-emerald-500/20", border: "border-emerald-500/40" },
    strict_warning: { emoji: "📚", bg: "bg-amber-500/20",   border: "border-amber-500/40"   },
    focus_needed:   { emoji: "🎯", bg: "bg-indigo-500/20", border: "border-indigo-500/40" },
    motivational:   { emoji: "🚀", bg: "bg-indigo-500/20", border: "border-indigo-500/40" },
  };
  const c = configs[mood] || configs.motivational;
  return (
    <div className={`h-12 w-12 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center text-2xl animate-coach-bob shrink-0`}>
      {c.emoji}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, subscriptionActive, logout } = useAuth();

  const [roadmap, setRoadmap] = useState([]);
  const [coach, setCoach] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);

  // Teacher Exams
  const [teacherExams, setTeacherExams] = useState([]);
  const [teacherAttempts, setTeacherAttempts] = useState([]);
  
  // Dynamic profile updates
  const [selectedRegion, setSelectedRegion] = useState(user?.selected_region || "Federal");
  const [gradeLevel, setGradeLevel] = useState(user?.grade_level || 12);
  const [updatingProfile, setUpdatingProfile] = useState(false);

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
      const init = {};
      data.forEach((cat) => {
        init[cat.id] = true;
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

  // Sync region and grade level if user object updates
  useEffect(() => {
    if (user) {
      setSelectedRegion(user.selected_region);
      setGradeLevel(user.grade_level);
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      await authApi.updateProfile({
        selected_region: selectedRegion,
        grade_level: gradeLevel
      });
      setShowSwitcher(false);
      // Reload authentication user details in context
      window.location.reload();
    } catch (err) {
      console.error("Error updating profile tracker:", err);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleNodeClick = (catId, sub) => {
    if (!subscriptionActive) {
      navigate("/shop");
      return;
    }
    
    // Switch destinations: if video watch requirements are incomplete, view videos.
    // Otherwise, direct to the practice exam.
    if (!sub.is_video_completed) {
      navigate(`/video/${sub.id}`);
    } else {
      navigate(`/exam/${catId}?subtopicId=${sub.id}&name=${encodeURIComponent(sub.name)}`);
    }
  };

  // Computed metrics
  const allSubs = roadmap.flatMap((c) => c.topics.flatMap((t) => t.subtopics));
  const totalXP = user?.total_xp_points ?? 0;
  const streak = user?.current_streak ?? 0;
  const completedSubs = allSubs.filter((s) => s.is_completed).length;
  const totalSubs = allSubs.length;
  const totalStars = allSubs.reduce((acc, s) => acc + (s.stars_awarded || 0), 0);
  const currentPackagePrice = packagesData[user?.package_type || "academic"]?.annualPrice || packagesData.academic.annualPrice;

  const toggleCat = (id) => setExpandedCats((p) => ({ ...p, [id]: !p[id] }));

  const getWeakestSubject = () => {
    if (!attempts || attempts.length === 0) return "Nil · None";
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
    return weakest ? `${weakest} (${minAvg.toFixed(0)}%)` : "None";
  };

  const getLastMockScore = () => {
    const mockAttempts = attempts.filter((att) => att.mock_exam_id !== null);
    if (mockAttempts.length === 0) return "No mock taken";
    const latest = mockAttempts[0];
    return `${latest.score.toFixed(0)}%`;
  };

  const getRecommendedTask = () => {
    if (user?.grade_level === 8 || user?.grade_level === 12) {
      return "Qubso 1 Imtihan oo dib u eeg 5ta Khalad · Complete 1 Mock Exam & review 5 wrong answers";
    }
    return "Daawo 1 Muuqaal & Xal 10 Su'aalood · Watch 1 video lesson & answer 10 quiz questions";
  };

  // Coach parsing
  const coachBody = coach?.coach_message?.replace("=== KOOCHKA AI: REFIK ===\n\n", "") || "";
  const splitIdx = coachBody.indexOf("─────────────────────");
  const coachSomali = splitIdx >= 0 ? coachBody.slice(0, splitIdx).trim() : coachBody;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
          <p className="mt-4 text-xs text-slate-400">Khariidada waxbarashada waxaa la soo rareyaa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
            </div>
            <div>
              <h1 className="font-outfit font-black text-white text-sm leading-none">SomPrep AI</h1>
              <p className="text-[10px] text-slate-500 leading-none mt-1">{user?.full_name}</p>
            </div>
          </div>

          {/* User Tracker Badge details */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSwitcher(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <Settings className="h-3.5 w-3.5 text-slate-400" />
              <span>{user?.selected_region} · F{user?.grade_level}</span>
            </button>

            {streak > 0 && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Flame className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs font-bold">{streak}</span>
              </div>
            )}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Zap className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-bold">{totalXP.toLocaleString()} XP</span>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main View Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        
        {/* Welcome Stat Panel */}
        <div className="rounded-2xl border border-slate-800 bg-[#1e293b]/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-outfit text-white">Ku soo dhowow, {user?.full_name}!</h2>
            <p className="text-xs text-slate-400">Fasalka {user?.grade_level}aad - {user?.selected_region} Track</p>
            <div className="flex flex-wrap gap-2 pt-3">
              {(user?.grade_level === 8 || user?.grade_level === 12) ? (
                <button
                  onClick={() => navigate("/mock-center")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-indigo-600 hover:from-red-600 hover:to-indigo-700 text-xs font-bold text-white transition active:scale-[0.98] shadow-lg shadow-indigo-500/25 uppercase tracking-wider animate-pulse"
                >
                  <Trophy className="h-4 w-4 text-white" />
                  <span>Start Exam Simulation</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    const firstUnlocked = allSubs.find((s) => s.is_unlocked && !s.is_completed);
                    if (firstUnlocked) {
                      handleNodeClick(firstUnlocked.category_id, firstUnlocked);
                    } else {
                      const roadmapSection = document.getElementById("roadmap-section");
                      if (roadmapSection) roadmapSection.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-xs font-bold text-white transition active:scale-[0.98] shadow-lg shadow-indigo-500/20"
                >
                  <Play className="h-3.5 w-3.5 text-white fill-white" />
                  <span>Continue Learning</span>
                </button>
              )}
              
              <button
                onClick={() => navigate("/mock-center")}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white transition"
              >
                <span>Mock Center</span>
              </button>

              {["admin", "teacher", "reviewer"].includes(user?.role) && (
                <button
                  onClick={() => navigate("/reviewer")}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#334155] bg-[#1e293b]/80 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white transition"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Reviewer Portal</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-center md:text-left">
              <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Stars</span>
              <span className="text-lg font-black text-amber-400 flex items-center justify-center md:justify-start gap-1 mt-0.5">
                <Star className="h-4 w-4 fill-amber-400" />
                {totalStars}
              </span>
            </div>
            <div className="text-center md:text-left border-l border-slate-800 pl-8">
              <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Concept Progress</span>
              <span className="text-lg font-black text-emerald-400 flex items-center justify-center md:justify-start gap-1 mt-0.5">
                <Check className="h-4 w-4" />
                {completedSubs}/{totalSubs}
              </span>
            </div>
          </div>
        </div>

        {/* Academic KPIs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-800 bg-[#1e293b]/40 p-4 shadow-md">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Exam Readiness</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-extrabold text-indigo-400 animate-pulse">
                {readiness ? `${readiness.readiness_score}%` : "50.0%"}
              </span>
              <span className="text-[9px] text-slate-400">Target &gt;=80%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-500"
                style={{ width: `${readiness?.readiness_score || 50}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#1e293b]/40 p-4 shadow-md">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Grade Track</span>
            <span className="block text-sm font-bold text-white mt-2 truncate">
              {user?.education_level || "Secondary"} · Grade {user?.grade_level || 12}
            </span>
            <span className="text-[9px] text-indigo-400 mt-1 block font-medium">Somali National Syllabus</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#1e293b]/40 p-4 shadow-md">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Syllabus Progress</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-extrabold text-emerald-400">
                {readiness ? `${readiness.completed_subtopics}/${readiness.total_subtopics}` : "0/0"}
              </span>
              <span className="text-[9px] text-slate-500">Nodes</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{
                  width: `${
                    readiness && readiness.total_subtopics
                      ? (readiness.completed_subtopics / readiness.total_subtopics) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#1e293b]/40 p-4 shadow-md">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Weakest Subject</span>
            <span className="block text-xs font-bold text-red-400 mt-2.5 truncate">
              {getWeakestSubject()}
            </span>
            <span className="text-[9px] text-slate-500 mt-1.5 block">Needs concept review</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#1e293b]/40 p-4 shadow-md">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Mock Score</span>
            <span className="block text-sm font-extrabold text-amber-400 mt-2">
              {getLastMockScore()}
            </span>
            <span className="text-[9px] text-slate-500 mt-2 block">Latest trial result</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#1e293b]/40 p-4 shadow-md col-span-2 md:col-span-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-400">Recommended Task</span>
            <p className="text-[10px] text-slate-300 font-semibold mt-1.5 leading-snug line-clamp-2">
              {getRecommendedTask()}
            </p>
          </div>
        </div>

        {/* Quick Navigation Panel */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={() => navigate("/mock-center")}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-800/80 bg-[#1e293b]/40 hover:bg-[#1e293b]/60 transition text-center shadow-lg active:scale-95"
          >
            <Trophy className="h-5 w-5 text-indigo-400 mb-2" />
            <span className="text-xs font-bold text-slate-200">Start Mock Exam</span>
          </button>
          <button
            onClick={() => navigate("/wrong-answers")}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-800/80 bg-[#1e293b]/40 hover:bg-[#1e293b]/60 transition text-center shadow-lg active:scale-95"
          >
            <BookOpen className="h-5 w-5 text-indigo-400 mb-2" />
            <span className="text-xs font-bold text-slate-200">Wrong Notebook</span>
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("roadmap-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-800/80 bg-[#1e293b]/40 hover:bg-[#1e293b]/60 transition text-center shadow-lg active:scale-95"
          >
            <TrendingUp className="h-5 w-5 text-indigo-400 mb-2" />
            <span className="text-xs font-bold text-slate-200">Concept Roadmap</span>
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("ai-coach-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-800/80 bg-[#1e293b]/40 hover:bg-[#1e293b]/60 transition text-center shadow-lg active:scale-95"
          >
            <Brain className="h-5 w-5 text-indigo-400 mb-2" />
            <span className="text-xs font-bold text-slate-200">AI Coach Advice</span>
          </button>
        </div>

        {/* Technology Skills Panel */}
        <div className="rounded-2xl border border-slate-800 bg-[#1e293b]/40 p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                Technology Skills
              </span>
              <h3 className="mt-1 font-outfit text-lg font-extrabold text-white">
                Practical Digital Learning
              </h3>
            </div>
            <button
              onClick={() => navigate("/technology-skills")}
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
            >
              View all skills
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dashboardTechnologyCards.map((card, index) => {
              const Icon = [Tv, Code2, Database, Cpu][index] || Cpu;
              const recommended =
                card.schoolRecommended &&
                (user?.learner_type === "school_student" || Number(user?.grade_level) >= 7);

              return (
                <button
                  key={card.title}
                  onClick={() => navigate(card.path)}
                  className="text-left rounded-xl border border-slate-800 bg-[#0f172a]/50 p-4 hover:border-indigo-500/40 hover:bg-[#111c33] transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Icon className="h-5 w-5 text-indigo-400" />
                    {recommended ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
                        Recommended
                      </span>
                    ) : null}
                  </div>
                  <span className="mt-3 block text-sm font-bold text-white">{card.title}</span>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-400">{card.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Coach Refik feedback */}
        {coach && (
          <div id="ai-coach-section" className="rounded-2xl border border-indigo-500/20 bg-indigo-950/10 p-5 flex gap-4 items-start">
            <CoachAvatar mood={coach.mood_type} />
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Coach Refik AI Coach</span>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {coachSomali}
              </p>
            </div>
          </div>
        )}

        {/* Subscription CTA Banner */}
        {!subscriptionActive && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-400">Unlock All Somali Subject Courses</h4>
                <p className="text-xs text-slate-400 mt-0.5">Get 12-Month premium access from {currentPackagePrice} USD via Mobile Money.</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/shop")}
              className="w-full sm:w-auto rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-2.5 text-xs font-bold text-slate-950 transition active:scale-[0.98]"
            >
              Get Premium Access
            </button>
          </div>
        )}

        {/* Teacher-Assigned Exams Hub */}
        {teacherExams && teacherExams.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-[#1e293b]/40 p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-indigo-400" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                  Dugsiga & Macallinka
                </span>
                <h3 className="font-outfit text-base font-extrabold text-white leading-none mt-1">
                  Imtixaanada Macallinka · Teacher-Assigned Exams
                </h3>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teacherExams.map((exam) => {
                const attempt = teacherAttempts.find((att) => att.exam_id === exam.id);
                const isCompleted = attempt && attempt.submitted_at;
                const isInProgress = attempt && !attempt.submitted_at;
                
                return (
                  <div
                    key={exam.id}
                    className="rounded-xl border border-slate-800 bg-[#0f172a]/50 p-4 flex flex-col justify-between gap-3 hover:border-indigo-500/30 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {exam.subject}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {exam.questions?.length || 0} Questions · {exam.duration_minutes} Mins
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-2 leading-snug">
                        {exam.title}
                      </h4>
                      {exam.instructions && (
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {exam.instructions}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
                      <div>
                        {isCompleted ? (
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" />
                            Dhammeeyey ({attempt.score.toFixed(0)}%)
                          </span>
                        ) : isInProgress ? (
                          <span className="text-xs font-bold text-amber-400 animate-pulse">
                            Waa Socdaa · In Progress
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">
                            Aan la Bilaabin · Not Started
                          </span>
                        )}
                      </div>
                      
                      <div>
                        {isCompleted ? (
                          <button
                            onClick={() => navigate(`/results/${attempt.id}?type=teacher`)}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-700 transition"
                          >
                            Dib u Eeg · Review
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/exam/teacher/${exam.id}`)}
                            className={`rounded-lg px-3.5 py-1.5 text-[11px] font-bold text-white transition active:scale-95 ${
                              isInProgress
                                ? "bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/10"
                                : "bg-indigo-500 hover:bg-indigo-600 shadow-md shadow-indigo-500/15"
                            }`}
                          >
                            {isInProgress ? "Sii wad · Continue" : "Gal Imtixaanka · Take"}
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

        {/* Visual Concept tree map list */}
        <div id="roadmap-section" className="space-y-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold font-outfit text-white">Subjects Concept Roadmap</h2>
          </div>

          {roadmap.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#1e293b]/30 p-12 text-center text-slate-500">
              <Tv className="mx-auto h-8 w-8 opacity-40 mb-3" />
              <p className="text-xs">Grade-kan iyo Gobolkan wali wax maaddooyin ah laguma darin.</p>
            </div>
          ) : (
            roadmap.map((cat) => (
              <div key={cat.id} className="rounded-2xl border border-slate-850 bg-[#1e293b]/40 overflow-hidden shadow-md">
                {/* Subject Header */}
                <button
                  onClick={() => toggleCat(cat.id)}
                  className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-800/20 transition text-left"
                >
                  <div>
                    <h3 className="text-base font-bold font-outfit text-white flex items-center gap-2">
                      <span className="text-xl">📚</span>
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{cat.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 border border-slate-800 rounded-lg px-2 py-1 bg-slate-900/40">
                      {cat.regional_board} · Grade {cat.grade_level}
                    </span>
                    {expandedCats[cat.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {/* SubTopic Visual Paths */}
                {expandedCats[cat.id] && (
                  <div className="border-t border-slate-850 px-6 py-8 space-y-8 bg-[#0f172a]/30">
                    {cat.topics.map((topic, tIdx) => (
                      <div key={topic.id} className="space-y-6">
                        <div className="border-l-2 border-indigo-500/50 pl-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                            {topic.name}
                          </h4>
                        </div>

                        {/* Zigzag Node Pathway with SVG connectors */}
                        <div className="relative flex flex-col items-center py-4">
                          {topic.subtopics.map((sub, sIdx) => {
                            const isDone = sub.is_completed;
                            const isLocked = !sub.is_unlocked;
                            const isOdd = sIdx % 2 !== 0;

                            return (
                              <div
                                key={sub.id}
                                className={`w-full max-w-[420px] flex ${
                                  isOdd ? "justify-end" : "justify-start"
                                } relative mb-8 last:mb-0`}
                              >
                                {/* SVG connector to next node */}
                                {sIdx < topic.subtopics.length - 1 && (
                                  <svg
                                    className="absolute left-1/2 -translate-x-1/2 top-12 w-32 h-16 pointer-events-none z-0"
                                    viewBox="0 0 100 50"
                                  >
                                    <path
                                      d={isOdd ? "M 80 0 Q 10 25 20 50" : "M 20 0 Q 90 25 80 50"}
                                      fill="none"
                                      stroke={isDone ? "#10b981" : "#334155"}
                                      strokeWidth="2.5"
                                      strokeDasharray="4 4"
                                    />
                                  </svg>
                                )}

                                <div
                                  onClick={() => !isLocked && handleNodeClick(cat.id, sub)}
                                  className={`relative z-10 w-[240px] rounded-2xl border p-4 cursor-pointer transition duration-300 flex items-center justify-between gap-3 shadow-lg ${
                                    isDone
                                      ? "border-emerald-500/40 bg-emerald-950/10 hover:bg-emerald-950/20"
                                      : isLocked
                                      ? "border-slate-800/80 bg-slate-900/60 opacity-60 cursor-not-allowed"
                                      : "border-indigo-500/40 bg-indigo-950/15 hover:border-indigo-500/60 animate-pulse-ring"
                                  }`}
                                >
                                  {isLocked && (
                                    <div className="absolute inset-0 rounded-2xl bg-[#0f172a]/70 flex items-center justify-center">
                                      <Lock className="h-4 w-4 text-slate-500" />
                                    </div>
                                  )}

                                  <div className="flex items-center gap-3">
                                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black ${
                                      isDone
                                        ? "bg-emerald-500 text-white"
                                        : !isLocked
                                        ? "bg-indigo-500 text-white"
                                        : "bg-slate-800 text-slate-600"
                                    }`}>
                                      {isDone ? <Check className="h-3.5 w-3.5" /> : sIdx + 1}
                                    </div>
                                    <div>
                                      <h5 className={`text-xs font-bold ${isLocked ? "text-slate-500" : "text-white"}`}>
                                        {sub.name}
                                      </h5>
                                      
                                      {/* Watch/Practice exam indicators */}
                                      <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-400">
                                        <Tv className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                                        <span>
                                          Muuqaal: {sub.video_completed_count}/{sub.total_videos_count}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {!isLocked && (
                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                                      sub.is_video_completed
                                        ? "bg-emerald-500/20 text-emerald-400"
                                        : "bg-indigo-500/20 text-indigo-400"
                                    }`}>
                                      {sub.is_video_completed ? (
                                        <Star className="h-3.5 w-3.5 fill-emerald-400 text-emerald-400" />
                                      ) : (
                                        <Play className="h-3 w-3 fill-indigo-400 text-indigo-400 ml-0.5" />
                                      )}
                                    </div>
                                  )}
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
            ))
          )}
        </div>

        {/* History Panel */}
        {attempts.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-[#1e293b]/30 overflow-hidden">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-800/10 transition text-left"
            >
              <span className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-400" />
                Exam Attempt History ({attempts.length})
              </span>
              {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showHistory && (
              <div className="border-t border-slate-850 divide-y divide-slate-850">
                {attempts.map((a) => (
                  <div key={a.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-800/10 transition">
                    <div>
                      <span className="font-bold text-slate-200">{a.subtopic?.name || "mock exam"}</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">Completed {new Date(a.completed_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-black ${a.score >= 70 ? "text-emerald-400" : "text-red-400"}`}>
                        {a.score.toFixed(0)}%
                      </span>
                      <button
                        onClick={() => navigate(`/results/${a.id}`)}
                        className="text-indigo-400 font-bold hover:underline"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Switcher Modal */}
      {showSwitcher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-700/80 bg-[#1e293b] p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold font-outfit text-white">
                Beddel Dariiqa Waxbarashada
              </h3>
              <button
                onClick={() => setShowSwitcher(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Gobolka · Exam Board
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-900 py-3.5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Federal">Federal (MoECHE mogadishu)</option>
                  <option value="Puntland">Puntland (PSCE autonomous)</option>
                  <option value="Somaliland">Somaliland Standardized</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Grade / Class Level
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(parseInt(e.target.value))}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-900 py-3.5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <optgroup label="Dugsiga Hoose (Primary)">
                    <option value="1">Grade 1</option>
                    <option value="2">Grade 2</option>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                  </optgroup>
                  <optgroup label="Dugsiga Dhexe (Middle)">
                    <option value="5">Grade 5</option>
                    <option value="6">Grade 6</option>
                    <option value="7">Grade 7</option>
                    <option value="8">Grade 8</option>
                  </optgroup>
                  <optgroup label="Dugsiga Sare (Secondary)">
                    <option value="9">Grade 9</option>
                    <option value="10">Grade 10</option>
                    <option value="11">Grade 11</option>
                    <option value="12">Grade 12</option>
                  </optgroup>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSwitcher(false)}
                  disabled={updatingProfile}
                  className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-3 text-xs font-bold border border-slate-700 transition"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="flex-1 rounded-xl bg-indigo-500 hover:bg-indigo-600 py-3 text-xs font-bold text-white flex items-center justify-center gap-2 transition active:scale-[0.98]"
                >
                  {updatingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Beddelayaa...</span>
                    </>
                  ) : (
                    <span>Update Track</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
