import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import { CheckCircle2, ShieldAlert, Award, FileText, Timer } from "lucide-react";

export default function ExamPrep() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden">
      <PublicNavbar />
      
      {/* Background decoration */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[36rem] w-[36rem] rounded-full bg-[#6366f1]/[0.05] blur-[120px]" />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Simulation Engine</span>
          <h1 className="font-outfit text-4xl font-extrabold text-white">National & Regional Exam Preparation</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            SomPrep AI houses an advanced examination simulation engine engineered to align directly with the Grade 12 Unified National Exams and Grade 8 Regional Examinations.
          </p>
        </div>

        {/* Detailed Info Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">The Grade 12 National Exam Simulator</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              For Form 4 students, our mock trials are aligned with national exam preparation needs. The system supports scientific tracks, English, Somali, and humanities-focused study paths.
            </p>
            <div className="space-y-3 text-xs">
              <div className="flex gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
                <span><strong>120-minute timed mock structures</strong> to build pacing capability.</span>
              </div>
              <div className="flex gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
                <span><strong>Custom blueprints</strong> matching historical subject weightings.</span>
              </div>
              <div className="flex gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
                <span><strong>Difficulty distributions</strong>: easy, medium, and hard question ratios.</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-[#1e293b]/40 p-8 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400">Grade 12 Blueprint Mock</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Total Duration:</span>
                <span className="font-bold">120 Minutes</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Subject Coverage:</span>
                <span className="font-bold">Physics / Math / Bio / Chem / Somali</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Question Volume:</span>
                <span className="font-bold">50 Questions</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cognitive Levels:</span>
                <span className="font-bold">Knowledge (40%) / Apply (40%) / Analyze (20%)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center border-t border-slate-800/60 pt-20">
          <div className="rounded-3xl border border-slate-800 bg-[#1e293b]/40 p-8 space-y-4 order-2 lg:order-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400">Grade 8 Blueprint Mock</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Total Duration:</span>
                <span className="font-bold">90 Minutes</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Subject Coverage:</span>
                <span className="font-bold">Sayniska Guud, Xisaab, Af-Soomaali, English</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Language of Instruction:</span>
                <span className="font-bold">Af-Soomaali (Mother Tongue focus)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Regional Boards:</span>
                <span className="font-bold">Federal, Puntland (PSCE), Somaliland</span>
              </div>
            </div>
          </div>

          <div className="space-y-6 order-1 lg:order-2">
            <h2 className="text-xl font-bold text-white">The Grade 8 Regional Exam Simulator</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Middle school students in Grade 8 face regional final assessments. SomPrep AI provides localized regional track blueprints matching Federal, Puntland, and Somaliland board requirements to ensure complete alignment.
            </p>
            <div className="space-y-3 text-xs">
              <div className="flex gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                <span><strong>90-minute timed mock structures</strong> adapted for middle schoolers.</span>
              </div>
              <div className="flex gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                <span><strong>Somali language instructions</strong> for scientific and math concepts.</span>
              </div>
              <div className="flex gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                <span><strong>Wrong-Answer retention</strong> to revisit failed questions before exam day.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostic Highlight */}
        <div className="max-w-4xl mx-auto mt-24 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 p-8 space-y-6 text-center">
          <h3 className="text-lg font-bold text-white">Diagnostics & Weakness Notebook</h3>
          <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
            Taking practice exams without feedback is ineffective. SomPrep AI logs every attempt, records your speed pacing, details question explanations step-by-step, and puts wrong answers inside a notebook ready for retry.
          </p>
          <div>
            <button 
              onClick={() => {
                if (user) {
                  navigate("/packages");
                } else {
                  navigate("/login?redirect=/packages");
                }
              }}
              className="rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] px-6 py-3.5 text-xs font-bold text-white shadow-md transition"
            >
              Start Practice Session
            </button>
          </div>
        </div>

      </section>

      <PublicFooter />
    </div>
  );
}
