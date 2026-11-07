import React, { useState, useEffect } from "react";
import TechnologyPageShell from "../components/TechnologyPageShell";
import { programmingTracks } from "../data/technologySkills";
import { techApi } from "../services/endpoints";
import { useAuth } from "../context/AuthContext";
import { CheckCircle2, Code2, FileText } from "lucide-react";

export default function ProgrammingSkills() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    const loadLessons = async () => {
      if (!user) return;
      try {
        const res = await techApi.trackDetail("programming-skills");
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
      eyebrow="Programming Learning Path"
      title="Programming Foundations"
      audience="Python, C, and C++ beginner tracks"
      intro="Practice-based programming lessons that introduce logic, syntax, problem solving, quizzes, and mini-projects."
    >
      <section className="py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {programmingTracks.map((track) => (
            <div key={track.title} className="rounded-3xl border border-white/[0.06] bg-[#1a1130]/40 p-6">
              <Code2 className="h-6 w-6 text-indigo-300" />
              <h2 className="mt-4 text-xl font-extrabold text-white">{track.title}</h2>
              <div className="mt-5 space-y-2">
                {track.modules.map((module) => (
                  <div key={module} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                    <span>{module}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                <span className="rounded-lg bg-indigo-500/10 px-3 py-2">Lessons</span>
                <span className="rounded-lg bg-indigo-500/10 px-3 py-2">Practice tasks</span>
                <span className="rounded-lg bg-indigo-500/10 px-3 py-2">Quiz</span>
                <span className="rounded-lg bg-indigo-500/10 px-3 py-2">Mini project</span>
              </div>
            </div>
          ))}
        </div>
      </section>

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
    </TechnologyPageShell>
  );
}
