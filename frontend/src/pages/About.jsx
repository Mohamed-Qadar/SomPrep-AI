import React from "react";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import { CheckCircle2, Award, Landmark, Users } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden">
      <PublicNavbar />
      
      {/* Background Gradients */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[36rem] w-[36rem] rounded-full bg-[#6366f1]/[0.05] blur-[120px]" />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Our Identity</span>
          <h1 className="font-outfit text-4xl font-extrabold text-white">About SomPrep AI</h1>
          <p className="text-sm text-slate-400 leading-relaxed font-medium">
            SomPrep AI is a Somalia-focused digital learning and exam preparation platform built for local curriculum needs, low-cost access, and AI-supported student progress.
          </p>
        </div>

        {/* Story details */}
        <div className="max-w-4xl mx-auto rounded-3xl border border-slate-800 bg-[#1e293b]/20 p-8 space-y-8 shadow-xl">
          
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-indigo-400">Our Mission</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our mission is to democratize high-quality exam preparation and digital learning across all 18 administrative regions of Somalia. We believe that financial constraints or regional borders should not restrict a student's access to top-tier teachers and structured exam practice.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-indigo-400">Our Vision</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              We envision a future where every Grade 8 and Grade 12 student has access to an active diagnostic learning roadmap, helping bridge educational disparities and boosting national and regional exam success rates.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-indigo-400 font-semibold">Core Operating Principles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
                <span><strong>Curriculum Alignment</strong>: Direct MoECHE and regional board integration.</span>
              </div>
              <div className="flex gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
                <span><strong>Affordable Licensing</strong>: Unlocked premium packages at just $2.50.</span>
              </div>
              <div className="flex gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
                <span><strong>Teacher Accountability</strong>: All learning contents are fully proofread.</span>
              </div>
              <div className="flex gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
                <span><strong>Social Enterprise</strong>: Generating technology job slots for local graduates.</span>
              </div>
            </div>
          </div>
        </div>

      </section>

      <PublicFooter />
    </div>
  );
}
