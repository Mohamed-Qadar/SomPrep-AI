import React, { useState, useEffect } from "react";
import TechnologyPageShell from "../components/TechnologyPageShell";
import ModuleGrid from "../components/ModuleGrid";
import { machineLearningModules } from "../data/technologySkills";
import { techApi } from "../services/endpoints";
import { useAuth } from "../context/AuthContext";
import { FileText, CheckCircle2 } from "lucide-react";

export default function MachineLearningSkills() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    const loadLessons = async () => {
      if (!user) return;
      try {
        const res = await techApi.trackDetail("machine-learning");
        if (res.data.lessons) {
          setLessons(res.data.lessons);
        }
      } catch (err) {
        console.error("Failed to load live lessons", err);
      }
    };
    loadLessons();
  }, [user]);

  return (
    <TechnologyPageShell
      eyebrow="Introductory Machine Learning"
      title="Machine Learning Basics"
      audience="Beginner-friendly concepts and simple Python practice"
      intro="A careful introduction to machine learning for learners who already have basic Python and data skills. The path focuses on concepts, responsible use, and small practice projects."
    >
      <ModuleGrid title="Modules" modules={machineLearningModules} />

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
                      <span className="text-[10px] font-semibold text-slate-555 mt-1 block">
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
        <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/[0.05] p-8">
          <h2 className="font-outfit text-2xl font-extrabold text-white">Introductory Scope</h2>
          <p className="mt-3 max-w-3xl text-sm text-slate-400 leading-relaxed">
            This learning path introduces machine learning in a practical, beginner-friendly way. It
            does not promise expert-level mastery; it helps learners understand the basic ideas,
            vocabulary, and simple workflows needed before deeper study.
          </p>
        </div>
      </section>
    </TechnologyPageShell>
  );
}
