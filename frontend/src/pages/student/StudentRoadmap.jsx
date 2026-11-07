import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Lock,
  Play,
  Check,
  Star,
  Tv,
  ChevronDown,
  ChevronUp,
  Loader2
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { examsApi } from "../../services/endpoints";
import PackageGate from "../../components/PackageGate";

export default function StudentRoadmap() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [roadmap, setRoadmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState({});

  const fetchRoadmap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await examsApi.roadmap();
      setRoadmap(res.data);
      const init = {};
      res.data.forEach((cat) => {
        init[cat.id] = true; // start expanded by default for full roadmap page
      });
      setExpandedCats(init);
    } catch (err) {
      console.error("Failed to load roadmap:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  const toggleCat = (id) => setExpandedCats((p) => ({ ...p, [id]: !p[id] }));

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

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const allSubs = roadmap.flatMap((c) => c.topics.flatMap((t) => t.subtopics));
  const completedSubs = allSubs.filter((s) => s.is_completed).length;
  const totalSubs = allSubs.length;

  return (
    <PackageGate grade={user?.grade_level}>
      <div className="space-y-6">
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-400 font-semibold block">Syllabus Completion</span>
          <span className="text-sm font-bold text-emerald-400 mt-1 block">
            {completedSubs} of {totalSubs} nodes completed
          </span>
        </div>
        <div className="w-48 bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${totalSubs > 0 ? (completedSubs / totalSubs) * 150 : 0}px` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {roadmap.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-12 text-center text-slate-500">
            <Tv className="mx-auto h-8 w-8 opacity-40 mb-3" />
            <p className="text-xs">Wali wax maaddooyin ah laguma darin fasalkaaga.</p>
          </div>
        ) : (
          roadmap.map((cat) => (
            <div key={cat.id} className="rounded-2xl border border-slate-800 bg-[#130b24] overflow-hidden shadow-md">
              {/* Subject Header */}
              <button
                onClick={() => toggleCat(cat.id)}
                className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-800/10 transition text-left"
              >
                <div>
                  <h3 className="text-sm font-bold font-outfit text-white flex items-center gap-2">
                    <span className="text-lg">📚</span>
                    {cat.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 leading-snug">{cat.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-bold text-slate-500 border border-slate-850 rounded-lg px-2 py-1 bg-slate-900/40">
                    {cat.regional_board} · Grade {cat.grade_level}
                  </span>
                  {expandedCats[cat.id] ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </button>

              {/* SubTopic Visual Paths */}
              {expandedCats[cat.id] && (
                <div className="border-t border-slate-850 px-6 py-8 space-y-8 bg-slate-950/20">
                  {cat.topics.map((topic) => (
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
      </div>
    </PackageGate>
  );
}
