import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { lmsApi } from "../../services/endpoints";
import { downloadAuthenticatedFile } from "../../utils/downloadFile";
import LoadingState from "../../components/LoadingState";
import {
  BookOpen,
  Video,
  FileText,
  ClipboardList,
  PenSquare,
  Download,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  GraduationCap,
} from "lucide-react";

const TYPE_META = {
  video: { icon: Video, label: "Video" },
  material: { icon: FileText, label: "Material" },
  quiz: { icon: ClipboardList, label: "Quiz" },
  assignment: { icon: PenSquare, label: "Assignment" },
};

export default function StudentCoursesLms() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openCourse, setOpenCourse] = useState(null);

  useEffect(() => {
    lmsApi.studentCourses()
      .then((res) => {
        setCourses(res.data);
        if (res.data.length > 0) setOpenCourse(res.data[0].id);
      })
      .catch((err) => {
        console.error("Failed to load courses:", err);
        setError(
          err.response?.status === 403
            ? "Koorsooyinku waxay u furan yihiin ardayda package-koodu firfircoon yahay. (Courses are available to students with an active package.)"
            : "Koorsooyinka lama soo rari karin. (Could not load courses.)"
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const downloadLessonFile = async (lesson) => {
    try {
      await downloadAuthenticatedFile(lesson.file_download_url, lesson.original_filename);
    } catch (err) {
      console.error("Lesson file download failed:", err);
    }
  };

  const openLesson = (lesson) => {
    if (lesson.lesson_type === "quiz" && lesson.exam_id) {
      navigate(`/exam/teacher/${lesson.exam_id}`);
    } else if (lesson.content_url) {
      window.open(lesson.content_url, "_blank", "noreferrer");
    } else if (lesson.file_download_url) {
      downloadLessonFile(lesson);
    }
  };

  if (loading) return <LoadingState label="Loading courses..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      {error && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 text-sm text-amber-400">
          {error}
        </div>
      )}

      {!error && courses.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center">
          <BookOpen className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-bold text-white">Weli koorso lama daabicin fasalkaaga.</p>
          <p className="text-xs text-slate-500 mt-1">No courses published for your grade yet — check back soon.</p>
        </div>
      )}

      {courses.map((course) => (
        <div key={course.id} className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <button
            onClick={() => setOpenCourse(openCourse === course.id ? null : course.id)}
            className="w-full flex items-center justify-between gap-3 p-5 text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white truncate">{course.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {course.subject} · Macallin {course.teacher_name} ·{" "}
                  {course.chapters.reduce((n, c) => n + c.lessons.length, 0)} lessons
                </div>
              </div>
            </div>
            {openCourse === course.id ? (
              <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
            )}
          </button>

          {openCourse === course.id && (
            <div className="border-t border-slate-800/70 p-5 pt-4 space-y-4 bg-slate-950/30">
              {course.description && (
                <p className="text-xs text-slate-400 leading-relaxed">{course.description}</p>
              )}
              {course.chapters.map((chapter, ci) => (
                <div key={chapter.id}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                    Chapter {ci + 1} · {chapter.title}
                  </p>
                  <ul className="space-y-1.5">
                    {chapter.lessons.map((lesson) => {
                      const meta = TYPE_META[lesson.lesson_type] || TYPE_META.material;
                      const Icon = meta.icon;
                      return (
                        <li key={lesson.id}>
                          <button
                            onClick={() => openLesson(lesson)}
                            className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-left transition hover:border-indigo-500/40 hover:bg-slate-800/40"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon className="h-4 w-4 text-indigo-400 shrink-0" />
                              <div className="min-w-0">
                                <span className="block text-xs font-semibold text-white truncate">{lesson.title}</span>
                                {lesson.lesson_type === "assignment" && lesson.content_text && (
                                  <span className="block text-[10px] text-slate-500 truncate">{lesson.content_text}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-500">
                              {lesson.duration_minutes > 0 && <span>{lesson.duration_minutes} min</span>}
                              {lesson.lesson_type === "quiz" ? (
                                <span className="flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 font-bold text-indigo-300">
                                  <PlayCircle className="h-3 w-3" /> Start
                                </span>
                              ) : lesson.file_download_url ? (
                                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 font-bold text-emerald-300">
                                  <Download className="h-3 w-3" /> Download
                                </span>
                              ) : lesson.content_url ? (
                                <span className="flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 font-bold text-slate-300">
                                  <PlayCircle className="h-3 w-3" /> Open
                                </span>
                              ) : null}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
