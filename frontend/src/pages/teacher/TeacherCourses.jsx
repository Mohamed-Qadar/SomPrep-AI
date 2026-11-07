import React, { useEffect, useState } from "react";
import { lmsApi, teacherApi } from "../../services/endpoints";
import LoadingState from "../../components/LoadingState";
import {
  BookOpen,
  Plus,
  Trash2,
  Pencil,
  Video,
  FileText,
  ClipboardList,
  PenSquare,
  Upload,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Layers,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const LESSON_TYPES = [
  { value: "video", label: "Video (Muuqaal)", icon: Video },
  { value: "material", label: "Material (PDF/Slides)", icon: FileText },
  { value: "quiz", label: "Quiz (Imtixaan)", icon: ClipboardList },
  { value: "assignment", label: "Assignment (Shaqo)", icon: PenSquare },
];

const emptyCourseForm = { title: "", description: "", subject: "", grade_level: 12, is_published: false };
const emptyLessonForm = { title: "", lesson_type: "video", content_url: "", content_text: "", exam_id: "", duration_minutes: 0 };

export default function TeacherCourses() {
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [expanded, setExpanded] = useState({});
  const [courseModal, setCourseModal] = useState(null); // null | {id?, form}
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterFor, setChapterFor] = useState(null); // course id receiving a new chapter
  const [lessonModal, setLessonModal] = useState(null); // null | {chapterId, lessonId?, form}

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  };

  const load = async () => {
    try {
      setLoading(true);
      const [coursesRes, examsRes] = await Promise.all([lmsApi.myCourses(), teacherApi.exams()]);
      setCourses(coursesRes.data);
      setExams(examsRes.data);
    } catch (err) {
      console.error("Failed to load courses:", err);
      setError("Koorsooyinka lama soo rari karin. (Could not load courses.)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── Course actions ─────────────────────────────────────────────────────────
  const saveCourse = async (e) => {
    e.preventDefault();
    const { id, form } = courseModal;
    if (!form.title.trim() || !form.subject.trim()) {
      setError("Course title and subject are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = { ...form, grade_level: parseInt(form.grade_level, 10) };
      if (id) {
        await lmsApi.updateCourse(id, payload);
        flash("Course updated.");
      } else {
        await lmsApi.createCourse(payload);
        flash("Course created — add chapters and lessons below.");
      }
      setCourseModal(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Course could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = async (course) => {
    setBusy(true);
    try {
      await lmsApi.updateCourse(course.id, { is_published: !course.is_published });
      flash(course.is_published ? "Course hidden from students." : "Course published to students.");
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not change publish state.");
    } finally {
      setBusy(false);
    }
  };

  const removeCourse = async (course) => {
    if (!window.confirm(`Delete course "${course.title}" with all its chapters and lessons?`)) return;
    setBusy(true);
    try {
      await lmsApi.deleteCourse(course.id);
      flash("Course deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Course could not be deleted.");
    } finally {
      setBusy(false);
    }
  };

  // ── Chapter actions ────────────────────────────────────────────────────────
  const addChapter = async (courseId) => {
    if (!chapterTitle.trim()) return;
    setBusy(true);
    try {
      await lmsApi.addChapter(courseId, { title: chapterTitle.trim(), sort_order: 0 });
      setChapterTitle("");
      setChapterFor(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Chapter could not be added.");
    } finally {
      setBusy(false);
    }
  };

  const removeChapter = async (chapter) => {
    if (!window.confirm(`Delete chapter "${chapter.title}" and its lessons?`)) return;
    setBusy(true);
    try {
      await lmsApi.deleteChapter(chapter.id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  // ── Lesson actions ─────────────────────────────────────────────────────────
  const saveLesson = async (e) => {
    e.preventDefault();
    const { chapterId, lessonId, form, file } = lessonModal;
    if (!form.title.trim()) {
      setError("Lesson title is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        lesson_type: form.lesson_type,
        content_url: form.content_url || null,
        content_text: form.content_text || null,
        exam_id: form.lesson_type === "quiz" && form.exam_id ? parseInt(form.exam_id, 10) : null,
        duration_minutes: parseInt(form.duration_minutes, 10) || 0,
      };
      const res = lessonId
        ? await lmsApi.updateLesson(lessonId, payload)
        : await lmsApi.addLesson(chapterId, payload);
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        await lmsApi.uploadLessonFile(res.data.id, fd);
      }
      setLessonModal(null);
      flash(lessonId ? "Lesson updated." : "Lesson added.");
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Lesson could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const removeLesson = async (lesson) => {
    if (!window.confirm(`Delete lesson "${lesson.title}"?`)) return;
    setBusy(true);
    try {
      await lmsApi.deleteLesson(lesson.id);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState label="Loading course builder..." />;

  const lessonIcon = (type) => {
    const found = LESSON_TYPES.find((t) => t.value === type);
    const Icon = found ? found.icon : FileText;
    return <Icon className="h-3.5 w-3.5 shrink-0" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black font-outfit text-white">
            <Layers className="h-5 w-5 text-brand-primary" />
            Koorsooyinka (Course Builder)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dhis koorso buuxda: cutubyo, casharo muuqaal ah, agab PDF, imtixaanno iyo shaqo-guri.
            Ardayda fasalkaaga ee package-koodu firfircoon yahay ayaa arki kara marka aad daabacdo.
          </p>
        </div>
        <button
          onClick={() => setCourseModal({ form: { ...emptyCourseForm } })}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition shadow-lg shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Course</span>
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-brand-danger/10 border border-brand-danger/20 p-4 text-sm text-brand-danger">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2.5 rounded-xl bg-brand-success/10 border border-brand-success/20 p-4 text-sm text-brand-success">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {/* Course list */}
      {courses.length === 0 ? (
        <div className="rounded-2xl border border-brand-border bg-slate-900/40 p-10 text-center">
          <BookOpen className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-bold text-white">No courses yet</p>
          <p className="text-xs text-slate-500 mt-1">Create your first course, then add chapters and lessons.</p>
        </div>
      ) : (
        courses.map((course) => (
          <div key={course.id} className="rounded-2xl border border-brand-border bg-slate-900/40 overflow-hidden">
            {/* Course header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5">
              <button
                onClick={() => setExpanded((p) => ({ ...p, [course.id]: !p[course.id] }))}
                className="flex items-center gap-3 text-left min-w-0"
              >
                {expanded[course.id] ? (
                  <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">{course.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {course.subject} · Grade {course.grade_level} · {course.chapters.length} chapters ·{" "}
                    {course.chapters.reduce((n, c) => n + c.lessons.length, 0)} lessons
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                  course.is_published
                    ? "bg-brand-success/10 text-brand-success"
                    : "bg-slate-700/40 text-slate-400"
                }`}>
                  {course.is_published ? "Published" : "Draft"}
                </span>
                <button
                  onClick={() => togglePublish(course)}
                  disabled={busy}
                  title={course.is_published ? "Hide from students" : "Publish to students"}
                  className="rounded-lg border border-brand-border p-2 text-slate-300 hover:bg-slate-800/60 disabled:opacity-50"
                >
                  {course.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setCourseModal({ id: course.id, form: {
                    title: course.title, description: course.description || "",
                    subject: course.subject, grade_level: course.grade_level,
                    is_published: course.is_published,
                  }})}
                  className="rounded-lg border border-brand-border p-2 text-brand-primary hover:bg-brand-primary/10"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => removeCourse(course)}
                  disabled={busy}
                  className="rounded-lg border border-brand-danger/40 p-2 text-brand-danger hover:bg-brand-danger/10 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Chapters & lessons */}
            {expanded[course.id] && (
              <div className="border-t border-brand-border/50 p-5 pt-4 space-y-4 bg-slate-950/30">
                {course.chapters.map((chapter, ci) => (
                  <div key={chapter.id} className="rounded-xl border border-slate-800 bg-slate-900/40">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/70">
                      <span className="text-xs font-bold text-white">
                        <span className="text-slate-500 mr-2">Chapter {ci + 1}</span>
                        {chapter.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setLessonModal({ chapterId: chapter.id, form: { ...emptyLessonForm } })}
                          className="flex items-center gap-1 rounded-lg border border-brand-border px-2.5 py-1.5 text-[11px] font-bold text-brand-primary hover:bg-brand-primary/10"
                        >
                          <Plus className="h-3 w-3" /> Lesson
                        </button>
                        <button
                          onClick={() => removeChapter(chapter)}
                          className="rounded-lg border border-brand-danger/40 p-1.5 text-brand-danger hover:bg-brand-danger/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    {chapter.lessons.length === 0 ? (
                      <p className="px-4 py-3 text-[11px] text-slate-500">No lessons yet.</p>
                    ) : (
                      <ul className="divide-y divide-slate-800/60">
                        {chapter.lessons.map((lesson) => (
                          <li key={lesson.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                            <div className="flex items-center gap-2.5 min-w-0 text-slate-300">
                              <span className="text-indigo-400">{lessonIcon(lesson.lesson_type)}</span>
                              <span className="truncate font-semibold">{lesson.title}</span>
                              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-400 shrink-0">
                                {lesson.lesson_type}
                              </span>
                              {lesson.original_filename && (
                                <span className="text-[10px] text-slate-500 truncate hidden sm:inline">
                                  📎 {lesson.original_filename}
                                </span>
                              )}
                              {lesson.duration_minutes > 0 && (
                                <span className="text-[10px] text-slate-500 shrink-0">{lesson.duration_minutes} min</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => setLessonModal({
                                  chapterId: chapter.id, lessonId: lesson.id,
                                  form: {
                                    title: lesson.title, lesson_type: lesson.lesson_type,
                                    content_url: lesson.content_url || "", content_text: lesson.content_text || "",
                                    exam_id: lesson.exam_id || "", duration_minutes: lesson.duration_minutes,
                                  },
                                })}
                                className="rounded-md border border-brand-border p-1.5 text-brand-primary hover:bg-brand-primary/10"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => removeLesson(lesson)}
                                className="rounded-md border border-brand-danger/40 p-1.5 text-brand-danger hover:bg-brand-danger/10"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}

                {/* Add chapter inline */}
                {chapterFor === course.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addChapter(course.id)}
                      placeholder="Chapter title, e.g. Mechanics"
                      className="flex-1 rounded-xl border border-brand-border bg-slate-900 py-2.5 px-4 text-xs text-white focus:border-brand-primary focus:outline-none"
                    />
                    <button
                      onClick={() => addChapter(course.id)}
                      disabled={busy}
                      className="rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setChapterFor(null); setChapterTitle(""); }}
                      className="rounded-xl border border-brand-border px-4 py-2.5 text-xs font-bold text-slate-400"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setChapterFor(course.id); setChapterTitle(""); }}
                    className="flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add chapter
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      )}

      {/* ── Course modal ── */}
      {courseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form onSubmit={saveCourse} className="w-full max-w-lg rounded-2xl border border-brand-border bg-[#130b24] p-6 space-y-4">
            <h3 className="text-sm font-black text-white">{courseModal.id ? "Edit Course" : "New Course"}</h3>
            <input
              placeholder="Course title *"
              value={courseModal.form.title}
              onChange={(e) => setCourseModal((m) => ({ ...m, form: { ...m.form, title: e.target.value } }))}
              className="w-full rounded-xl border border-brand-border bg-slate-900 py-2.5 px-4 text-xs text-white focus:border-brand-primary focus:outline-none"
            />
            <textarea
              placeholder="Short description"
              rows={2}
              value={courseModal.form.description}
              onChange={(e) => setCourseModal((m) => ({ ...m, form: { ...m.form, description: e.target.value } }))}
              className="w-full rounded-xl border border-brand-border bg-slate-900 py-2.5 px-4 text-xs text-white focus:border-brand-primary focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Subject, e.g. Physics *"
                value={courseModal.form.subject}
                onChange={(e) => setCourseModal((m) => ({ ...m, form: { ...m.form, subject: e.target.value } }))}
                className="rounded-xl border border-brand-border bg-slate-900 py-2.5 px-4 text-xs text-white focus:border-brand-primary focus:outline-none"
              />
              <select
                value={courseModal.form.grade_level}
                onChange={(e) => setCourseModal((m) => ({ ...m, form: { ...m.form, grade_level: e.target.value } }))}
                className="rounded-xl border border-brand-border bg-slate-900 py-2.5 px-4 text-xs text-white focus:border-brand-primary focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={courseModal.form.is_published}
                onChange={(e) => setCourseModal((m) => ({ ...m, form: { ...m.form, is_published: e.target.checked } }))}
              />
              Published (visible to students)
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setCourseModal(null)}
                className="rounded-xl border border-brand-border px-4 py-2.5 text-xs font-bold text-slate-400">
                Cancel
              </button>
              <button type="submit" disabled={busy}
                className="rounded-xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                {busy ? "Saving..." : "Save Course"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Lesson modal ── */}
      {lessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form onSubmit={saveLesson} className="w-full max-w-lg rounded-2xl border border-brand-border bg-[#130b24] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-black text-white">{lessonModal.lessonId ? "Edit Lesson" : "New Lesson"}</h3>
            <input
              placeholder="Lesson title *"
              value={lessonModal.form.title}
              onChange={(e) => setLessonModal((m) => ({ ...m, form: { ...m.form, title: e.target.value } }))}
              className="w-full rounded-xl border border-brand-border bg-slate-900 py-2.5 px-4 text-xs text-white focus:border-brand-primary focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              {LESSON_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLessonModal((m) => ({ ...m, form: { ...m.form, lesson_type: value } }))}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[11px] font-bold transition ${
                    lessonModal.form.lesson_type === value
                      ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                      : "border-brand-border text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            {lessonModal.form.lesson_type === "video" && (
              <input
                placeholder="Video URL (YouTube or direct link)"
                value={lessonModal.form.content_url}
                onChange={(e) => setLessonModal((m) => ({ ...m, form: { ...m.form, content_url: e.target.value } }))}
                className="w-full rounded-xl border border-brand-border bg-slate-900 py-2.5 px-4 text-xs text-white focus:border-brand-primary focus:outline-none"
              />
            )}

            {lessonModal.form.lesson_type === "quiz" && (
              <select
                value={lessonModal.form.exam_id}
                onChange={(e) => setLessonModal((m) => ({ ...m, form: { ...m.form, exam_id: e.target.value } }))}
                className="w-full rounded-xl border border-brand-border bg-slate-900 py-2.5 px-4 text-xs text-white focus:border-brand-primary focus:outline-none"
              >
                <option value="">— Link one of your exams —</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} ({ex.exam_type}, Grade {ex.grade_level})
                  </option>
                ))}
              </select>
            )}

            {lessonModal.form.lesson_type === "assignment" && (
              <textarea
                placeholder="Assignment instructions for students..."
                rows={3}
                value={lessonModal.form.content_text}
                onChange={(e) => setLessonModal((m) => ({ ...m, form: { ...m.form, content_text: e.target.value } }))}
                className="w-full rounded-xl border border-brand-border bg-slate-900 py-2.5 px-4 text-xs text-white focus:border-brand-primary focus:outline-none"
              />
            )}

            {["material", "assignment"].includes(lessonModal.form.lesson_type) && (
              <label className="flex items-center gap-2 rounded-xl border border-dashed border-brand-border px-4 py-3 text-[11px] text-slate-400 cursor-pointer hover:border-brand-primary/60">
                <Upload className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {lessonModal.file ? lessonModal.file.name : "Attach file (PDF, Word, PowerPoint, PNG...)"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.webp,.zip"
                  onChange={(e) => setLessonModal((m) => ({ ...m, file: e.target.files[0] }))}
                />
              </label>
            )}

            <input
              type="number"
              min={0}
              placeholder="Duration (minutes)"
              value={lessonModal.form.duration_minutes}
              onChange={(e) => setLessonModal((m) => ({ ...m, form: { ...m.form, duration_minutes: e.target.value } }))}
              className="w-full rounded-xl border border-brand-border bg-slate-900 py-2.5 px-4 text-xs text-white focus:border-brand-primary focus:outline-none"
            />

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setLessonModal(null)}
                className="rounded-xl border border-brand-border px-4 py-2.5 text-xs font-bold text-slate-400">
                Cancel
              </button>
              <button type="submit" disabled={busy}
                className="rounded-xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                {busy ? "Saving..." : "Save Lesson"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
