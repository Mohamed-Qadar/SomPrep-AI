import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ArrowLeft,
  Loader2,
  Sparkles,
  HelpCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { examsApi } from "../services/endpoints";

export default function WrongAnswers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [retryStates, setRetryStates] = useState({}); // { [qId]: { selectedChoiceId, submitted, isCorrect } }
  const [coachAdvice, setCoachAdvice] = useState({}); // { [qId]: message }

  const fetchWrongAnswers = async () => {
    setLoading(true);
    try {
      const res = await examsApi.wrongAnswers();
      setQuestions(res.data || []);
    } catch (err) {
      console.error("Error fetching wrong answers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWrongAnswers();
  }, []);

  const handleRetrySubmit = (qId, correctText, chosenText, choiceId) => {
    const isCorrect = chosenText === correctText;
    setRetryStates((prev) => ({
      ...prev,
      [qId]: {
        selectedChoiceId: choiceId,
        submitted: true,
        isCorrect
      }
    }));
  };

  const handleResetRetry = (qId) => {
    setRetryStates((prev) => {
      const nextExpanded = { ...prev };
      delete nextExpanded[qId];
      return nextExpanded;
    });
  };

  const askAICoach = (qId, topic, subject) => {
    setCoachAdvice((prev) => ({
      ...prev,
      [qId]: `Dhaqtar Refik AI: Waxaan arkaa inaad ku dhibtootay mawduuca '${topic}' ee cutubka ${subject}. Waxaan kugula talinayaa inaad daawato casharka fiidiyowga ah ee la xiriira, barato 3da xeer ee muhiimka ah, dabadeedna xalliso 10 su'aalood oo tijaabo ah.`
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
          <p className="mt-4 text-xs text-slate-400">Buugga khaladaadka waa la soo rarayaa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </button>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4.5 w-4.5 text-indigo-400" />
            <h1 className="font-outfit font-black text-sm text-white">Wrong Answer Notebook</h1>
          </div>
          <div className="w-16" /> {/* Spacer */}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="rounded-2xl border border-slate-850 bg-[#1e293b]/45 p-6 flex items-center gap-4 shadow-xl">
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-2xl animate-pulse shrink-0">
            📓
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Buugga Khaladaadka · Incorrect Review</h2>
            <p className="text-xs text-slate-400 mt-1">
              Halkan ka daawo dhammaan su'aalihii aad ku khaldantay imtixaannadii ugu dambeeyay si aad dib ugu barato.
            </p>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-2xl border border-slate-850 bg-[#1e293b]/25 p-16 text-center text-slate-500 shadow-md">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-500 opacity-60 mb-4" />
            <h3 className="text-sm font-bold text-slate-300">Ma jiraan khaladaad diiwaangashan!</h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto">
              Shaqo fiican! Dhammaan imtixaannadii aad qaadatay waxaad ku guulaysatay dhibco sare. Sii wad dadaalka!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((q) => {
              const retry = retryStates[q.question_id];
              const advice = coachAdvice[q.question_id];
              const difficultyColors = {
                easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                hard: "bg-red-500/10 text-red-400 border-red-500/20"
              };

              return (
                <div
                  key={q.question_id}
                  className="rounded-2xl border border-slate-800 bg-[#1e293b]/40 p-6 space-y-4 shadow-lg"
                >
                  {/* Card Metadata Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-indigo-500/15 text-indigo-400">
                        {q.subject_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[180px]">
                        {q.topic_name}
                      </span>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${difficultyColors[q.difficulty] || difficultyColors.medium}`}>
                      {q.difficulty}
                    </span>
                  </div>

                  {/* Question body */}
                  <div className="text-sm font-semibold text-slate-200 leading-relaxed whitespace-pre-line">
                    {q.question_text}
                  </div>

                  {/* Question Choices or Retry Mode */}
                  <div className="space-y-2">
                    {q.choices.map((ch) => {
                      const isSelected = retry?.selectedChoiceId === ch.id;
                      const isCorrectChoice = ch.choice_text === q.correct_answer;
                      let choiceBtnClass = "border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-300";

                      if (retry?.submitted) {
                        if (isCorrectChoice) {
                          choiceBtnClass = "border-emerald-500/40 bg-emerald-950/20 text-emerald-400";
                        } else if (isSelected) {
                          choiceBtnClass = "border-red-500/40 bg-red-950/20 text-red-400";
                        } else {
                          choiceBtnClass = "border-slate-800 bg-slate-900/20 text-slate-600 cursor-not-allowed";
                        }
                      } else if (isSelected) {
                        choiceBtnClass = "border-indigo-500 bg-indigo-950/20 text-indigo-300";
                      }

                      return (
                        <button
                          key={ch.id}
                          onClick={() => {
                            if (!retry?.submitted) {
                              handleRetrySubmit(q.question_id, q.correct_answer, ch.choice_text, ch.id);
                            }
                          }}
                          disabled={retry?.submitted}
                          className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-xs font-semibold text-left transition duration-200 ${choiceBtnClass}`}
                        >
                          <span>{ch.choice_text}</span>
                          {retry?.submitted && isCorrectChoice && (
                            <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                          )}
                          {retry?.submitted && isSelected && !isCorrectChoice && (
                            <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Review feedback (Correct / Wrong Indicators from attempts history) */}
                  {!retry?.submitted && (
                    <div className="flex flex-col gap-2 p-3 bg-slate-900/40 rounded-xl border border-slate-850 text-xs">
                      <div className="flex items-center gap-1.5 text-red-400">
                        <XCircle className="h-4 w-4 shrink-0" />
                        <span>
                          Waxaad ku jawaabtay: <strong className="underline">{q.selected_answer}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400 border-t border-slate-850 pt-2">
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        <span>
                          Jawaabta saxda ah: <strong>{q.correct_answer}</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Retry feedbacks messages */}
                  {retry?.submitted && (
                    <div className={`p-4 rounded-xl border flex items-start gap-2.5 text-xs ${
                      retry.isCorrect
                        ? "border-emerald-500/20 bg-emerald-950/10 text-emerald-400"
                        : "border-red-500/20 bg-red-950/10 text-red-400"
                    }`}>
                      <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
                      <div>
                        <h5 className="font-bold">
                          {retry.isCorrect ? "Waa sax! Hadda waad garatay. · Correct!" : "Weli ma saxna · Incorrect"}
                        </h5>
                        <p className="mt-1 leading-relaxed">
                          {retry.isCorrect
                            ? "Waxaad heshay qaabka saxda ah ee xalka. Sii wad dadaalkaaga!"
                            : "Dib u eeg sharraxaadda hoose si aad u fahanto halka aad ku khaldantay."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Explanation Section */}
                  {q.explanation && (
                    <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold uppercase tracking-wider">
                        <HelpCircle className="h-4 w-4" />
                        <span>Sharraxaad · Explanation</span>
                      </div>
                      <p className="text-xs text-slate-350 leading-relaxed leading-relaxed">
                        {q.explanation}
                      </p>
                    </div>
                  )}

                  {/* AI Coach recommendation popup */}
                  {advice && (
                    <div className="bg-indigo-950/10 border border-indigo-500/20 rounded-xl p-4 flex gap-3 items-start animate-fade-in">
                      <Sparkles className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-indigo-300 leading-relaxed font-semibold">
                        {advice}
                      </p>
                    </div>
                  )}

                  {/* Actions buttons footer */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-850">
                    <button
                      onClick={() => askAICoach(q.question_id, q.topic_name, q.subject_name)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/25 text-[10px] font-bold text-indigo-300 border border-indigo-500/20 transition active:scale-95"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Ask AI Coach</span>
                    </button>
                    
                    {retry?.submitted && (
                      <button
                        onClick={() => handleResetRetry(q.question_id)}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-350 border border-slate-700 transition active:scale-95"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                        <span>Reset Retry</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
