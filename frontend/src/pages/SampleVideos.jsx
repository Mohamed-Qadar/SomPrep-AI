import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import { Play, Clock, Globe, BookOpen, AlertCircle, RefreshCw, Layers, CheckCircle } from "lucide-react";
import videoThumbnail from "../assets/video_thumbnail.png";

export default function SampleVideos() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const playId = searchParams.get("play");

  const samples = [
    {
      id: "1",
      title: "Grade 12 Physics: Newton’s Laws of Motion",
      subject: "Physics",
      grade: "Grade 12",
      length: "65 seconds",
      lang: "Somali / English",
      topic: "Mechanics",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      desc: "An introduction to Newton's Laws, illustrating Inertia (First Law) and Action-Reaction (Third Law) using localized Somali teaching scenarios."
    },
    {
      id: "2",
      title: "Grade 12 Mathematics: Concept of derivatives",
      subject: "Mathematics",
      grade: "Grade 12",
      length: "90 seconds",
      lang: "English / Somali",
      topic: "Calculus",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      desc: "Learn the core concepts of rate of change and the derivative power rule formula, designed for secondary school exam preparation."
    },
    {
      id: "3",
      title: "Grade 8 General Science: Forces and Motion",
      subject: "General Science",
      grade: "Grade 8",
      length: "45 seconds",
      lang: "Somali Language",
      topic: "Sayniska Dhexe",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      desc: "Cashar kooban oo ku saabsan aasaaska xoogga iyo dhaqdhaqaaqa ee ku qoran Af-Soomaali, kaas oo loo habeeyey imtixaanka dugsiga dhexe."
    },
    {
      id: "4",
      title: "Grade 8 Somali: Reading Comprehension",
      subject: "Somali Language",
      grade: "Grade 8",
      length: "75 seconds",
      lang: "Af-Soomaali",
      topic: "Naxwaha",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      desc: "Master reading comprehension techniques and vocabulary mapping tools for the regional Somali language exam."
    },
    {
      id: "5",
      title: "Grade 12 Biology: Cell Organelles & Powerhouse",
      subject: "Biology",
      grade: "Grade 12",
      length: "80 seconds",
      lang: "English / Somali",
      topic: "Cell Biology",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
      desc: "A tour of the cell organelles, diving into the mitochondria and ribosomal machinery responsible for ATP energy synthesis."
    },
    {
      id: "6",
      title: "Grade 12 Chemistry: Chemical Bonding & Valence",
      subject: "Chemistry",
      grade: "Grade 12",
      length: "70 seconds",
      lang: "English / Somali",
      topic: "Chemical Bonding",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutback.mp4",
      desc: "Learn how atoms share or transfer electrons to form stable covalent or ionic chemical bonds."
    }
  ];

  // States
  const [activeVideo, setActiveVideo] = useState(samples[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState("All");

  // Dynamically resolve filters list
  const grades = ["All", "Grade 8", "Grade 12"];
  const subjects = useMemo(() => {
    const list = new Set(samples.map(s => s.subject));
    return ["All", ...Array.from(list)];
  }, []);

  // Filter lessons
  const filteredSamples = useMemo(() => {
    return samples.filter((item) => {
      const matchesGrade = gradeFilter === "All" || item.grade === gradeFilter;
      const matchesSubject = subjectFilter === "All" || item.subject === subjectFilter;
      return matchesGrade && matchesSubject;
    });
  }, [gradeFilter, subjectFilter]);

  // Sync active video when query param changes
  useEffect(() => {
    if (playId) {
      const match = samples.find(s => s.id === playId);
      if (match) {
        setActiveVideo(match);
        setIsPlaying(false);
      }
    }
  }, [playId]);

  // Sync active video if current selection gets filtered out
  useEffect(() => {
    if (filteredSamples.length > 0 && !filteredSamples.some(v => v.id === activeVideo.id)) {
      setActiveVideo(filteredSamples[0]);
      setIsPlaying(false);
    }
  }, [filteredSamples, activeVideo]);

  const handleSelectVideo = (vid) => {
    setActiveVideo(vid);
    setIsPlaying(false);
    navigate(`/sample-videos?play=${vid.id}`);
  };

  return (
    <div className="min-h-screen bg-[#0c031a] text-white font-sans overflow-x-hidden flex flex-col justify-between">
      <PublicNavbar />
      
      {/* Background decoration */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[36rem] w-[36rem] rounded-full bg-[#6366f1]/[0.05] blur-[120px] -z-10" />

      <section className="flex-1 mx-auto max-w-7xl w-full px-4 py-16 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 inline-block">
            Try Before You Subscribe
          </span>
          <h1 className="font-outfit text-4xl font-extrabold text-white leading-tight">
            Explore Free Trial Lessons
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Daawo casharro kooban oo bilaash ah oo ay duubeen macallimiinta khuburada ah ee SomPrep AI. Subscribe garee si aad u furto dhammaan casharada iyo imtixaanada fasalkaaga.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="rounded-2xl border border-slate-900 bg-[#130b24]/60 p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-indigo-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Shaandhee Casharrada (Filters)</h4>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Grade filter selection */}
            <div className="flex-1 md:flex-initial space-y-1.5 min-w-[140px]">
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                {grades.map(g => (
                  <option key={g} value={g} className="bg-[#130b24]">
                    {g === "All" ? "All Grades (Dhammaan)" : g}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject filter selection */}
            <div className="flex-1 md:flex-initial space-y-1.5 min-w-[160px]">
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                {subjects.map(sub => (
                  <option key={sub} value={sub} className="bg-[#130b24]">
                    {sub === "All" ? "All Subjects (Maadooyinka)" : sub}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Interface Layout */}
        {filteredSamples.length === 0 ? (
          <div className="rounded-3xl border border-slate-900 bg-[#130b24] p-16 text-center space-y-4 max-w-xl mx-auto">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Ma jiraan casharro buuxiya shuruudahan</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                No trial lessons match the selected filters. Please adjust your grade or subject selection to explore other lessons.
              </p>
            </div>
            <button 
              onClick={() => { setGradeFilter("All"); setSubjectFilter("All"); }}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white transition active:scale-95 shadow-md shadow-indigo-600/10"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Active Video Player (Left Column) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Premium Thumbnail Cover Video Container */}
              <div className="rounded-3xl border border-slate-900 bg-slate-950 overflow-hidden shadow-2xl relative aspect-video group">
                {!isPlaying ? (
                  <div 
                    onClick={() => setIsPlaying(true)}
                    className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8 cursor-pointer group"
                    style={{
                      backgroundImage: `url(${videoThumbnail})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {/* Dark gradient mask */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent opacity-85 z-0" />
                    
                    {/* Top tags info */}
                    <div className="z-10 flex justify-between items-start w-full">
                      <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20 uppercase tracking-wider">
                        {activeVideo.subject} • {activeVideo.grade}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-indigo-400" />
                        {activeVideo.length}
                      </span>
                    </div>

                    {/* Centered pulsing play button */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-[#6366f1] text-white flex items-center justify-center shadow-lg shadow-[#6366f1]/30 group-hover:scale-110 transition duration-300 relative">
                        <div className="absolute inset-0 rounded-full bg-[#6366f1] animate-ping opacity-20" />
                        <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-white ml-1" />
                      </div>
                    </div>

                    {/* Bottom Metadata Info */}
                    <div className="z-10 space-y-1.5 max-w-xl">
                      <h3 className="text-base sm:text-xl font-bold font-outfit text-white group-hover:text-indigo-300 transition">
                        {activeVideo.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {activeVideo.desc}
                      </p>
                    </div>
                  </div>
                ) : (
                  <video
                    key={activeVideo.id}
                    controls
                    autoPlay
                    src={activeVideo.url}
                    className="w-full aspect-video focus:outline-none"
                  />
                )}
              </div>
              
              {/* Detailed info container */}
              <div className="p-6 rounded-3xl border border-slate-900 bg-[#130b24]/40 space-y-3 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                  <div>
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">{activeVideo.grade}</span>
                    <h2 className="text-base sm:text-lg font-bold text-white mt-1.5">{activeVideo.title}</h2>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium shrink-0">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {activeVideo.length}</span>
                    <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {activeVideo.lang}</span>
                  </div>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">About this lesson</span>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1.5">{activeVideo.desc}</p>
                </div>
              </div>
            </div>

            {/* Video List (Right Column) */}
            <div className="lg:col-span-4 rounded-3xl border border-slate-900 bg-[#130b24]/40 p-5 space-y-4 shadow-lg flex flex-col justify-between h-full min-h-[480px]">
              <div className="space-y-4 flex-1">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-900 pb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-400" />
                  Available Lessons ({filteredSamples.length})
                </h3>
                
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {filteredSamples.map((vid) => {
                    const isActive = vid.id === activeVideo.id;
                    return (
                      <button
                        key={vid.id}
                        onClick={() => handleSelectVideo(vid)}
                        className={`w-full text-left p-3 rounded-xl border transition flex gap-3 ${
                          isActive 
                            ? "border-[#6366f1] bg-indigo-950/20 text-white" 
                            : "border-slate-850 bg-slate-900/10 text-slate-300 hover:border-slate-800 hover:bg-slate-900/30"
                        }`}
                      >
                        <div className="h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                          <Play className={`h-3.5 w-3.5 ${isActive ? "text-[#6366f1] fill-[#6366f1]" : ""}`} />
                        </div>
                        <div className="space-y-0.5 truncate flex-1">
                          <span className="block text-[8px] font-bold text-slate-500 truncate uppercase">{vid.grade} • {vid.subject}</span>
                          <span className="block text-xs font-semibold truncate text-white">{vid.title}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 flex gap-2 text-[10px] text-amber-300 mt-4">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Full lesson materials, study slides, practice worksheets, and diagnostic tracking require an active premium subscription.</span>
              </div>
            </div>

          </div>
        )}

      </section>

      <PublicFooter />
    </div>
  );
}
