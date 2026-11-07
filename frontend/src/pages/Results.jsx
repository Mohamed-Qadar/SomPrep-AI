import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Star, CheckCircle2, XCircle, Zap, Trophy,
  Brain, BookOpen, Play, ChevronDown, ChevronUp, X,
  Loader2, RefreshCw, Home, AlertTriangle, TrendingDown
} from "lucide-react";
import { examsApi, studentTeacherExamsApi } from "../services/endpoints";

// ─────────────────────────────────────────────────────────────────────────────
// Circular SVG Performance Ring
// ─────────────────────────────────────────────────────────────────────────────

function PerformanceRing({ score, stars, xpEarned }) {
  const R            = 52;
  const CIRC         = 2 * Math.PI * R;     // ≈ 326.7
  const normalised   = Math.min(Math.max(score / 100, 0), 1);
  const dashOffset   = CIRC * (1 - normalised);

  const color =
    score >= 90 ? "#10b981" :
    score >= 70 ? "#6366f1" :
    score >= 50 ? "#f59e0b" : "#ef4444";

  const label =
    score >= 90 ? "Heer Sare! 🏆" :
    score >= 80 ? "Aad u Fiican ⭐" :
    score >= 70 ? "Guul ✅" :
    score >= 50 ? "Ku Dhowaad 🔥" : "Dib u Isku Day 💪";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-40 w-40">
        <svg
          viewBox="0 0 120 120"
          className="h-full w-full -rotate-90"
          aria-label={`Score: ${score.toFixed(0)}%`}
        >
          {/* Track */}
          <circle
            cx="60" cy="60" r={R}
            fill="none"
            stroke="#1e293b"
            strokeWidth="10"
          />
          {/* Fill arc */}
          <circle
            cx="60" cy="60" r={R}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC}
            className="animate-ring-fill"
            style={{ "--ring-offset": dashOffset }}
          />
        </svg>

        {/* Centre content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-outfit font-black text-3xl leading-none animate-xp-pop"
            style={{ color }}
          >
            {score.toFixed(0)}%
          </span>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5">Natiijada</span>
        </div>
      </div>

      <p className="font-outfit font-bold text-white text-center text-sm">{label}</p>

      <div className="flex items-center gap-4">
        {/* Stars */}
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              className={`h-5 w-5 ${n <= stars ? "text-amber-400 fill-amber-400 animate-star-glow" : "text-slate-700"}`}
            />
          ))}
        </div>

        {/* XP badge */}
        {xpEarned > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-indigo/20 border border-brand-indigo/30 text-brand-indigo animate-xp-pop">
            <Zap className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">+{xpEarned} XP</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Embedded Video Player Modal
// ─────────────────────────────────────────────────────────────────────────────

function VideoModal({ url, onClose }) {
  // Convert YouTube watch?v= → embed/
  const embedUrl = url
    .replace("watch?v=", "embed/")
    .replace("youtu.be/", "www.youtube.com/embed/");

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 video-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden border border-brand-border shadow-2xl animate-fade-in bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-slate-900/80 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="aspect-video">
          <iframe
            src={embedUrl}
            title="Reflex Explanation Video"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reflex Diagnostic Accordion Item (one wrong question)
// ─────────────────────────────────────────────────────────────────────────────

function ReflexItem({ question, studentChoiceId, openVideo }) {
  const [open, setOpen] = useState(false);

  const studentChoice = question.choices.find((c) => c.id === studentChoiceId);
  const correctChoice = question.choices.find((c) => c.is_correct);
  const optionLetters = ["A", "B", "C", "D", "E"];
  const letterOf = (id) => {
    const idx = question.choices.findIndex((c) => c.id === id);
    return optionLetters[idx] ?? "?";
  };

  const diffColor = {
    easy:   "bg-brand-emerald/10 text-brand-emerald border-brand-emerald/20",
    medium: "bg-brand-indigo/10 text-brand-indigo border-brand-indigo/20",
    hard:   "bg-brand-danger/10 text-brand-danger border-brand-danger/20",
  }[question.difficulty_level] || "bg-slate-800 text-slate-400 border-slate-700";

  return (
    <div className="rounded-xl border border-brand-border bg-brand-card overflow-hidden">
      {/* Accordion trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.015] transition-colors"
      >
        <div className="h-7 w-7 rounded-full bg-brand-danger/20 border border-brand-danger/30 flex items-center justify-center shrink-0 mt-0.5">
          <XCircle className="h-4 w-4 text-brand-danger" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
            {question.question_text}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${diffColor}`}>
              {question.difficulty_level}
            </span>
            {question.reflex_step_title && (
              <span className="text-[10px] text-brand-indigo font-semibold truncate max-w-[200px]">
                ⚡ {question.reflex_step_title}
              </span>
            )}
          </div>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        }
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-brand-border px-4 pb-4 pt-3 space-y-3 animate-accordion">
          {/* All choices */}
          <div className="space-y-2">
            {question.choices.map((ch, idx) => {
              const isStudent = ch.id === studentChoiceId;
              const isCorrect = ch.is_correct;
              return (
                <div
                  key={ch.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-sm ${
                    isCorrect
                      ? "bg-brand-emerald/5 border-brand-emerald/30 text-brand-emerald"
                      : isStudent && !isCorrect
                      ? "bg-brand-danger/5 border-brand-danger/30 text-brand-danger"
                      : "bg-slate-900/30 border-brand-border/40 text-slate-500"
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                      isCorrect
                        ? "bg-brand-emerald text-white"
                        : isStudent && !isCorrect
                        ? "bg-brand-danger text-white"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {optionLetters[idx]}
                  </div>
                  <span className="flex-1 leading-snug">{ch.choice_text}</span>
                  {isCorrect && <CheckCircle2 className="h-4 w-4 text-brand-emerald shrink-0" />}
                  {isStudent && !isCorrect && (
                    <span className="text-[10px] font-bold text-brand-danger shrink-0">
                      Jawaabkaaga
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Answer diff summary */}
          {studentChoice && correctChoice && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-brand-danger/5 border border-brand-danger/20 p-2.5 text-xs">
                <p className="text-brand-danger font-bold mb-1 flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> Jawaabkaaga
                </p>
                <p className="text-slate-300">
                  ({letterOf(studentChoice.id)}) {studentChoice.choice_text}
                </p>
              </div>
              <div className="rounded-lg bg-brand-emerald/5 border border-brand-emerald/20 p-2.5 text-xs">
                <p className="text-brand-emerald font-bold mb-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Jawaabta Saxda ah
                </p>
                <p className="text-slate-300">
                  ({letterOf(correctChoice.id)}) {correctChoice.choice_text}
                </p>
              </div>
            </div>
          )}

          {/* Reflex step title */}
          {question.reflex_step_title && (
            <div className="rounded-xl reflex-badge p-3 text-xs text-white">
              <p className="font-bold uppercase tracking-wider text-purple-100 mb-1">
                ⚡ Reflex Diagnostic
              </p>
              <p className="leading-relaxed">{question.reflex_step_title}</p>
            </div>
          )}

          {/* Explanation text */}
          {question.explanation_text && (
            <div className="rounded-xl bg-slate-900/60 border border-brand-border/40 p-3 text-xs text-slate-300 space-y-1">
              <p className="font-bold text-slate-400 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-brand-indigo" /> Sharaxaada
              </p>
              <p className="leading-relaxed">{question.explanation_text}</p>
            </div>
          )}

          {/* Video CTA */}
          {question.explanation_video_url && (
            <button
              onClick={() => openVideo(question.explanation_video_url)}
              className="flex items-center gap-2 w-full rounded-xl bg-brand-indigo/10 border border-brand-indigo/30 px-4 py-2.5 text-xs font-semibold text-brand-indigo hover:bg-brand-indigo/20 transition-colors"
            >
              <div className="h-6 w-6 rounded-full bg-brand-indigo flex items-center justify-center shrink-0">
                <Play className="h-3 w-3 text-white fill-white ml-0.5" />
              </div>
              Daawo Muuqaalka Sharaxaadda (Watch Explanation Video)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Coach Refik Breakdown Card
// ─────────────────────────────────────────────────────────────────────────────

function CoachCard({ insight }) {
  const [expanded, setExpanded] = useState(false);
  if (!insight) return null;

  const lines     = insight.split("\n").filter(Boolean);
  const preview   = lines.slice(0, 4).join("\n");

  return (
    <div className="glass-panel rounded-2xl border border-brand-indigo/30 bg-indigo-950/10 overflow-hidden animate-fade-in">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        <div className="h-10 w-10 rounded-xl bg-brand-indigo/20 border border-brand-indigo/30 flex items-center justify-center text-xl animate-coach-bob shrink-0">
          🧑‍🏫
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-indigo mb-1">
            AI Coach Refik — Falanqaynta
          </p>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
            {expanded ? insight : `${preview}…`}
          </p>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
          : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
        }
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Results Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Results() {
  const { attemptId }  = useParams();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const isTeacher      = searchParams.get("type") === "teacher";

  const [attempt,  setAttempt]  = useState(null);
  const [questions,setQuestions]= useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [videoUrl, setVideoUrl] = useState(null);

  // Load from localStorage first (written by ExamSession on submit)
  const storedAnswers = (() => {
    try {
      return JSON.parse(localStorage.getItem(`attempt_answers_${attemptId}`) || "{}");
    } catch { return {}; }
  })();

  const fetchResults = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (isTeacher) {
        // Fetch teacher exam attempt
        const attemptRes = await studentTeacherExamsApi.attempt(attemptId);
        
        // Fetch exam detail
        const examRes = await studentTeacherExamsApi.examDetail(attemptRes.data.exam_id);
        
        // Map questions options to choices format
        const mappedQuestions = examRes.data.questions.map((q) => {
          const choices = [
            { id: 1, choice_text: q.option_a, is_correct: q.correct_answer === "A" },
            { id: 2, choice_text: q.option_b, is_correct: q.correct_answer === "B" },
            { id: 3, choice_text: q.option_c, is_correct: q.correct_answer === "C" },
            { id: 4, choice_text: q.option_d, is_correct: q.correct_answer === "D" },
          ];
          return {
            id: q.id,
            question_text: q.question_text,
            choices: choices,
            explanation_text: q.explanation,
          };
        });

        const totalQs = mappedQuestions.length;
        const correctCount = mappedQuestions.filter((q) => {
          const studentAnsLetter = attemptRes.data.answers?.[q.id.toString()];
          const correctChoice = q.choices.find((c) => c.is_correct);
          const correctLetter = ["A", "B", "C", "D"][correctChoice.id - 1];
          return studentAnsLetter === correctLetter;
        }).length;

        const mappedAttempt = {
          ...attemptRes.data,
          correct_answers: correctCount,
          wrong_answers: totalQs - correctCount,
          total_questions: totalQs,
          ai_insight: "Performance reviewed by Teacher portal.",
        };

        setAttempt(mappedAttempt);
        setQuestions(mappedQuestions);
      } else {
        const [attemptRes, reviewRes] = await Promise.all([
          examsApi.attempt(attemptId),
          examsApi.review(attemptId),
        ]);
        setAttempt(attemptRes.data);
        setQuestions(reviewRes.data);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Natiijada lama soo rogi karin. Fadlan dib u isku day."
      );
    } finally { setLoading(false); }
  }, [attemptId, isTeacher]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  // Parse answers from DB fallback
  const dbAnswersMapped = {};
  if (attempt?.answers) {
    Object.entries(attempt.answers).forEach(([qId, letter]) => {
      // Map letter A-D to choice index 1-4
      dbAnswersMapped[qId] = ["A", "B", "C", "D"].indexOf(letter) + 1;
    });
  }
  const answersMap = { ...dbAnswersMapped, ...storedAnswers };

  // ── Derived data ──────────────────────────────────────────────────────────
  const score      = attempt?.score      ?? 0;
  const correct    = attempt?.correct_answers ?? 0;
  const wrong      = attempt?.wrong_answers   ?? 0;
  const total      = attempt?.total_questions ?? 0;
  const aiInsight  = attempt?.ai_insight ?? "";
  const stars      = score >= 90 ? 3 : score >= 80 ? 2 : score >= 70 ? 1 : 0;

  // XP from localStorage (set by ExamSession after submit response)
  const xpEarned   = (() => {
    try { return parseInt(localStorage.getItem(`attempt_xp_${attemptId}`) || "0"); }
    catch { return 0; }
  })();

  // Wrong questions: questions the student actually answered wrong
  const wrongQuestions = questions.filter((q) => {
    const chosen = answersMap[q.id];
    if (!chosen) return false;
    const correct_ = q.choices.find((c) => c.is_correct);
    return correct_ && correct_.id !== chosen;
  });

  // If no storedAnswers, show all non-correct as diagnostics
  const diagnosticQuestions = wrongQuestions.length > 0
    ? wrongQuestions
    : questions.filter((q) => q.choices.some((c) => !c.is_correct));

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-indigo" />
          <p className="text-slate-400 text-sm animate-pulse">
            Natiijada waxaa la soo rareyaa…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg p-4">
        <div className="text-center space-y-4 max-w-sm">
          <AlertTriangle className="h-12 w-12 text-brand-danger mx-auto" />
          <p className="text-white font-semibold">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchResults}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-indigo text-white text-sm font-semibold"
            >
              <RefreshCw className="h-4 w-4" /> Dib u isku day
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-border text-slate-400 text-sm"
            >
              <Home className="h-4 w-4" /> Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg pb-20">
      {/* Video Modal */}
      {videoUrl && <VideoModal url={videoUrl} onClose={() => setVideoUrl(null)} />}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-brand-border bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-outfit font-black text-white text-sm leading-none">
              Natiijada Imtixaanka
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {attempt?.subtopic?.name || "Exam Results"}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* ── Performance Ring ──────────────────────────────────────────────── */}
        <div className="glass-panel rounded-3xl border border-brand-border p-8 flex flex-col items-center animate-fade-in">
          <PerformanceRing score={score} stars={stars} xpEarned={xpEarned} />

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 w-full mt-6">
            {[
              { label: "Saxda ah",  value: correct, color: "text-brand-emerald", icon: <CheckCircle2 className="h-4 w-4 text-brand-emerald" /> },
              { label: "Khaladka",  value: wrong,   color: "text-brand-danger",  icon: <XCircle className="h-4 w-4 text-brand-danger" />       },
              { label: "Wadar",     value: total,   color: "text-white",          icon: <Brain className="h-4 w-4 text-brand-indigo" />          },
            ].map(({ label, value, color, icon }) => (
              <div key={label} className="rounded-xl bg-slate-900/50 border border-brand-border p-3 text-center">
                <div className="flex justify-center mb-1">{icon}</div>
                <p className={`font-outfit font-black text-2xl ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>

          {/* Pass/Fail state */}
          {score >= 70 ? (
            <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-brand-emerald/10 border border-brand-emerald/30 text-brand-emerald text-sm font-semibold">
              <Trophy className="h-4 w-4" />
              Guul! Xididdada xiga waa furmeen.
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-brand-danger/10 border border-brand-danger/30 text-brand-danger text-sm font-semibold">
              <RefreshCw className="h-4 w-4" />
              {score.toFixed(0)}% — Ku dhowaad! 70% ayaad u baahan tahay.
            </div>
          )}
        </div>

        {/* ── AI Coach Refik Breakdown ──────────────────────────────────────── */}
        {aiInsight && <CoachCard insight={aiInsight} />}

        {/* ── Reflex Diagnostic Sheet ───────────────────────────────────────── */}
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg reflex-badge flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <h2 className="font-outfit font-black text-white text-base">
              Reflex Diagnostic Sheet
            </h2>
            {wrongQuestions.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-danger/15 text-brand-danger border border-brand-danger/25 font-semibold">
                {wrongQuestions.length} khalad
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Su'aalaha khaladka ah — jawaabkaaga (cas) iyo jawaabta saxda ah (cagaar), iyo
            muuqaalka sharaxaadda.
          </p>

          {wrongQuestions.length === 0 && questions.length > 0 ? (
            <div className="glass-panel rounded-2xl border border-brand-emerald/20 p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-brand-emerald mx-auto mb-2" />
              <p className="text-brand-emerald font-semibold">
                Hambalyo! Dhamaan su'aalaha waad ku jawaabtay si sax ah!
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Perfect score on all tracked answers.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {(wrongQuestions.length > 0 ? wrongQuestions : diagnosticQuestions.slice(0, 10)).map(
                (q) => (
                  <ReflexItem
                    key={q.id}
                    question={q}
                    studentChoiceId={answersMap[q.id]}
                    openVideo={setVideoUrl}
                  />
                )
              )}
            </div>
          )}
        </div>

        {/* ── Action Buttons ────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-brand-border text-slate-300 hover:text-white hover:border-brand-indigo/50 transition-all text-sm font-semibold"
          >
            <Home className="h-4 w-4" /> Dashboard
          </button>
          {!isTeacher && (
            <button
              onClick={() => navigate(`/diagnostic/${attemptId}`)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-brand-indigo bg-brand-indigo/10 text-brand-indigo hover:bg-brand-indigo/20 transition-all text-sm font-semibold animate-pulse"
            >
              <TrendingDown className="h-4 w-4" /> Diagnostic Report
            </button>
          )}
          {score < 70 && attempt?.subtopic && (
            <button
              onClick={() => {
                const s = attempt.subtopic;
                navigate(
                  `/exam/${s.category_id || attempt.subtopic?.category_id}?subtopicId=${s.id}&name=${encodeURIComponent(s.name)}`
                );
              }}
              className="relative flex-1 overflow-hidden flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-indigo hover:bg-indigo-500 text-white transition-all text-sm font-bold btn-shimmer"
            >
              <RefreshCw className="h-4 w-4" /> Dib u Isku Day
            </button>
          )}
          {score >= 70 && (
            <button
              onClick={() => navigate("/dashboard")}
              className="relative flex-1 overflow-hidden flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-emerald hover:bg-emerald-400 text-white transition-all text-sm font-bold btn-shimmer"
            >
              <Trophy className="h-4 w-4" /> Xididdada Xiga →
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
