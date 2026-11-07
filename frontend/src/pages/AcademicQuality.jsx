import React from "react";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import { CheckCircle2, ShieldCheck, Eye, RefreshCw, Star } from "lucide-react";

export default function AcademicQuality() {
  const steps = [
    { title: "Syllabus Deconstruction", desc: "Our academic committee splits the Grade 8 and Grade 12 official national outlines into clean concept subtopic maps." },
    { title: "Teacher-Drafted Questions", desc: "Expert subject-matter teachers draft questions, explanation text, and specify difficulty meters and cognitive levels." },
    { title: "Blind Quality Review", desc: "Assigned reviewer portal audit cards display drafts anonymously. Reviewers check options, identify errors, and confirm or reject." },
    { title: "Published Content Log", desc: "Approved records are signed with cryptographic timestamps and pushed to student roadmap practice sets." },
    { title: "Student Feedback Loops", desc: "Students can submit error flags if a equation contains a typo. The platform automatically queues corrections." }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden">
      <PublicNavbar />
      
      {/* Background Gradients */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[36rem] w-[36rem] rounded-full bg-[#6366f1]/[0.05] blur-[120px]" />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Curriculum Standards</span>
          <h1 className="font-outfit text-4xl font-extrabold text-white">Academic Quality & Review Workflows</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            SomPrep AI guarantees academic rigor. Discover how our multi-step reviewer workflow prevents incorrect answers and aligns questions with national syllabus requirements.
          </p>
        </div>

        {/* Workflow steps */}
        <div className="max-w-4xl mx-auto space-y-6 mb-20">
          {steps.map((step, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-800 bg-[#1e293b]/40 p-6 flex flex-col sm:flex-row gap-4 items-start hover:border-slate-700 transition">
              <div className="h-8 w-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mx-auto sm:mx-0">
                {idx + 1}
              </div>
              <div className="space-y-1.5 text-center sm:text-left">
                <h3 className="text-sm font-bold text-white">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quality Safeguard Checklist */}
        <div className="max-w-4xl mx-auto rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
              Teacher-Reviewed Credentials
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              We vet every question. AI assistance is only used to deconstruct formatting or translate structures, never to write final answers. All final answers are written and certified by local teachers.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-indigo-400" />
              Continuous Audit Loops
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              As students complete mock exams, the system logs item difficulty. If a question is found to have an abnormally high error rate, it triggers a review alert for our editors to verify quality.
            </p>
          </div>
        </div>

      </section>

      <PublicFooter />
    </div>
  );
}
