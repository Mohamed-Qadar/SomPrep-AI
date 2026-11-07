import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  GraduationCap,
  Laptop,
  Languages,
  ListChecks,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import videoThumbnail from "../assets/video_thumbnail.png";
import { packagesData } from "../data/packagesData";
import { handlePackageSelect } from "../utils/packageSelection";

const featuredPackages = [
  {
    id: "academic",
    title: "Academic Exam Prep",
    icon: GraduationCap,
    description:
      "Practice school subjects, mock exams, and wrong-answer review for Somali students from Grade 1 to Grade 12.",
  },
  {
    id: "office-skills",
    title: "Office Skills",
    icon: FileText,
    description:
      "Learn Word, Excel, PowerPoint, typing, and assignment skills with simple lessons for school and daily work.",
  },
  {
    id: "professional-tech",
    title: "Professional Tech Skills",
    icon: Laptop,
    description:
      "Build job-ready skills in programming, data analysis, machine learning basics, and practical projects.",
  },
];

const howItWorks = [
  "Choose your package",
  "Register with your phone number",
  "Pay using mobile money",
  "Start learning",
];

const whySomPrep = [
  {
    title: "Somali + English learning",
    description: "Clear explanations for students who learn best in Somali, English, or both.",
    icon: Languages,
  },
  {
    title: "Exam practice",
    description: "Mock exams, quizzes, and wrong-answer review help students prepare with direction.",
    icon: ListChecks,
  },
  {
    title: "Affordable packages",
    description: "Simple prices and mobile money checkout make access easier for Somali families.",
    icon: CreditCard,
  },
  {
    title: "Technology skills for jobs",
    description: "Office and professional tech courses help students build useful digital skills.",
    icon: Briefcase,
  },
];

const faqs = [
  {
    q: "Can I pay with mobile money?",
    a: "Yes. SomPrep AI supports mobile money payment flow for student packages.",
  },
  {
    q: "Can I use Somali language?",
    a: "Yes. The platform is designed for Somali students and supports Somali and English learning.",
  },
  {
    q: "What packages are available?",
    a: "You can choose Academic Exam Prep, Office Skills, or Professional Tech Skills.",
  },
  {
    q: "Can I learn technology skills?",
    a: "Yes. SomPrep AI includes Office Skills and Professional Tech Skills for digital and job-ready learning.",
  },
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(0);

  const startLearning = () => {
    navigate(user ? "/dashboard" : "/register");
  };

  const choosePackage = () => {
    const packagesSection = document.getElementById("packages");
    if (packagesSection) {
      packagesSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0c031a] text-white">
      <PublicNavbar />

      <main>
        <section className="relative border-b border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.28),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(244,63,94,0.14),transparent_30%)]" />
          <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
            <div className="max-w-3xl text-center lg:text-left">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-500/10 px-4 py-2 text-sm font-bold text-indigo-200">
                <Sparkles className="h-4 w-4" />
                Built for Somali students
              </div>

              <h1 className="font-outfit text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Prepare for Exams. Learn Skills. Pay Easily.
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl lg:mx-0">
                SomPrep AI helps Somali students practice exams, watch lessons, and learn job-ready technology skills in Somali and English.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <button
                  onClick={startLearning}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 text-base font-black text-white shadow-xl shadow-indigo-950/30 transition hover:bg-indigo-500 active:scale-[0.98]"
                >
                  Start Learning
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  onClick={choosePackage}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-base font-black text-white transition hover:bg-white/10"
                >
                  Choose Package
                </button>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
                {["Exam prep", "Video lessons", "Mobile money payment"].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-200">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-black/30">
              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#120826]">
                <img
                  src={videoThumbnail}
                  alt="SomPrep AI lesson preview"
                  className="h-64 w-full object-cover sm:h-80"
                />
                <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
                  <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4">
                    <BookOpen className="mb-3 h-6 w-6 text-indigo-300" />
                    <p className="text-sm font-black text-white">Practice exams and lessons in one place</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <Smartphone className="mb-3 h-6 w-6 text-emerald-300" />
                    <p className="text-sm font-black text-white">Simple phone registration and payment</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="packages" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <h2 className="font-outfit text-3xl font-black text-white sm:text-4xl">Choose a package</h2>
            <p className="mt-3 text-base leading-7 text-slate-300">
              Pick one clear path. You can register with your phone number and continue to the payment screen.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {featuredPackages.map((item) => {
              const pkg = packagesData[item.id];
              const Icon = item.icon;
              return (
                <article
                  key={item.id}
                  className="flex min-h-[320px] flex-col rounded-3xl border border-white/10 bg-[#140923] p-6 shadow-xl shadow-black/20"
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-200">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-outfit text-2xl font-black text-white">{item.title}</h3>
                  <p className="mt-3 flex-1 text-base leading-7 text-slate-300">{item.description}</p>
                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm font-bold uppercase tracking-wide text-slate-400">Price</p>
                    <p className="mt-1 text-2xl font-black text-white">{pkg.annualLabel || pkg.annualPrice}</p>
                  </div>
                  <button
                    onClick={() => handlePackageSelect({ packageId: item.id, user, navigate })}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-base font-black text-white transition hover:bg-indigo-500 active:scale-[0.98]"
                  >
                    Bixi Hadda / Pay Now
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.03]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <h2 className="font-outfit text-3xl font-black text-white sm:text-4xl">How It Works</h2>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {howItWorks.map((step, index) => (
                <div key={step} className="rounded-3xl border border-white/10 bg-[#120826] p-6">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-black text-white">
                    {index + 1}
                  </div>
                  <p className="text-xl font-black text-white">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <h2 className="font-outfit text-3xl font-black text-white sm:text-4xl">Why SomPrep AI?</h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                SomPrep AI keeps learning simple: clear lessons, practical exams, affordable access, and skills students can use beyond school.
              </p>
              <Link
                to="/sample-videos"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                View Sample Videos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {whySomPrep.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-3xl border border-white/10 bg-[#140923] p-6">
                    <Icon className="mb-4 h-7 w-7 text-indigo-300" />
                    <h3 className="text-lg font-black text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-14 sm:px-6 lg:px-8">
          <div className="mb-6 text-center">
            <h2 className="font-outfit text-3xl font-black text-white sm:text-4xl">FAQ</h2>
            <p className="mt-3 text-base text-slate-300">Simple answers before you start.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={faq.q} className="overflow-hidden rounded-3xl border border-white/10 bg-[#140923]">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-black text-white"
                  >
                    {faq.q}
                    <ChevronDown className={`h-5 w-5 shrink-0 text-indigo-300 transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && <p className="px-5 pb-5 text-sm leading-6 text-slate-300">{faq.a}</p>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-indigo-400/20 bg-indigo-600/15 p-7 text-center sm:p-10">
            <Users className="mx-auto mb-4 h-8 w-8 text-indigo-200" />
            <h2 className="font-outfit text-3xl font-black text-white">Ready to start?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-200">
              Choose a package, register with your phone number, and begin learning today.
            </p>
            <button
              onClick={choosePackage}
              className="mt-6 rounded-2xl bg-white px-7 py-4 text-base font-black text-[#120826] transition hover:bg-slate-100"
            >
              Choose Package
            </button>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
