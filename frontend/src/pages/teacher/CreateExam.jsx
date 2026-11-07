import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { teacherApi } from "../../services/endpoints";
import {
  FileSpreadsheet,
  Upload,
  ArrowLeft,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  HelpCircle,
  Clock,
  Sparkles,
  Loader2,
} from "lucide-react";

export default function CreateExam() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Exam Meta Settings
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState(12);
  const [examType, setExamType] = useState("test");
  const [instructions, setInstructions] = useState("");
  const [duration, setDuration] = useState(60);
  const [isOpen, setIsOpen] = useState(true);
  const [allowReview, setAllowReview] = useState(true);

  // Questions Array
  const [questions, setQuestions] = useState([]);
  const [materialFiles, setMaterialFiles] = useState([]);

  // Current Question Builder Form State
  const [qText, setQText] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");
  const [correctKey, setCorrectKey] = useState("A");
  const [qExplanation, setQExplanation] = useState("");

  const handleAddQuestionLocal = (e) => {
    e.preventDefault();
    if (!qText.trim() || !optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) {
      setError("Fadlan buuxi qoraalka su'aasha iyo dhamaan afarta doorasho (A, B, C, D).");
      return;
    }

    const newQObj = {
      question_text: qText.trim(),
      option_a: optA.trim(),
      option_b: optB.trim(),
      option_c: optC.trim(),
      option_d: optD.trim(),
      correct_answer: correctKey,
      explanation: qExplanation.trim() || null,
      order_index: questions.length,
    };

    setQuestions([...questions, newQObj]);

    // Reset Form
    setQText("");
    setOptA("");
    setOptB("");
    setOptC("");
    setOptD("");
    setCorrectKey("A");
    setQExplanation("");
    setError("");
  };

  const removeQuestionLocal = (index) => {
    const nextQ = questions.filter((_, i) => i !== index);
    // Re-index order
    nextQ.forEach((q, idx) => {
      q.order_index = idx;
    });
    setQuestions(nextQ);
  };

  const moveQuestionLocal = (index, direction) => {
    const nextQ = [...questions];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= nextQ.length) return;

    // Swap
    const temp = nextQ[index];
    nextQ[index] = nextQ[targetIdx];
    nextQ[targetIdx] = temp;

    // Re-index order
    nextQ.forEach((q, idx) => {
      q.order_index = idx;
    });
    setQuestions(nextQ);
  };

  const handleSubmitExam = async () => {
    setError("");
    setSuccess("");

    if (!title.trim() || !subject.trim()) {
      setError("Fadlan buuxi cinwaanka imtixaanka iyo maaddada.");
      return;
    }

    if (questions.length === 0) {
      setError("Imtixaanku waa inuu leeyahay ugu yaraan hal su'aal.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        subject: subject.trim(),
        grade_level: parseInt(gradeLevel),
        exam_type: examType,
        instructions: instructions.trim() || null,
        duration_minutes: parseInt(duration) || 60,
        is_open: isOpen,
        allow_review: allowReview,
        questions: questions,
      };

      const examRes = await teacherApi.createExam(payload);
      const examId = examRes.data?.id;
      if (examId && materialFiles.length > 0) {
        await Promise.all(
          materialFiles.map((file) => {
            const formData = new FormData();
            formData.append("file", file);
            return teacherApi.uploadExamMaterial(examId, formData);
          })
        );
      }
      setSuccess("Imtixaanka iyo agabka casharka waa la keydiyay si guul leh!");
      setTimeout(() => {
        navigate("/teacher/exams");
      }, 1500);
    } catch (err) {
      console.error("Error creating exam:", err);
      setError(
        err.response?.data?.detail || "Waxaa dhacay qalad intii lagu jiray keydinta imtixaanka."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto animate-fade-in pb-16">
      {/* Left Pane - Exam Settings & Question Builder */}
      <div className="lg:col-span-7 min-w-0 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/teacher/exams")}
            className="rounded-lg p-2 hover:bg-slate-800 border border-transparent hover:border-brand-border transition-all text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-outfit text-2xl font-black text-white">Samee Imtixaan Cusub</h1>
            <p className="text-slate-500 text-xs mt-0.5">U diyaari imtixaan custom ah ardaydaada.</p>
          </div>
        </div>

        {error && (
          <div className="bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-sm rounded-xl p-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-brand-success/10 border border-brand-success/20 text-brand-success text-sm rounded-xl p-4">
            {success}
          </div>
        )}

        {/* 1. Basic Settings */}
        <div className="glass-panel border border-brand-border rounded-2xl p-6 space-y-5 shadow-xl">
          <h2 className="font-outfit text-lg font-bold text-white border-b border-brand-border/60 pb-2 flex items-center gap-2">
            <Clock className="h-5 w-5 text-brand-primary" />
            <span>Habaynta Imtixaanka (Exam Settings)</span>
          </h2>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Cinwaanka Imtixaanka (Exam Title) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Imtixaanka Cutubka 1aad ee Fiisigiska"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Maaddada (Subject) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Physics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Fasalka (Grade Level)
              </label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(parseInt(e.target.value))}
                className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Muddada (Minutes)
              </label>
              <input
                type="number"
                min={5}
                required
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Nooca Imtixaanka (Exam Type)
            </label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
            >
              <option value="quiz">Quiz (Su'aalo gaagaaban)</option>
              <option value="test">Test (Imtixaan caadi ah)</option>
              <option value="midterm">Midterm (Imtixaan badhtame)</option>
              <option value="final">Final (Imtixaan kama-dambeys)</option>
              <option value="homework">Homework (Shaqo guri)</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Imtixaanka waxaa arki kara oo keliya ardayda fasalka aad dooratay ee package-koodu firfircoon yahay.
              (Only students in the selected grade with an active package can access this exam.)
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Hawaalaha & Tilmaamaha Imtixaanka (Instructions)
            </label>
            <textarea
              rows={2}
              placeholder="Geli tilmaamaha ardaygu akhriyo intaanu bilaabin imtixaanka..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm text-slate-300 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={isOpen}
                onChange={(e) => setIsOpen(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-brand-border bg-slate-900 text-brand-primary focus:ring-0"
              />
              <span>Furan Imtixaanka (Is Open immediately)</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={allowReview}
                onChange={(e) => setAllowReview(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-brand-border bg-slate-900 text-brand-primary focus:ring-0"
              />
              <span>Ogolow in ardaygu eego casharada saxda ah markuu submits (Allow Review)</span>
            </label>
          </div>

          <div className="space-y-3 rounded-2xl border border-brand-border/50 bg-slate-950/30 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Upload className="h-4 w-4 text-brand-primary" />
              <span>Agabka Ardayda (PDF / Word / PowerPoint / files)</span>
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.png,.jpg,.jpeg,.webp,.zip"
              onChange={(e) => setMaterialFiles(Array.from(e.target.files || []))}
              className="block w-full rounded-xl border border-brand-border bg-slate-900 px-3 py-3 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-primary file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-blue-600"
            />
            {materialFiles.length > 0 && (
              <ul className="space-y-1 text-[11px] text-slate-400">
                {materialFiles.map((file) => (
                  <li key={`${file.name}-${file.size}`} className="truncate">{file.name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 2. Add Question Builder */}
        <div className="glass-panel border border-brand-border rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="font-outfit text-lg font-bold text-white border-b border-brand-border/60 pb-2 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-brand-primary" />
            <span>Qorista Su'aasha (Question Builder)</span>
          </h2>

          <form onSubmit={handleAddQuestionLocal} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Qoraalka Su'aasha (Question Text) *
              </label>
              <textarea
                rows={2}
                placeholder="Geli qoraalka su'aasha halkan..."
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 bg-slate-900/40 border border-brand-border/40 rounded-xl p-3 flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-950 text-slate-400">A</span>
                <input
                  type="text"
                  placeholder="Option A"
                  value={optA}
                  onChange={(e) => setOptA(e.target.value)}
                  className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none focus:ring-0"
                />
              </div>

              <div className="space-y-2 bg-slate-900/40 border border-brand-border/40 rounded-xl p-3 flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-950 text-slate-400">B</span>
                <input
                  type="text"
                  placeholder="Option B"
                  value={optB}
                  onChange={(e) => setOptB(e.target.value)}
                  className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none focus:ring-0"
                />
              </div>

              <div className="space-y-2 bg-slate-900/40 border border-brand-border/40 rounded-xl p-3 flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-950 text-slate-400">C</span>
                <input
                  type="text"
                  placeholder="Option C"
                  value={optC}
                  onChange={(e) => setOptC(e.target.value)}
                  className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none focus:ring-0"
                />
              </div>

              <div className="space-y-2 bg-slate-900/40 border border-brand-border/40 rounded-xl p-3 flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-950 text-slate-400">D</span>
                <input
                  type="text"
                  placeholder="Option D"
                  value={optD}
                  onChange={(e) => setOptD(e.target.value)}
                  className="flex-1 bg-transparent border-none text-sm text-white focus:outline-none focus:ring-0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Jawaabta Saxda ah (Correct Key) *
                </label>
                <div className="flex gap-2">
                  {["A", "B", "C", "D"].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCorrectKey(key)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-black transition-all ${
                        correctKey === key
                          ? "bg-brand-success border-brand-success text-white"
                          : "border-brand-border text-slate-500 hover:border-slate-500"
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Sharraxaadda Jawaabta (Explanation - Optional)
                </label>
                <input
                  type="text"
                  placeholder="Sharax sababta jawaabtu u saxan tahay..."
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl border border-brand-indigo/35 hover:border-white bg-brand-indigo/10 px-5 py-2.5 text-xs font-bold text-brand-indigo hover:text-white transition-all shadow-md"
              >
                <Plus className="h-4 w-4" />
                <span>Ku Dar Local List (Add Question)</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Pane - Question List Reordering / Submission */}
      <div className="lg:col-span-5 min-w-0 space-y-6">
        <div className="glass-panel border border-brand-border rounded-2xl p-6 shadow-xl flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-3 mb-4">
            <h2 className="font-outfit text-lg font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-brand-primary" />
              <span>Liiska Su'aalaha ({questions.length})</span>
            </h2>
            <button
              onClick={handleSubmitExam}
              disabled={loading || questions.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-brand-primary hover:bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Daabac Imtixaanka (Save)</span>
                </>
              )}
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <HelpCircle className="h-10 w-10 text-slate-650 mb-2 animate-bounce" />
              <p className="text-slate-400 text-sm">Weli wax su'aalo ah kuma darin.</p>
              <p className="text-slate-600 text-xs mt-1">U isticmaal Question Builder-ka bidixda si aad ugu darto.</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[550px] pr-1">
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-brand-border/60 bg-slate-900/30 p-4 space-y-2 relative group hover:border-brand-border transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Su'aasha {idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveQuestionLocal(idx, "up")}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-slate-800 text-slate-550 hover:text-white disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveQuestionLocal(idx, "down")}
                        disabled={idx === questions.length - 1}
                        className="p-1 rounded hover:bg-slate-800 text-slate-550 hover:text-white disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeQuestionLocal(idx)}
                        className="p-1 rounded hover:bg-brand-danger/10 text-slate-550 hover:text-brand-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-white leading-relaxed">{q.question_text}</p>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-400 font-medium pt-1">
                    <div className={q.correct_answer === "A" ? "text-brand-success font-bold" : ""}>A: {q.option_a}</div>
                    <div className={q.correct_answer === "B" ? "text-brand-success font-bold" : ""}>B: {q.option_b}</div>
                    <div className={q.correct_answer === "C" ? "text-brand-success font-bold" : ""}>C: {q.option_c}</div>
                    <div className={q.correct_answer === "D" ? "text-brand-success font-bold" : ""}>D: {q.option_d}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
