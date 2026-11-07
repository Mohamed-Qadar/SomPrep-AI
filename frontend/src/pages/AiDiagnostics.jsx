import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import { CheckCircle2, ShieldCheck, BarChart3, Brain, Sparkles } from "lucide-react";

export default function AiDiagnostics() {
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
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Smart Learning Metrics</span>
          <h1 className="font-outfit text-4xl font-extrabold text-white">AI Diagnostics & Readiness Scores</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Discover how SomPrep AI tracks syllabus progress, evaluates mock exam results, and applies smart analytics to guide your academic roadmap.
          </p>
        </div>

        {/* Diagnostic Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="rounded-2xl border border-slate-800 bg-[#1e293b]/40 p-6 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">The Readiness Metric</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Calculates a dynamic score (0-100%) indicating exam preparedness. It weights syllabus progress at 60%, average mock scores at 40%, and injects streak consistency bonuses to reward daily practice.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#1e293b]/40 p-6 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
              <Brain className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Weak-Topic Detection</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scans your completed answer templates. If it detects consecutive incorrect choices on a specific subtopic node, it flags it as "Weak" and populates your dashboard with recommended videos.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#1e293b]/40 p-6 space-y-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Coach Refik Advisor</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Consumes your practice attempts in real-time, matching results with reflex failure patterns. It writes a structured review diagnostic in Somali and English to guide your studies.
            </p>
          </div>
        </div>

        {/* AI Safeguards Banner */}
        <div className="max-w-4xl mx-auto rounded-3xl border border-amber-500/25 bg-amber-500/5 p-8 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-white">Our Academic Quality Safeguard</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Unlike platforms that use generative AI to draft student exam questions in real-time (introducing hallucinations and curriculum mismatches), <strong>SomPrep AI does not autogenerate final academic answers</strong>. 
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                AI is strictly locked to student performance diagnostics, analytical roadmaps, and coaching messages. Every math equation, chemistry diagram, and history question is drafted, proofread, and approved by certified local educators.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-16">
          <button 
            onClick={() => {
              if (user) {
                navigate("/packages");
              } else {
                navigate("/login?redirect=/packages");
              }
            }}
            className="rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] px-8 py-4 text-xs font-bold text-white shadow-md transition"
          >
            Create Your Study Roadmap
          </button>
        </div>

      </section>

      <PublicFooter />
    </div>
  );
}
