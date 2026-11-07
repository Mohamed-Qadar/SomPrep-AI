import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { examsApi, studentTeacherExamsApi } from "../services/endpoints";
import { useAuth } from "../context/AuthContext";
import PackageGate from "../components/PackageGate";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Clock,
  Flag,
  HelpCircle,
  Send,
  Shield,
  X,
  Zap,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const OPTION_LETTERS = ["A", "B", "C", "D", "E"];
const EXAM_DURATION  = 30 * 60; // 30 minutes in seconds

// ─────────────────────────────────────────────────────────────────────────────
// ExamSession
// ─────────────────────────────────────────────────────────────────────────────
export default function ExamSession() {
  const { user } = useAuth();
  const { categoryId, mockExamId, teacherExamId } = useParams();
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();

  // Optional subtopic-level exam (from Dashboard roadmap links)
  const subtopicId   = searchParams.get("subtopicId");
  const isChallenge  = searchParams.get("challenge") === "true";
  const [dynamicExamName, setDynamicExamName] = useState("");
  const [examDuration, setExamDuration] = useState(30); // duration in minutes

  const examName     = dynamicExamName || searchParams.get("name") || 
                       (mockExamId ? "Simulated Trial Exam" : 
                        categoryId === "weakness" ? "Weakness Revision Exam" : 
                        isChallenge ? "Speed Timed Challenge" : "Imtixaanka");

  // ── Core state ─────────────────────────────────────────────────────────────
  const [questions,        setQuestions]        = useState([]);
  const [currentIdx,       setCurrentIdx]       = useState(0);
  const [answers,          setAnswers]          = useState({}); // { [question_id]: choice_id }
  const [timeLeft,         setTimeLeft]         = useState(() => {
    if (mockExamId) return 120 * 60;
    if (searchParams.get("challenge") === "true") return 10 * 60;
    return EXAM_DURATION;
  });
  const [timeExpired,      setTimeExpired]      = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState("");
  const [submitting,       setSubmitting]       = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExitModal,    setShowExitModal]    = useState(false);

  // ── Refs (avoid stale closures in timer callbacks) ─────────────────────────
  const timerRef          = useRef(null);
  const answersRef        = useRef({});       // always mirrors `answers` state
  const autoSubmittedRef  = useRef(false);    // guard against double auto-submit
  const timerStartedRef   = useRef(false);    // guard against double timer start

  // Keep answersRef in sync so the auto-submit closure always reads fresh data
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // ── Fetch questions ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        let fetchedQs = [];

        if (teacherExamId) {
          // Register attempt
          await studentTeacherExamsApi.startExam(teacherExamId);
          // Fetch exam details
          const res = await studentTeacherExamsApi.examDetail(teacherExamId);
          setDynamicExamName(res.data.title);
          const duration = res.data.duration_minutes || 60;
          setExamDuration(duration);
          setTimeLeft(duration * 60);

          fetchedQs = res.data.questions.map((q) => {
            const choices = [];
            if (q.option_a) choices.push({ id: 1, choice_text: q.option_a });
            if (q.option_b) choices.push({ id: 2, choice_text: q.option_b });
            if (q.option_c) choices.push({ id: 3, choice_text: q.option_c });
            if (q.option_d) choices.push({ id: 4, choice_text: q.option_d });
            return {
              id: q.id,
              question_text: q.question_text,
              choices,
              explanation: q.explanation,
            };
          });
        } else {
          let request;
          if (mockExamId) {
            request = examsApi.startMockExam(mockExamId);
          } else if (subtopicId) {
            request = examsApi.startSubtopicExam(subtopicId);
          } else if (categoryId === "weakness") {
            request = examsApi.startWeaknessExam();
          } else {
            request = examsApi.startCategoryExam(categoryId);
          }
          const res = await request;
          fetchedQs = isChallenge ? res.data.slice(0, 10) : res.data;
        }

        setQuestions(fetchedQs);
        if (fetchedQs.length === 0) {
          setError(
            "Mawduucan kuma jiraan wax su'aalo ah · No questions available for this exam."
          );
        }
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            "Ma suurtagelin in la soo rogo su'aalaha · Failed to load exam questions."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();

    // Cleanup: always clear interval on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [categoryId, subtopicId, mockExamId, teacherExamId, isChallenge]);

  // ── Start countdown once questions are ready ───────────────────────────────
  useEffect(() => {
    if (questions.length === 0 || timerStartedRef.current) return;
    timerStartedRef.current = true;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [questions]);

  // ── Auto-submit when clock hits zero ──────────────────────────────────────
  useEffect(() => {
    if (timeLeft === 0 && questions.length > 0 && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      setTimeExpired(true);
      // Brief delay so the crimson UI renders before the browser goes to submit
      setTimeout(() => doSubmit(answersRef.current, true), 1200);
    }
     
  }, [timeLeft, questions.length]);

  // ── Core submit logic ──────────────────────────────────────────────────────
  const doSubmit = async (currentAnswers, isAuto = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    setShowConfirmModal(false);

    // Build answer array
    let answerPairs = Object.entries(currentAnswers).map(([qId, choiceId]) => ({
      question_id:       parseInt(qId),
      chosen_choice_id:  choiceId,
    }));

    // Auto-submit edge case: student opened exam but answered nothing
    if (isAuto && answerPairs.length === 0 && questions.length > 0) {
      answerPairs = questions.map((q) => ({
        question_id:      q.id,
        chosen_choice_id: q.choices[0]?.id ?? 0,
      }));
    }

    let res;
    try {
      if (teacherExamId) {
        const formattedAnswers = {};
        Object.entries(currentAnswers).forEach(([qId, choiceId]) => {
          const letter = ["A", "B", "C", "D"][choiceId - 1] || "A";
          formattedAnswers[qId] = letter;
        });
        const payload = {
          answers: formattedAnswers,
          time_spent_seconds: (examDuration * 60) - timeLeft,
        };
        res = await studentTeacherExamsApi.submitExam(teacherExamId, payload);
      } else if (mockExamId) {
        const payload = {
          answers: answerPairs,
          time_spent_seconds: (120 * 60) - timeLeft,
        };
        res = await examsApi.submitMockExam(mockExamId, payload);
      } else {
        const payload = {
          category_id: categoryId ? parseInt(categoryId) : null,
          ...(subtopicId ? { subtopic_id: parseInt(subtopicId) } : {}),
          answers: answerPairs,
        };
        res = await examsApi.submit(payload);
      }
      const attemptId = res.data.attempt_id; // ← correct field from ExamSubmitResponse schema

      // Persist student answers + XP so Results page can render Reflex Diagnostic Sheet
      localStorage.setItem(
        `attempt_answers_${attemptId}`,
        JSON.stringify(currentAnswers)
      );
      if (res.data.xp_earned) {
        localStorage.setItem(`attempt_xp_${attemptId}`, String(res.data.xp_earned));
      }

      navigate(teacherExamId ? `/results/${attemptId}?type=teacher` : `/results/${attemptId}`);
    } catch (err) {
      console.error("Exam submission failed:", err);
      setError(
        err.response?.data?.detail ||
          "Waxaa dhacay qalad intii lagu guda jiray gudbinta · Submission error, please retry."
      );
      setSubmitting(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const selectChoice = (questionId, choiceId) => {
    if (timeExpired) return;
    setAnswers((prev) => ({ ...prev, [questionId]: choiceId }));
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const isLastQuestion  = currentIdx === questions.length - 1;
  const answeredCount   = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const progressPct     = questions.length > 0
    ? Math.round(((currentIdx + 1) / questions.length) * 100)
    : 0;
  const isWarningTime  = timeLeft <= 5 * 60 && !timeExpired; // < 5 min
  const isCriticalTime = timeLeft <= 60      && !timeExpired; // < 1 min

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-brand-bg">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-brand-indigo/20 border-t-brand-indigo" />
          <Zap className="absolute inset-0 m-auto h-7 w-7 text-brand-indigo" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-slate-300">Su'aalaha waa la soo raraa...</p>
          <p className="text-xs text-slate-500">Loading exam questions</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ERROR SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (error && questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
        <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-700 p-8 text-center shadow-2xl space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-warning/10 border border-brand-warning/20">
            <AlertTriangle className="h-7 w-7 text-brand-warning" />
          </div>
          <div className="space-y-2">
            <h2 className="font-outfit text-xl font-bold text-white">Cilad Baa Dhacday</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-indigo hover:bg-indigo-500 px-6 py-2.5 mx-auto text-sm font-semibold text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Ku Laabo Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion   = questions[currentIdx];
  const selectedChoiceId  = answers[currentQuestion?.id];

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <PackageGate grade={user?.grade_level}>
      <>
      {/* ═══════════════════════════════════════════════════════════════════
          SUBMITTING OVERLAY — absolute top of z-stack
      ═══════════════════════════════════════════════════════════════════ */}
      {submitting && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 bg-slate-950/95 backdrop-blur-md">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-brand-emerald/20 border-t-brand-emerald" />
            <Send className="absolute inset-0 m-auto h-8 w-8 text-brand-emerald" />
          </div>
          <div className="text-center space-y-1.5">
            <p className="font-outfit text-lg font-bold text-white">Gudbinayaa Imtixaankaada...</p>
            <p className="text-sm text-slate-400">Submitting your answers · Fadlan sug</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          EXIT CONFIRMATION MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm animate-fade-in overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl">
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-warning/25 bg-brand-warning/10">
                  <AlertTriangle className="h-5 w-5 text-brand-warning" />
                </div>
                <div>
                  <h3 className="font-outfit font-bold text-white">Ka Bax Imtixaanka?</h3>
                  <p className="text-xs text-slate-400">Jawaabahaaaga lama kaydin doono.</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-300">
                Haddaad ka baxdo imtixaanka hadda, jawaabihii aad bixisay oo dhan way lumaan doonaan oo natiijo lama diiwaangelineyso.{" "}
                Ma hubtaa inaad rabto inaad ka baxdo?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitModal(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
                >
                  Ku Laabo
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-500"
                >
                  Ka Bax
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SUBMIT CONFIRMATION MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm animate-fade-in overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl">
            {/* Emerald accent top stripe */}
            <div className="h-1 bg-gradient-to-r from-brand-emerald to-emerald-400" />

            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-emerald/25 bg-brand-emerald/10">
                    <Flag className="h-5 w-5 text-brand-emerald" />
                  </div>
                  <div>
                    <h3 className="font-outfit font-bold text-white">Gudbi Imtixaanka?</h3>
                    <p className="text-xs text-slate-400">Submit exam · Confirm your decision</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-700 hover:text-slate-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Answer summary grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-brand-emerald/20 bg-brand-emerald/5 p-4 text-center">
                  <p className="font-outfit text-3xl font-black text-brand-emerald">{answeredCount}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">La Jawaabay</p>
                </div>
                <div className={`rounded-xl border p-4 text-center ${
                  unansweredCount > 0
                    ? "border-brand-warning/20 bg-brand-warning/5"
                    : "border-slate-700 bg-slate-900/50"
                }`}>
                  <p className={`font-outfit text-3xl font-black ${unansweredCount > 0 ? "text-amber-400" : "text-slate-400"}`}>
                    {unansweredCount}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Aan Laga Jawaabin</p>
                </div>
              </div>

              {/* Unanswered warning */}
              {unansweredCount > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-brand-warning/20 bg-brand-warning/5 p-4">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <p className="text-xs leading-relaxed text-amber-300">
                    Waxaad haysataa <strong>{unansweredCount} su'aalood</strong> oo aanad weli ka jawaabin.
                    Su'aalaha aan laga jawaabin si toos ah ayaa loo xisaabinayaa khalad.
                  </p>
                </div>
              )}

              <p className="text-center text-sm text-slate-400">
                Ma hubtaa inaad rabto inaad gudbiso imtixaankaada?
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3.5 text-sm font-semibold text-slate-300 transition-colors hover:text-white"
                >
                  Ku Laabo
                </button>
                <button
                  onClick={() => doSubmit(answersRef.current, false)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-emerald px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-emerald/25 transition-all hover:bg-emerald-500 hover:shadow-brand-emerald/40"
                >
                  <Send className="h-4 w-4" />
                  Gudbi!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN EXAM SCREEN
      ═══════════════════════════════════════════════════════════════════ */}
      <div className={`flex min-h-screen flex-col transition-colors duration-700 ${
        timeExpired ? "bg-red-950" : "bg-brand-bg"
      }`}>

        {/* ── FIXED HEADER ──────────────────────────────────────────────── */}
        <header className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-700 ${
          timeExpired
            ? "border-red-800/70 bg-red-950/90"
            : "border-slate-700/60 bg-slate-900/85"
        }`}>
          <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-4 px-4">

            {/* Exit trigger */}
            <button
              onClick={() => setShowExitModal(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-400 transition-all hover:bg-slate-800 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Ka Bax</span>
            </button>

            {/* Exam title */}
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Imtixaan · Exam</p>
              <h1 className="truncate font-outfit text-sm font-bold text-white">{examName}</h1>
            </div>

            {/* Countdown timer */}
            <div className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 font-mono text-sm font-bold transition-all duration-300 ${
              timeExpired
                ? "animate-pulse border-red-600/60 bg-red-900/50 text-red-300"
                : isCriticalTime
                ? "animate-pulse border-red-500/40 bg-red-500/10 text-red-400"
                : isWarningTime
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : "border-slate-700 bg-slate-950 text-brand-warning"
            }`}>
              <Clock className="h-4 w-4 shrink-0" />
              <span className="tabular-nums">{formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Thin progress stripe under header */}
          <div className="h-0.5 bg-slate-800/80">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                timeExpired ? "bg-red-600" : "bg-brand-indigo"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </header>

        {/* ── SCROLLABLE BODY ────────────────────────────────────────────── */}
        <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-6 pb-36">

          {/* ── Question counter & bubble navigation grid ──────────────── */}
          <div className="space-y-3">
            {/* Counter row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className={`h-4 w-4 ${timeExpired ? "text-red-400" : "text-brand-indigo"}`} />
                <span className="text-sm font-bold text-white">
                  Su'aasha <span className="text-brand-indigo">{currentIdx + 1}</span>
                  <span className="font-medium text-slate-500"> ee {questions.length}</span>
                </span>
              </div>
              <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                answeredCount === questions.length
                  ? "bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20"
                  : "bg-slate-800/60 text-slate-400"
              }`}>
                {answeredCount}/{questions.length} la jawaabay
              </span>
            </div>

            {/* Bubble grid — tap any bubble to jump to that question */}
            <div className="flex flex-wrap gap-1.5">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined;
                const isActive   = idx === currentIdx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    disabled={submitting}
                    title={`Su'aasha ${idx + 1}`}
                    className={`h-8 w-8 shrink-0 rounded-lg border text-xs font-bold transition-all ${
                      isActive
                        ? "scale-110 border-brand-indigo bg-brand-indigo text-white shadow-md shadow-brand-indigo/30"
                        : isAnswered
                        ? "border-brand-indigo/40 bg-brand-indigo/15 text-brand-indigo"
                        : "border-slate-700 bg-slate-800/60 text-slate-500 hover:border-slate-600 hover:text-slate-400"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Question card ──────────────────────────────────────────────── */}
          <div className={`rounded-2xl border p-6 shadow-2xl transition-colors duration-700 sm:p-8 ${
            timeExpired
              ? "border-red-800/50 bg-red-950/60"
              : "glass-panel border-slate-700/60"
          }`}>

            {/* Time-expired warning banner */}
            {timeExpired && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-700/40 bg-red-900/40 px-4 py-3">
                <Clock className="h-5 w-5 shrink-0 animate-pulse text-red-400" />
                <p className="text-sm font-bold text-red-300">
                  Waqtigu wuu dhamaaday! Imtixaankaada waa la gudbinayaa...
                </p>
              </div>
            )}

            {/* Question label + text */}
            <div className="mb-6 space-y-3">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                timeExpired ? "text-red-400" : "text-brand-indigo"
              }`}>
                <Shield className="h-3.5 w-3.5" />
                Su'aasha {currentIdx + 1}
              </span>
              <h2 className="font-outfit text-lg font-bold leading-relaxed text-white sm:text-xl">
                {currentQuestion.question_text}
              </h2>
            </div>

            {/* Answer choices */}
            <div className="space-y-3">
              {currentQuestion.choices.map((choice, idx) => {
                const isSelected = selectedChoiceId === choice.id;
                const letter     = OPTION_LETTERS[idx] ?? "•";

                return (
                  <button
                    key={choice.id}
                    onClick={() => selectChoice(currentQuestion.id, choice.id)}
                    disabled={timeExpired}
                    className={`group w-full rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.99] sm:p-5 ${
                      isSelected
                        ? "border-brand-indigo bg-brand-indigo/15 shadow-md shadow-brand-indigo/10"
                        : timeExpired
                        ? "cursor-not-allowed border-slate-800/40 bg-slate-900/20 opacity-60"
                        : "border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/60 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Letter badge */}
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-all ${
                        isSelected
                          ? "border-brand-indigo bg-brand-indigo text-white shadow-sm"
                          : "border-slate-700 bg-slate-800 text-slate-400 group-hover:border-slate-600"
                      }`}>
                        {letter}
                      </div>

                      {/* Choice text */}
                      <span className={`flex-1 text-sm font-semibold leading-snug sm:text-base ${
                        isSelected ? "text-white" : "text-slate-300"
                      }`}>
                        {choice.choice_text}
                      </span>

                      {/* Radio dot */}
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                        isSelected
                          ? "border-brand-indigo bg-brand-indigo"
                          : "border-slate-700"
                      }`}>
                        {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Runtime error banner (after load) */}
          {error && questions.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </main>

        {/* ── FIXED BOTTOM NAVIGATION ────────────────────────────────────── */}
        <nav className={`fixed bottom-0 left-0 right-0 z-20 border-t backdrop-blur-md transition-colors duration-700 ${
          timeExpired
            ? "border-red-800/70 bg-red-950/90"
            : "border-slate-700/60 bg-slate-900/90"
        }`}>
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4">

            {/* Previous */}
            <button
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0 || submitting}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3.5 text-sm font-semibold text-slate-300 transition-all hover:bg-slate-700 hover:text-white disabled:pointer-events-none disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Hore</span>
            </button>

            {/* Sliding dot indicator (shows context around current question) */}
            <div className="flex items-center justify-center gap-1">
              {questions.slice(
                Math.max(0, currentIdx - 2),
                Math.min(questions.length, currentIdx + 3)
              ).map((q, i) => {
                const realIdx = Math.max(0, currentIdx - 2) + i;
                return (
                  <div
                    key={q.id}
                    className={`rounded-full transition-all duration-300 ${
                      realIdx === currentIdx
                        ? "h-2 w-5 bg-brand-indigo"
                        : answers[q.id] !== undefined
                        ? "h-2 w-2 bg-brand-indigo/40"
                        : "h-2 w-2 bg-slate-700"
                    }`}
                  />
                );
              })}
            </div>

            {/* Next / Finish button */}
            {isLastQuestion ? (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={timeExpired || submitting}
                className="flex items-center gap-2 rounded-xl bg-brand-emerald px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-emerald/25 transition-all hover:bg-emerald-500 hover:shadow-brand-emerald/40 disabled:pointer-events-none disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>Gudbi</span>
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-brand-indigo px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-brand-indigo/20 transition-all hover:bg-indigo-500"
              >
                <span>Xiga</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </nav>
      </div>
      </>
    </PackageGate>
  );
}
