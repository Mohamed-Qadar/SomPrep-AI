import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { aiCoachApi } from "../../services/endpoints";
import {
  Brain,
  Sparkles,
  Flame,
  Zap,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Award,
  BookOpen,
  ArrowRight
} from "lucide-react";

export default function StudentAiCoach() {
  const { user } = useAuth();
  const [coachData, setCoachData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState("somali");

  const fetchCoachInsight = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setAnalyzing(true);
    } else {
      setLoading(true);
    }
    setErrorMsg("");

    try {
      let res;
      if (isRefresh) {
        // Force recalculation
        res = await aiCoachApi.analyze();
      } else {
        // Fetch current brief
        res = await aiCoachApi.brief();
      }
      setCoachData(res.data);
    } catch (err) {
      console.error("Error fetching AI Coach insights:", err);
      // Backend returns 503 if OpenAI API key is unconfigured or call fails
      if (err.response?.status === 503) {
        setErrorMsg(
          "Koochka AI Refik hadda diyaar ma aha. Fadlan mar kale tijaabi hadhow. (AI Coach Refik is temporarily offline. Please try again later.)"
        );
      } else {
        setErrorMsg(
          "Qalad ayaa dhacay intii lagu guda jiray soo rarista xogta AI. (Failed to load AI Coach details.)"
        );
      }
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    fetchCoachInsight();
  }, [fetchCoachInsight]);

  // Parse Coach message into Somali and English sections
  const parseMessage = (msg) => {
    if (!msg) return { somali: "", english: "" };
    
    // Clean header
    let clean = msg.replace(/=== KOOCHKA AI: REFIK ===\s*/i, "");
    
    const divider = "─────────────────────";
    const parts = clean.split(divider);
    
    if (parts.length >= 2) {
      return {
        somali: parts[0].trim(),
        english: parts[1].trim()
      };
    }
    
    // Fallback if formatting doesn't contain divider
    return {
      somali: clean,
      english: ""
    };
  };

  // Determine styling based on mood_type
  const getMoodConfig = (mood) => {
    switch (mood) {
      case "celebration":
        return {
          bg: "from-amber-600/10 to-yellow-600/5 border-amber-500/20",
          text: "text-amber-400",
          iconBg: "bg-amber-500/15 border border-amber-500/30",
          badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          emoji: "🥳",
          titleSomali: "Zoonka Dabaaldegga & Guusha",
          titleEnglish: "Success & Celebration Zone"
        };
      case "strict_warning":
        return {
          bg: "from-red-600/10 to-rose-600/5 border-red-500/20",
          text: "text-rose-400",
          iconBg: "bg-rose-500/15 border border-rose-500/30",
          badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
          emoji: "🚨",
          titleSomali: "Digniin Muhiim ah",
          titleEnglish: "Important Focus Alert"
        };
      case "focus_needed":
        return {
          bg: "from-indigo-600/10 to-violet-600/5 border-indigo-500/20",
          text: "text-indigo-400",
          iconBg: "bg-indigo-500/15 border border-indigo-500/30",
          badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
          emoji: "🎯",
          titleSomali: "Falanqaynta Meelaha Tabar-yar",
          titleEnglish: "Targeted Skills Improvement"
        };
      case "motivational":
      default:
        return {
          bg: "from-purple-600/10 to-indigo-600/5 border-purple-500/20",
          text: "text-purple-400",
          iconBg: "bg-purple-500/15 border border-purple-500/30",
          badge: "bg-purple-500/10 text-purple-400 border-purple-500/20",
          emoji: "🚀",
          titleSomali: "Hagaha Dhiirigelinta",
          titleEnglish: "Motivational Growth Roadmap"
        };
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
          <p className="mt-4 text-xs text-slate-400 font-semibold">
            Koochka AI Refik ayaa diyaarinaya warbixintii ugu dambeysay...
          </p>
        </div>
      </div>
    );
  }

  const { somali, english } = parseMessage(coachData?.coach_message);
  const moodConfig = getMoodConfig(coachData?.mood_type);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#1c0f38] to-[#120826] border border-indigo-950/60 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              AI Study Assistant
            </span>
            {coachData && (
              <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${moodConfig.badge}`}>
                Mood: {coachData.mood_type}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black font-outfit text-white">AI Coach Refik</h2>
          <p className="text-xs text-slate-400 font-medium">
            Falanqaynta caqliga ee horumarkaaga waxbarasho iyo soo-jeedimaha AI.
          </p>
        </div>

        <button
          onClick={() => fetchCoachInsight(true)}
          disabled={analyzing}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition active:scale-[0.98] shadow-lg shadow-indigo-600/25 disabled:opacity-50"
        >
          {analyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>{analyzing ? "Falanqaynaya..." : "Cusboonaysii Falanqaynta (Analyze)"}</span>
        </button>
      </div>

      {errorMsg ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-950/5 p-6 space-y-4 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-lg mx-auto">
            <h4 className="text-sm font-bold text-white">AI Coach is Temporarily Offline</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {errorMsg}
            </p>
          </div>
          <button
            onClick={() => fetchCoachInsight(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 transition"
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Panel: Coach Avatar and Profile Summary */}
          <div className="space-y-6">
            <div className={`rounded-2xl border bg-[#130b24] bg-gradient-to-b ${moodConfig.bg} p-6 text-center space-y-4 shadow-md`}>
              <div className="relative inline-block">
                <div className={`h-24 w-24 rounded-3xl ${moodConfig.iconBg} flex items-center justify-center text-5xl relative animate-coach-bob`}>
                  {moodConfig.emoji}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-slate-900 border border-slate-800 rounded-lg p-1.5 shadow-md">
                  <Brain className="h-4 w-4 text-indigo-400" />
                </div>
              </div>

              <div>
                <h4 className="font-outfit text-base font-extrabold text-white">Coach Refik</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  Personal AI Tutor
                </p>
              </div>

              <div className="border-t border-slate-850/60 pt-4 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Streak</span>
                  <div className="flex items-center justify-center gap-1 text-amber-400 font-extrabold text-sm">
                    <Flame className="h-4 w-4" />
                    <span>{user?.current_streak ?? 0} Days</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Total XP</span>
                  <div className="flex items-center justify-center gap-1 text-indigo-400 font-extrabold text-sm">
                    <Zap className="h-4 w-4" />
                    <span>{user?.total_xp_points ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Hints */}
            <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-5 space-y-3 shadow-md">
              <h5 className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>Next Action Steps</span>
              </h5>
              <ul className="space-y-2 text-[11px] text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>Review weak subjects marked in red on the dashboard.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>Retake failed mock exams to master the concepts.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>Review wrong-answer notebooks before starting new topics.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Panel: Tabbed Coach Insight Message */}
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-6 shadow-md space-y-6">
              {/* Custom Tabs */}
              <div className="flex border-b border-slate-850">
                <button
                  onClick={() => setActiveTab("somali")}
                  className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px ${
                    activeTab === "somali"
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  🇸🇴 Koochka AI (Somali)
                </button>
                {english && (
                  <button
                    onClick={() => setActiveTab("english")}
                    className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px ${
                      activeTab === "english"
                        ? "border-indigo-500 text-indigo-400"
                        : "border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    🇬🇧 AI Coach (English)
                  </button>
                )}
              </div>

              {/* Message Display Area */}
              <div className="relative">
                {activeTab === "somali" ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">
                        {moodConfig.titleSomali}
                      </span>
                    </div>
                    <div className="text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line bg-slate-950/30 p-5 rounded-2xl border border-slate-850/50">
                      {somali}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">
                        {moodConfig.titleEnglish}
                      </span>
                    </div>
                    <div className="text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line bg-slate-950/30 p-5 rounded-2xl border border-slate-850/50">
                      {english}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer encouragement */}
              <div className="border-t border-slate-850 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[11px] text-slate-500">
                <span>Last Updated: {coachData.created_at ? new Date(coachData.created_at).toLocaleString() : "Recently"}</span>
                <span className="flex items-center gap-1 text-indigo-400 font-semibold">
                  <span>Aim for 80% to unlock new nodes</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>

            {/* Diagnostic Stats Visual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h6 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Analysis Style</h6>
                  <p className="text-xs font-bold text-white mt-0.5">
                    {coachData.suggestion_type === "excellent_progress" 
                      ? "Strengths Celebration" 
                      : "Weakness Identification"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h6 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Concept Alignment</h6>
                  <p className="text-xs font-bold text-white mt-0.5">Dual-Language Feedback</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
