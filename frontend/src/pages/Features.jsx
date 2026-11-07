import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import { 
  CheckCircle2, 
  HelpCircle, 
  ChevronDown, 
  Map, 
  BookOpen, 
  Cpu, 
  Sparkles, 
  ShieldAlert, 
  BarChart4 
} from "lucide-react";

export default function Features() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState(null);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const featureBlocks = [
    {
      title: "Interactive Concept Roadmaps",
      desc: "Our platform replaces standard list structures with a visually branching roadmap. Concepts unlock sequentially as students master prerequisite topics, enforcing structured study habits.",
      icon: Map,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
    },
    {
      title: "Wrong-Answer Notebook",
      desc: "Every mistake made during quizzes or mock exams is instantly captured. Students can review explanations, retrain themselves on specific concepts, and retry questions to verify correction.",
      icon: ShieldAlert,
      color: "text-red-400 bg-red-500/10 border-red-500/20"
    },
    {
      title: "Smart Learning Diagnostics",
      desc: "Receive immediate detailed breakdowns after attempts, illustrating average speed per question, topic weakness meters, and automated remediation video logs to address knowledge gaps.",
      icon: BarChart4,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    },
    {
      title: "Coach Refik (AI Assistant)",
      desc: "A personalized AI learning support engine that analyzes the last 5 exam attempts, tracks streaks, and outputs motivational or strict coaching guidelines to direct the student's focus.",
      icon: Cpu,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden">
      <PublicNavbar />
      
      {/* Background Gradients */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-[36rem] w-[36rem] rounded-full bg-[#6366f1]/[0.05] blur-[120px]" />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Features & Architecture</span>
          <h1 className="font-outfit text-4xl font-extrabold text-white">How SomPrep AI Helps Students Master Curricula</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            SomPrep AI is a structured exam-preparation engine. Learn how our custom tools, question banks, and progress analytics help students prepare with direction.
          </p>
        </div>

        {/* Features list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24 max-w-5xl mx-auto">
          {featureBlocks.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="rounded-3xl border border-slate-800 bg-[#1e293b]/40 p-8 space-y-4 hover:border-slate-700 transition flex flex-col justify-between">
                <div className="space-y-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${feat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">{feat.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Platform FAQs */}
        <div className="max-w-4xl mx-auto border-t border-slate-800/60 pt-20">
          <div className="text-center mb-12">
            <h2 className="font-outfit text-3xl font-extrabold text-white flex items-center justify-center gap-2">
              <HelpCircle className="h-6 w-6 text-indigo-400" />
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-slate-400 mt-1">Concise answers regarding the platform and subscription model.</p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "What is SomPrep AI?",
                a: "SomPrep AI is a digital exam preparation platform designed for Somali students (Grades 1-12) to access structured lessons, mock trials, and diagnostics."
              },
              {
                q: "Which grades are supported?",
                a: "We support learning courses across Grades 1 through 12, mapping concepts from Primary, Middle, and Secondary stages."
              },
              {
                q: "Is it only for Grade 8 and Grade 12?",
                a: "No. While it has specialized mock simulation blocks for the Grade 8 regional and Grade 12 national unified exams, it provides daily subject learning roadmaps for all grades."
              },
              {
                q: "How does exam simulation work?",
                a: "Students can choose specific subjects or mock tests. The platform loads timed challenges, logs answers, flags mistakes in the wrong-answer notebook, and outputs diagnostics."
              },
              {
                q: "Are questions reviewed?",
                a: "Yes. Every single question inside our database undergoes structured academic review by qualified local Somali teachers before being approved for publishing."
              },
              {
                q: "Does AI generate final answers automatically?",
                a: "No. AI only supports study guidance (like recommending study paths and diagnosing topic weaknesses). All question solutions are written by human experts to ensure correctness."
              },
              {
                q: "Can schools use SomPrep AI?",
                a: "Yes. Schools can purchase voucher batches for students, review classroom accuracy metrics, and assign mock tests."
              },
              {
                q: "How does payment work?",
                a: "Students can start secure mobile-money checkout for 12 months of access, or redeem code vouchers provided by their schools."
              },
              {
                q: "Can students use it on mobile?",
                a: "Yes. The platform is optimized for mobile browser viewports, recognizing that most Somali students access the internet via cellular smartphones."
              },
              {
                q: "Is there sponsored access for students?",
                a: "Yes. Local sponsors, NGOs, or school administrations can buy license vouchers to distribute to students who cannot afford the registration fee."
              }
            ].map((faq, idx) => (
              <div key={idx} className="rounded-xl border border-slate-800 bg-[#1e293b]/25 overflow-hidden">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left p-5 flex items-center justify-between text-xs font-bold text-white hover:bg-slate-800/40 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform text-slate-400 ${activeFaq === idx ? "rotate-180 text-white" : ""}`} />
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-850 pt-3 bg-slate-900/10">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA section */}
        <div className="max-w-4xl mx-auto mt-20 rounded-3xl bg-gradient-to-r from-indigo-900/40 to-slate-900/40 border border-indigo-500/10 p-10 text-center space-y-6">
          <h2 className="text-xl font-bold text-white">Ready to elevate your school performance?</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Create an account today to access diagnostics, practice tests, and start tracking your path to success.
          </p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => {
                if (user) {
                  navigate("/packages");
                } else {
                  navigate("/login?redirect=/packages");
                }
              }}
              className="rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] px-6 py-3 text-xs font-bold text-white transition"
            >
              Get Started Free
            </button>
            <button 
              onClick={() => navigate("/packages")}
              className="rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 px-6 py-3 text-xs font-bold text-slate-300 transition"
            >
              View Pricing
            </button>
          </div>
        </div>

      </section>

      <PublicFooter />
    </div>
  );
}
