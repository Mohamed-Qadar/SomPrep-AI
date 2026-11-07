import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { examsApi, videosApi } from "../services/endpoints";
import {
  ArrowLeft,
  Tv,
  CheckCircle2,
  Lock,
  Play,
  Award,
  ChevronRight,
  BookOpen,
  HelpCircle,
  Clock
} from "lucide-react";
import PackageGate from "../components/PackageGate";

export default function VideoPlayer() {
  const { subtopicId } = useParams();
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState("");
  const [subtopic, setSubtopic] = useState(null);
  const [category, setCategory] = useState(null);
  
  const videoRef = useRef(null);
  const progressInterval = useRef(null);

  // Fetch subtopic details & videos
  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      setError("");
      try {
        // Fetch roadmap first to resolve subtopic name
        const roadmapResponse = await examsApi.roadmap();
        let foundSub = null;
        let foundCat = null;
        for (const cat of roadmapResponse.data) {
          for (const topic of cat.topics) {
            const match = topic.subtopics.find((s) => s.id === parseInt(subtopicId));
            if (match) {
              foundSub = match;
              foundCat = cat;
              break;
            }
          }
          if (foundSub) break;
        }
        setSubtopic(foundSub);
        setCategory(foundCat);

        // Fetch videos
        const response = await videosApi.bySubtopic(subtopicId);
        setVideos(response.data);
        if (response.data.length > 0) {
          // Play first unwatched video, or just the first video
          const unwatched = response.data.find(v => !v.is_completed);
          setCurrentVideo(unwatched || response.data[0]);
        }
      } catch (err) {
        console.error(err);
        setError("Casharrada muuqaalka ah waa la rari waayay. Fadlan hubi rukumadaada.");
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [subtopicId]);

  // Handle tracking progress
  const startProgressTracking = () => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    
    progressInterval.current = setInterval(() => {
      if (videoRef.current && currentVideo) {
        const currentTime = Math.floor(videoRef.current.currentTime);
        logWatchProgress(currentVideo.id, currentTime);
      }
    }, 5000); // Send log every 5 seconds
  };

  const stopProgressTracking = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  const logWatchProgress = async (videoId, seconds) => {
    try {
      const response = await videosApi.watch({
        video_id: videoId,
        watched_seconds: seconds
      });
      // Update local video watch logs
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? { ...v, watched_seconds: seconds, is_completed: response.data.is_completed }
            : v
        )
      );
      // Sync current video object too
      if (currentVideo && currentVideo.id === videoId) {
        setCurrentVideo(prev => ({
          ...prev,
          watched_seconds: seconds,
          is_completed: response.data.is_completed
        }));
      }
    } catch (err) {
      console.error("Error logging video progress:", err);
    }
  };

  useEffect(() => {
    return () => {
      stopProgressTracking();
    };
  }, [currentVideo]);

  const handleVideoSelect = (video) => {
    stopProgressTracking();
    setCurrentVideo(video);
  };

  // Determine if student has watched enough videos to unlock practice exam
  const allVideosCompleted = videos.length > 0 ? videos.every((v) => v.is_completed) : false;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-indigo" />
          <p className="mt-4 text-xs text-slate-400">Soo raraya casharrada muuqaalka ah...</p>
        </div>
      </div>
    );
  }

  return (
    <PackageGate grade={category?.grade_level}>
      <div className="min-h-screen bg-[#0f172a] text-white flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-[#1e293b]/90 px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white max-w-md truncate">
              {subtopic?.name || "Video Lecture Theater"}
            </h1>
            <p className="text-[11px] text-slate-400">SomPrep AI Concept Map Room</p>
          </div>
        </div>

        {allVideosCompleted ? (
          <button
            onClick={() => navigate(`/exam/${subtopic?.category_id}`)}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 transition active:scale-[0.98]"
          >
            <Award className="h-4 w-4" />
            Fur Imtixaanka Cutubka · Start Exam
          </button>
        ) : (
          <div className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            Fadlan daawo muuqaalka si aad u furto imtixaanka
          </div>
        )}
      </header>

      {/* Main Row layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Video Player Screen */}
        <div className="flex-1 bg-black flex flex-col justify-between relative">
          {currentVideo ? (
            <div className="w-full flex-1 flex items-center justify-center p-2">
              <video
                ref={videoRef}
                key={currentVideo.id}
                src={currentVideo.video_url}
                controls
                autoPlay
                onPlay={startProgressTracking}
                onPause={stopProgressTracking}
                onEnded={() => {
                  stopProgressTracking();
                  logWatchProgress(currentVideo.id, currentVideo.duration);
                }}
                className="max-h-[75vh] w-full max-w-5xl rounded-xl shadow-2xl border border-slate-800/80 object-contain"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
              <Tv className="h-16 w-16 mb-4 opacity-40 text-slate-400" />
              <p className="text-xs">Ma jiraan muuqaallo loo heli karo cutubkan.</p>
            </div>
          )}

          {currentVideo && (
            <div className="p-6 bg-[#1e293b]/60 border-t border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-[11px] font-bold text-indigo-400 mb-2">
                    <Play className="h-3 w-3 fill-indigo-400" />
                    macallinka · Teacher Maxamed
                  </span>
                  <h2 className="text-lg font-bold text-white">{currentVideo.title}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => logWatchProgress(currentVideo.id, currentVideo.duration)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                      currentVideo.is_completed
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-indigo-500 hover:bg-indigo-600 text-white"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{currentVideo.is_completed ? "Completed" : "Mark Completed"}</span>
                  </button>
                  
                  <button
                    onClick={() => alert("Dhibaatada waa la soo sheegay. Mahadsanid!")}
                    className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-bold text-slate-400 hover:text-white transition active:scale-95"
                  >
                    Report Issue
                  </button>

                  {/* Next Lesson Button */}
                  {videos.findIndex((v) => v.id === currentVideo.id) < videos.length - 1 && (
                    <button
                      onClick={() => {
                        const curIdx = videos.findIndex((v) => v.id === currentVideo.id);
                        handleVideoSelect(videos[curIdx + 1]);
                      }}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-850 bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-white transition active:scale-95"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lesson Objectives and Notes Tabs/Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/80">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Hadafka Casharka · Lesson Objective</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Fahamka asaasiga ah ee cutubka, barashada xeerarka muhiimka ah ee physics/mathematics ee unified Somali guidelines, iyo xalinta tusaalayaal imtixaan qaran la xiriira.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-outfit">Qodobbada Muhiimka ah · Key Points</h4>
                  <ul className="list-disc list-inside text-xs text-slate-350 space-y-1">
                    <li>Ilaali fahamka qeexidda saxda ah ee fikradaha.</li>
                    <li>Isticmaal reflex-sheet si aad u xalliso su'aalaha adag si degdeg ah.</li>
                    <li>Practice makes perfect! Had iyo jeer xallili quizz-yada la xiriira.</li>
                  </ul>
                </div>
              </div>

              {/* Quick check suggestion once completed */}
              {currentVideo.is_completed && (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 text-emerald-400 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 shrink-0 text-emerald-550" />
                    <p className="text-xs font-bold">
                      Guul! Waxaad dhammaystirtay muuqaalkan. Take 5-question quick check to unlock the next topic.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/exam/${subtopic?.category_id}?subtopicId=${subtopicId}&name=${encodeURIComponent(subtopic?.name || "")}`)}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition active:scale-95 shrink-0"
                  >
                    Quick Check Quiz
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Playlist Sidebar */}
        <div className="w-full lg:w-96 bg-[#1e293b] border-l border-slate-800 flex flex-col justify-between">
          <div className="p-6 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Timeline-ka casharrada
            </h3>
            <p className="text-[11px] text-slate-500">Muuqaallada cutubkan la xiriira</p>
          </div>

          {/* Playlist items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {videos.map((vid) => {
              const isSelected = currentVideo?.id === vid.id;
              return (
                <div
                  key={vid.id}
                  onClick={() => handleVideoSelect(vid)}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-slate-900 border-indigo-500"
                      : "bg-[#0f172a]/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 shrink-0 rounded-xl flex items-center justify-center ${
                      vid.is_completed
                        ? "bg-emerald-500/10 text-emerald-400"
                        : isSelected
                        ? "bg-indigo-500/20 text-indigo-400"
                        : "bg-slate-800 text-slate-500"
                    }`}>
                      {vid.is_completed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 line-clamp-2 leading-relaxed">
                        {vid.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                        <Clock className="h-3 w-3" />
                        <span>{vid.duration} seeri</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />
                </div>
              );
            })}
          </div>

          {/* Progress Overview Footer */}
          <div className="p-6 border-t border-slate-800 bg-[#0f172a]/40">
            <h4 className="text-xs font-bold text-slate-400 mb-2">Qarankaaga Guud</h4>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-500">Muuqaallada la dhammaystiray</span>
              <span className="text-xs font-bold text-white">
                {videos.filter(v => v.is_completed).length} / {videos.length}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-indigo rounded-full transition-all duration-300"
                style={{
                  width: `${videos.length > 0 ? (videos.filter(v => v.is_completed).length / videos.length) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>
      </div>
    </PackageGate>
  );
}

// Inline Loader2 fallback
function Loader2({ className }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
