import React, { useState, useEffect } from "react";
import TechnologyPageShell from "../components/TechnologyPageShell";
import ModuleGrid from "../components/ModuleGrid";
import { officeLessons, officeModules } from "../data/technologySkills";
import { techApi } from "../services/endpoints";
import { useAuth } from "../context/AuthContext";
import { handlePackageSelect } from "../utils/packageSelection";
import { useNavigate } from "react-router-dom";
import { CreditCard, FileText, CheckCircle2 } from "lucide-react";

export default function OfficeSkills() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    const loadLessons = async () => {
      if (!user) {
        setLessons(officeLessons.map((l, i) => ({ id: i, title: l, is_completed: false })));
        return;
      }
      try {
        const res = await techApi.trackDetail("office-skills");
        if (res.data.lessons) {
          setLessons(res.data.lessons);
        }
      } catch (err) {
        console.error("Failed to load live lessons", err);
        setLessons(officeLessons.map((l, i) => ({ id: i, title: l, is_completed: false })));
      }
    };
    loadLessons();
  }, [user]);

  return (
    <TechnologyPageShell
      eyebrow="Office Skills Track"
      title="Office Skills for Middle and Secondary Students"
      audience="Grade 7-12 students"
      intro="A beginner-friendly path for students who need stronger computer confidence, document preparation, spreadsheets, and school presentation skills."
    >
      <section className="py-8">
        <button
          onClick={() => handlePackageSelect({ packageId: "office-skills", user, navigate })}
          className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-[#6366f1] px-6 py-3.5 text-xs font-bold text-white transition hover:bg-[#4f46e5] active:scale-[0.98]"
        >
          <CreditCard className="h-4 w-4" />
          <span>Bixi Hadda - Office Skills ($3.00)</span>
        </button>
      </section>

      <ModuleGrid title="Modules" modules={officeModules} />

      <section className="py-10">
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
    </TechnologyPageShell>
  );
}
