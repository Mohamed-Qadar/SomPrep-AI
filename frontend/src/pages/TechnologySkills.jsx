import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import TechnologyPackagesSection from "../components/TechnologyPackagesSection";
import { useAuth } from "../context/AuthContext";
import { techApi } from "../services/endpoints";
import {
  technologyBadges,
  technologyRoadmap,
} from "../data/technologySkills";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Cpu, Database, FileText, GraduationCap, Layers, PlayCircle, Presentation, Target } from "lucide-react";

const whyCards = [
  ["Digital literacy", FileText],
  ["School assignments", GraduationCap],
  ["Office productivity", Presentation],
  ["Data-driven work", Database],
  ["Programming foundations", Cpu],
  ["Career readiness", BriefcaseBusiness],
];

const method = [
  "Watch short lesson",
  "Complete guided practice",
  "Submit task or quiz",
  "Receive feedback",
  "Build a mini-project",
  "Track progress",
];

const fallbackTracks = [
  { id: 1, name: "Office Skills", slug: "office-skills", description: "Word, Excel, PowerPoint, typing, and school assignment skills.", icon: "FileText" },
  { id: 2, name: "Programming Skills", slug: "programming-skills", description: "Python, C, and C++ foundations with practice tasks.", icon: "Code2" },
  { id: 3, name: "Data Analysis", slug: "data-analysis", description: "Excel, Python, charts, reports, and beginner data projects.", icon: "BarChart3" },
  { id: 4, name: "Machine Learning", slug: "machine-learning", description: "Beginner-friendly ML concepts and simple Python projects.", icon: "Cpu" }
];

