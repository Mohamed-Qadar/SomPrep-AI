import React, { useState, useEffect } from "react";
import TechnologyPageShell from "../components/TechnologyPageShell";
import ModuleGrid from "../components/ModuleGrid";
import { dataAnalysisModules, dataAnalysisProjects } from "../data/technologySkills";
import { techApi } from "../services/endpoints";
import { useAuth } from "../context/AuthContext";
import { BarChart3, FileText, CheckCircle2 } from "lucide-react";

export default function DataAnalysisSkills() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    const loadLessons = async () => {
      if (!user) return;
      try {
        const res = await techApi.trackDetail("data-analysis");
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
      eyebrow="Data Analysis Learning Path"
      title="Data Analysis Skills"
      audience="Excel, Python, dashboards, and reporting"
      intro="A practical path for learners who want to organize data, clean it, create charts, and write useful reports for school, business, and field work."
    >
      <ModuleGrid title="Modules" modules={dataAnalysisModules} />

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
        <h2 className="font-outfit text-2xl font-extrabold text-white">Sample Projects</h2>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dataAnalysisProjects.map((project) => (
            <div key={project} className="rounded-2xl border border-white/[0.06] bg-[#1a1130]/40 p-5">
              <BarChart3 className="h-5 w-5 text-indigo-300" />
              <p className="mt-3 text-sm font-bold text-white">{project}</p>
            </div>
          ))}
        </div>
      </section>
    </TechnologyPageShell>
  );
}
