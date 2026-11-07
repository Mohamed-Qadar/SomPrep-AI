import React, { useState, useEffect } from "react";
import TechnologyPageShell from "../components/TechnologyPageShell";
import ModuleGrid from "../components/ModuleGrid";
import { professionalModules, professionalOutcomes } from "../data/technologySkills";
import { techApi } from "../services/endpoints";
import { useAuth } from "../context/AuthContext";
import { handlePackageSelect } from "../utils/packageSelection";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, CreditCard, FileText } from "lucide-react";

export default function ProfessionalTech() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    const loadLessons = async () => {
      if (!user) return;
      try {
        const [progRes, dataRes, mlRes] = await Promise.all([
          techApi.trackDetail("programming-skills").catch(() => null),
          techApi.trackDetail("data-analysis").catch(() => null),
          techApi.trackDetail("machine-learning").catch(() => null)
        ]);
        
        let allLessons = [];
        if (progRes?.data?.lessons) {
          allLessons = [...allLessons, ...progRes.data.lessons];
        }
        if (dataRes?.data?.lessons) {
          allLessons = [...allLessons, ...dataRes.data.lessons];
        }
        if (mlRes?.data?.lessons) {
          allLessons = [...allLessons, ...mlRes.data.lessons];
        }
        
        setLessons(allLessons.slice(0, 10)); // Sample first 10 lessons
      } catch (err) {
        console.error("Failed to load live lessons", err);
      }
    };
    loadLessons();
  }, [user]);

  return (
    <TechnologyPageShell
      eyebrow="Professional Technology Track"
      title="Professional Technology Skills for Graduates and Workers"
      audience="University students, graduates, unemployed youth, and field workers"
      intro="A structured path for learners who want practical productivity, analysis, programming, machine learning, and portfolio-building foundations."
    >
      <section className="py-8">
        <button
          onClick={() => handlePackageSelect({ packageId: "professional-tech", user, navigate })}
          className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-[#6366f1] px-6 py-3.5 text-xs font-bold text-white transition hover:bg-[#4f46e5] active:scale-[0.98]"
        >
          <CreditCard className="h-4 w-4" />
          <span>Bixi Hadda - Professional Tech ($5.00)</span>
        </button>
      </section>

      <ModuleGrid title="Modules" modules={professionalModules} />

      {user && lessons.length > 0 && (
        <section className="py-10 border-t border-white/[0.05]">
          <h2 className="font-outfit text-2xl font-extrabold text-white">Syllabus Lessons</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="rounded-2xl border border-white/[0.06] bg-[#1a1130]/40 p-5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-indigo-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-white">{lesson.title}</p>
                    {lesson.duration_minutes && (
                      <span className="text-[10px] font-semibold text-slate-550 mt-1 block">
                        {lesson.duration_minutes} mins
                      </span>
                    )}
                  </div>
                </div>
                {lesson.is_completed && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="py-10">
        <h2 className="font-outfit text-2xl font-extrabold text-white">Learning Outcomes</h2>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {professionalOutcomes.map((outcome) => (
            <div key={outcome} className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-[#1a1130]/40 p-5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
              <span className="text-sm font-bold text-white">{outcome}</span>
            </div>
          ))}
        </div>
      </section>
    </TechnologyPageShell>
  );
}