export default function TechnologySkills() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(true);

  useEffect(() => {
    let active = true;
    const loadTracks = async () => {
      if (!user) {
        setTracks(fallbackTracks);
        setLoadingTracks(false);
        return;
      }
      try {
        setLoadingTracks(true);
        const res = await techApi.tracks();
        if (active) {
          setTracks(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch tracks", err);
        if (active) setTracks(fallbackTracks);
      } finally {
        if (active) setLoadingTracks(false);
      }
    };
    loadTracks();
    return () => { active = false; };
  }, [user]);

  const handleEnroll = async (trackId) => {
    if (!user) {
      navigate("/login?redirect=/technology-skills");
      return;
    }
    try {
      await techApi.enroll(trackId);
      const res = await techApi.tracks();
      setTracks(res.data);
    } catch (err) {
      console.error("Enrollment failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c031a] text-white font-sans overflow-x-hidden">
      <PublicNavbar />
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-[44rem] bg-gradient-to-b from-[#310c5a]/30 via-[#1c0836]/10 to-transparent blur-[140px]" />

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 border-b border-white/[0.05]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-300">
              <Cpu className="h-3.5 w-3.5" />
              Somalia-focused digital skills
            </span>
            <h1 className="font-outfit text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-tight">
              Technology Skills for Students, Graduates, and Professionals
            </h1>
            <p className="max-w-2xl text-sm text-slate-400 leading-relaxed">
              SomPrep AI helps Somali learners build practical digital skills for school, university,
              work, and future careers.
            </p>
            <div className="flex flex-wrap gap-2">
              {technologyBadges.map((badge) => (
                <span key={badge} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-slate-300">
                  {badge}
                </span>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate("/packages/technology")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6366f1] px-6 py-3.5 text-xs font-bold text-white hover:bg-[#4f46e5] transition"
              >
                Explore Technology Packages
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate("/technology-skills/office")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-3.5 text-xs font-bold text-slate-200 hover:bg-white/[0.08] transition"
              >
                Start with Office Skills
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-3xl border border-indigo-500/20 bg-[#1a1130]/60 p-6 shadow-2xl">
            <div className="grid grid-cols-2 gap-3">
              {technologyRoadmap.map((item, index) => (
                <div key={item} className="rounded-2xl border border-white/[0.06] bg-[#0f172a]/50 p-4">
                  <span className="text-[10px] font-black text-indigo-300">0{index + 1}</span>
                  <p className="mt-2 text-xs font-bold text-white">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-b border-white/[0.05]">
        <div className="max-w-3xl mb-10">
          <h2 className="font-outfit text-3xl font-extrabold text-white">Why Technology Skills Matter</h2>
          <p className="mt-4 text-sm text-slate-400 leading-relaxed">
            Somalia needs stronger digital skills across schools, universities, businesses, and public
            institutions. SomPrep AI introduces structured technology learning so students and
            graduates can move beyond basic phone use and start building real productivity, analysis,
            and programming skills.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {whyCards.map(([title, Icon]) => (
            <div key={title} className="rounded-2xl border border-white/[0.06] bg-[#1a1130]/35 p-5">
              <Icon className="h-5 w-5 text-indigo-300" />
              <p className="mt-3 text-sm font-bold text-white">{title}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-b border-white/[0.05]">
        <h2 className="font-outfit text-3xl font-extrabold text-white">Available Learning Tracks</h2>
        <p className="mt-2 text-sm text-slate-400">Choose a path to build practical technology skills with structured lessons, video tutorials, and interactive quizzes.</p>
        
        {loadingTracks ? (
          <div className="mt-8 flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {tracks.map((track) => (
              <div key={track.id || track.slug} className="rounded-3xl border border-white/[0.06] bg-[#1a1130]/40 p-7 flex flex-col justify-between shadow-xl relative overflow-hidden group">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-extrabold text-white">{track.name}</h3>
                      <p className="mt-3 text-xs text-slate-400 leading-relaxed">{track.description}</p>
                    </div>
                    <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
                      {track.icon === "FileText" && <FileText className="h-5 w-5" />}
                      {track.icon === "Code2" && <Cpu className="h-5 w-5" />}
                      {track.icon === "BarChart3" && <Database className="h-5 w-5" />}
                      {track.icon === "Cpu" && <Cpu className="h-5 w-5" />}
                    </div>
                  </div>

                  {user && track.is_enrolled && (
                    <div className="mt-6 space-y-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-350">
                        <span>Progress</span>
                        <span className="text-indigo-400">{Math.round(track.progress_percent)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${track.progress_percent}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  {track.is_enrolled ? (
                    <button
                      onClick={() => navigate(`/dashboard/tech/${track.slug}`)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] px-5 py-3 text-xs font-bold text-white transition active:scale-[0.98]"
                    >
                      Continue Course
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEnroll(track.id)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] px-5 py-3 text-xs font-bold text-slate-200 transition active:scale-[0.98]"
                    >
                      Enroll Now
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-b border-white/[0.05]">
        <h2 className="font-outfit text-3xl font-extrabold text-white">Learn by Watching, Practicing, and Building</h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {method.map((step, index) => (
            <div key={step} className="rounded-2xl border border-white/[0.06] bg-[#1a1130]/35 p-4">
              <PlayCircle className="h-5 w-5 text-indigo-300" />
              <span className="mt-4 block text-[10px] font-black text-slate-500">STEP {index + 1}</span>
              <p className="mt-1 text-xs font-bold text-white">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-b border-white/[0.05]">
        <h2 className="font-outfit text-3xl font-extrabold text-white">Technology Roadmap</h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {technologyRoadmap.map((item) => (
            <div key={item} className="rounded-2xl border border-indigo-500/15 bg-indigo-500/[0.04] p-5">
              <Layers className="h-5 w-5 text-indigo-300" />
              <p className="mt-3 text-sm font-bold text-white">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-b border-white/[0.05]">
        <div className="rounded-3xl border border-white/[0.06] bg-[#1a1130]/40 p-8">
          <Target className="h-6 w-6 text-indigo-300" />
          <h2 className="mt-4 font-outfit text-3xl font-extrabold text-white">From Learning to Work Readiness</h2>
          <p className="mt-4 max-w-3xl text-sm text-slate-400 leading-relaxed">
            SomPrep AI's technology skills path is designed to help learners gain practical abilities
            that can support school performance, office work, freelancing, data-related tasks, and
            future technology careers.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <TechnologyPackagesSection />
      </div>

      <PublicFooter />
    </div>
  );
}
