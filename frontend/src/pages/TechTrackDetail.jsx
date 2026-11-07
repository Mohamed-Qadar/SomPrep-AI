import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";
import { techApi } from "../services/endpoints";
import { ArrowLeft, CheckCircle2, Lock, PlayCircle, FileText, HelpCircle, Award, Check } from "lucide-react";

const QUIZ_QUESTIONS = {
  "office-skills": [
    { id: 1, text: "Which shortcut key is used to copy text in Microsoft Word?", options: { A: "Ctrl + V", B: "Ctrl + C", C: "Ctrl + X", D: "Ctrl + P" }, correct: "B" },
    { id: 2, text: "In Microsoft Excel, what symbol must all formulas start with?", options: { A: "@", B: "$", C: "=", D: "&" }, correct: "C" },
    { id: 3, text: "Which software is best suited for creating slideshow presentations?", options: { A: "Microsoft Word", B: "Microsoft Access", C: "Microsoft PowerPoint", D: "Microsoft Excel" }, correct: "C" },
    { id: 4, text: "Which of the following is a good practice for file organization?", options: { A: "Keeping all files on Desktop", B: "Naming folders clearly and nesting systematically", C: "Using 'Untitled' for all documents", D: "Never saving documents in folders" }, correct: "B" },
    { id: 5, text: "What is the default extension of a Microsoft Word document?", options: { A: ".docx", B: ".xlsx", C: ".pptx", D: ".txt" }, correct: "A" }
  ],
  "programming-skills": [
    { id: 1, text: "Which symbol is used for comments in Python?", options: { A: "//", B: "/*", C: "#", D: "--" }, correct: "C" },
    { id: 2, text: "Which data type is used to store multiple values in Python?", options: { A: "int", B: "float", C: "list", D: "str" }, correct: "C" },
    { id: 3, text: "How do you start a block of code in Python?", options: { A: "Semicolon", B: "Indentation", C: "Curly braces", D: "Parentheses" }, correct: "B" },
    { id: 4, text: "In C/C++, how do you declare an integer variable 'x'?", options: { A: "var x = 0;", B: "x = int(0);", C: "int x = 0;", D: "declare int x;" }, correct: "C" },
    { id: 5, text: "Which function is used to output text to the console in Python?", options: { A: "print()", B: "console.log()", C: "printf()", D: "echo()" }, correct: "A" }
  ],
  "data-analysis": [
    { id: 1, text: "What is the primary Python library used for structured data manipulation and dataframes?", options: { A: "NumPy", B: "Matplotlib", C: "Pandas", D: "Scikit-learn" }, correct: "C" },
    { id: 2, text: "Which function in Excel allows you to find a value in another table by row?", options: { A: "SUM", B: "VLOOKUP", C: "AVERAGE", D: "IF" }, correct: "B" },
    { id: 3, text: "What is data cleaning?", options: { A: "Deleting all data", B: "Fixing incorrect, corrupted, or missing data in a dataset", C: "Changing data colors", D: "Printing data reports" }, correct: "B" },
    { id: 4, text: "Which type of chart is best suited for showing trends over time?", options: { A: "Pie chart", B: "Bar chart", C: "Line chart", D: "Scatter plot" }, correct: "C" },
    { id: 5, text: "What is the mean of the numbers: 2, 4, 6, 8?", options: { A: "4", B: "5", C: "6", D: "8" }, correct: "B" }
  ],
  "machine-learning": [
    { id: 1, text: "What is supervised learning?", options: { A: "Learning without correct label data", B: "Learning with a teacher supervising the computer", C: "Learning where the training data contains input-output pairs with labels", D: "Learning by playing games" }, correct: "C" },
    { id: 2, text: "What happens during overfitting?", options: { A: "The model is too simple", B: "The model performs extremely well on training data but poorly on unseen test data", C: "The model cannot train at all", D: "The model runs too fast" }, correct: "B" },
    { id: 3, text: "Which of the following is a classic classification algorithm?", options: { A: "Linear Regression", B: "Decision Tree", C: "K-Means Clustering", D: "Principal Component Analysis" }, correct: "B" },
    { id: 4, text: "What does the scikit-learn library in Python do?", options: { A: "Video streaming", B: "Database hosting", C: "Machine learning and statistical modeling", D: "Web development" }, correct: "C" },
    { id: 5, text: "Why is split training/testing data important in ML?", options: { A: "To make the code run faster", B: "To check if model works on unseen data", C: "To double the amount of data", D: "To fix syntax bugs" }, correct: "B" }
  ]
};

export default function TechTrackDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [track, setTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState(null);
  
  // Quiz states
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  const loadTrackDetail = async () => {
    try {
      setLoading(true);
      const res = await techApi.trackDetail(slug);
      setTrack(res.data);
      if (res.data.lessons && res.data.lessons.length > 0) {
        // Default to first lesson
        setActiveLesson(res.data.lessons[0]);
      }
    } catch (err) {
      console.error("Failed to load track details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrackDetail();
  }, [slug]);

  const handleCompleteLesson = async (lessonId) => {
    try {
      await techApi.completeLesson(lessonId);
      // Reload track details to reflect new completion progress
      const res = await techApi.trackDetail(slug);
      setTrack(res.data);
      // Update active lesson completion state locally
      const updated = res.data.lessons.find(l => l.id === lessonId);
      if (updated) {
        setActiveLesson(updated);
      }
    } catch (err) {
      console.error("Failed to complete lesson", err);
    }
  };

  const handleQuizAnswerSelect = (questionId, option) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleQuizSubmit = async (lessonId) => {
    setSubmittingQuiz(true);
    setQuizResult(null);
    try {
      const res = await techApi.submitQuiz(lessonId, { answers: selectedAnswers });
      setQuizResult(res.data);
      if (res.data.passed) {
        // Refresh track details
        const trackRes = await techApi.trackDetail(slug);
        setTrack(trackRes.data);
        const updated = trackRes.data.lessons.find(l => l.id === lessonId);
        if (updated) {
          setActiveLesson(updated);
        }
      }
    } catch (err) {
      console.error("Failed to submit quiz", err);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c031a] text-white flex flex-col justify-between">
        <PublicNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
        <PublicFooter />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="min-h-screen bg-[#0c031a] text-white flex flex-col justify-between">
        <PublicNavbar />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <h2 className="text-2xl font-bold">Track not found.</h2>
          <Link to="/technology-skills" className="text-indigo-400 hover:underline">Back to tracks</Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const currentQuizQuestions = QUIZ_QUESTIONS[track.slug] || [];

  return (
    <div className="min-h-screen bg-[#0c031a] text-white font-sans overflow-x-hidden">
      <PublicNavbar />
      
      {/* Decorative Glow */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-[28rem] bg-gradient-to-b from-[#310c5a]/20 via-[#1c0836]/5 to-transparent blur-[140px]" />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header Navigation */}
        <div className="mb-6">
          <button 
            onClick={() => navigate("/technology-skills")}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Technology Tracks
          </button>
        </div>

        {/* Track Title Banner */}
        <section className="rounded-3xl border border-white/[0.06] bg-[#1a1130]/30 p-6 sm:p-8 shadow-xl mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                Technology Track Details
              </span>
              <h1 className="font-outfit text-3xl font-extrabold text-white sm:text-4xl">
                {track.name}
              </h1>
              <p className="text-sm text-slate-450 leading-relaxed max-w-3xl">
                {track.description}
              </p>
            </div>
            
            <div className="lg:col-span-4 rounded-2xl bg-[#0f0720]/60 border border-white/[0.05] p-5 space-y-3">
              <div className="flex justify-between text-xs font-semibold text-slate-350">
                <span>Overall Completion</span>
                <span className="text-indigo-400 font-bold">{Math.round(track.progress_percent)}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full transition-all duration-500" 
                  style={{ width: `${track.progress_percent}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Course Lesson Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT PANEL: Syllabus Tree / Lesson list */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-lg font-bold text-white mb-2">Syllabus Outline</h2>
            <div className="space-y-2.5">
              {track.lessons.map((lesson, idx) => {
                const isActive = activeLesson?.id === lesson.id;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      setActiveLesson(lesson);
                      setQuizResult(null);
                      setSelectedAnswers({});
                    }}
                    className={`w-full text-left rounded-2xl p-4 border flex items-center justify-between transition ${
                      isActive 
                        ? "border-indigo-500/50 bg-indigo-500/10" 
                        : "border-white/[0.05] bg-[#1a1130]/20 hover:bg-[#1a1130]/40"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                        isActive ? "bg-indigo-500 text-white" : "bg-slate-900 text-slate-400"
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isActive ? "text-white" : "text-slate-300"}`}>
                          {lesson.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-semibold text-slate-500">
                            {lesson.duration_minutes} mins
                          </span>
                          <span className="text-[10px] text-slate-600">•</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            lesson.content_type === "quiz" ? "text-indigo-400" : "text-slate-450"
                          }`}>
                            {lesson.content_type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-3">
                      {lesson.is_completed ? (
                        <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      ) : (
                        lesson.content_type === "quiz" ? (
                          <HelpCircle className="h-4.5 w-4.5 text-indigo-400/70" />
                        ) : (
                          <PlayCircle className="h-4.5 w-4.5 text-slate-500" />
                        )
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL: Active Lesson Workspace */}
          <div className="lg:col-span-7">
            {activeLesson ? (
              <div className="rounded-3xl border border-white/[0.06] bg-[#1a1130]/30 p-6 sm:p-8 shadow-xl space-y-6">
                
                {/* Lesson Header */}
                <div className="border-b border-white/[0.05] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                      Active Workspace
                    </span>
                    <h3 className="text-xl font-extrabold text-white mt-1">
                      {activeLesson.title}
                    </h3>
                  </div>
                  {activeLesson.is_completed && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 text-[10px] font-bold text-emerald-400 self-start sm:self-center">
                      <Check className="h-3.5 w-3.5" />
                      Completed
                    </span>
                  )}
                </div>

                {/* Lesson Media Viewer */}
                {activeLesson.content_type === "video" && (
                  <div className="space-y-4">
                    <div className="w-full aspect-video rounded-2xl bg-slate-950 border border-white/[0.05] overflow-hidden flex items-center justify-center relative">
                      {activeLesson.content_url ? (
                        <iframe
                          className="w-full h-full"
                          src={activeLesson.content_url.replace("watch?v=", "embed/")}
                          title={activeLesson.title}
                          allowFullScreen
                        />
                      ) : (
                        <div className="text-center p-6 text-slate-500">
                          <PlayCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-xs">No video stream linked for this lesson.</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 rounded-2xl bg-[#0f0720]/40 border border-white/[0.03] text-xs text-slate-400 leading-relaxed">
                      💡 <strong>Study Tip:</strong> Watch the lecture carefully, take notes, and then make sure to mark the lesson as completed below once done!
                    </div>
                  </div>
                )}

                {activeLesson.content_type === "text" && (
                  <div className="space-y-4">
                    <div className="min-h-[220px] rounded-2xl border border-white/[0.04] bg-[#0f0720]/40 p-6 text-sm text-slate-300 leading-relaxed space-y-4">
                      <p>
                        This lesson contains detailed reading materials and conceptual review guides for {track.name}. Read through the concepts systematically, and perform the practice steps.
                      </p>
                      <ul className="list-disc pl-5 space-y-2 text-xs text-slate-450">
                        <li>Systematically try out the code syntax or spreadsheet options explained.</li>
                        <li>Practice naming structures, directory management, or algorithm layouts.</li>
                        <li>Summarize the key takeaways in a notebook before completing the chapter.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Quiz content block */}
                {activeLesson.content_type === "quiz" && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/[0.02] p-5 flex items-start gap-3.5">
                      <HelpCircle className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-white">Track Assessment</h4>
                        <p className="text-xs text-slate-450 mt-1">
                          Submit the track quiz below to test your understanding. You must score <strong>60% or higher</strong> to pass and mark this final step as completed!
                        </p>
                      </div>
                    </div>

                    {/* Quiz Questions List */}
                    <div className="space-y-5">
                      {currentQuizQuestions.map((q, idx) => (
                        <div key={q.id} className="p-5 rounded-2xl border border-white/[0.05] bg-[#0f0720]/40 space-y-3.5">
                          <p className="text-xs font-bold text-white">
                            {idx + 1}. {q.text}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {Object.entries(q.options).map(([opt, text]) => {
                              const isSelected = selectedAnswers[q.id] === opt;
                              return (
                                <button
                                  key={opt}
                                  onClick={() => handleQuizAnswerSelect(q.id, opt)}
                                  disabled={activeLesson.is_completed}
                                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition flex items-center justify-between ${
                                    isSelected
                                      ? "border-indigo-500 bg-indigo-500/10 text-white"
                                      : "border-white/[0.05] bg-slate-900/60 text-slate-400 hover:border-slate-800"
                                  }`}
                                >
                                  <span>{opt}. {text}</span>
                                  {isSelected && <div className="h-2 w-2 rounded-full bg-indigo-400" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Submit Section */}
                    {!activeLesson.is_completed && (
                      <div className="pt-2">
                        <button
                          onClick={() => handleQuizSubmit(activeLesson.id)}
                          disabled={submittingQuiz || Object.keys(selectedAnswers).length < currentQuizQuestions.length}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-slate-800 disabled:text-slate-500 py-3.5 text-xs font-bold text-white transition active:scale-[0.98]"
                        >
                          {submittingQuiz ? "Evaluating Answers..." : "Submit Answers"}
                        </button>
                      </div>
                    )}

                    {/* Quiz result callback status */}
                    {quizResult && (
                      <div className={`p-6 rounded-2xl border text-center space-y-3 ${
                        quizResult.passed 
                          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-350" 
                          : "border-red-500/20 bg-red-500/5 text-red-350"
                      }`}>
                        <div className="text-lg font-black uppercase">
                          {quizResult.passed ? "Passed! 🎉" : "Not Passed Yet"}
                        </div>
                        <p className="text-xs">
                          You scored <strong>{Math.round(quizResult.score)}%</strong> on the assessment.
                        </p>
                        {quizResult.passed ? (
                          <p className="text-[11px] opacity-80">This final lesson has been marked as completed. You earned 30 XP points!</p>
                        ) : (
                          <p className="text-[11px] opacity-80">Please check your notes, review the lessons, and try the quiz again.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Complete lesson button for text & video */}
                {activeLesson.content_type !== "quiz" && !activeLesson.is_completed && (
                  <div className="pt-4 border-t border-white/[0.05]">
                    <button
                      onClick={() => handleCompleteLesson(activeLesson.id)}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 py-3.5 text-xs font-bold text-white transition active:scale-[0.98]"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark Lesson as Completed
                    </button>
                  </div>
                )}

              </div>
            ) : (
              <div className="rounded-3xl border border-white/[0.06] bg-[#1a1130]/20 p-12 text-center text-slate-500">
                <PlayCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select a lesson from the outline to start learning.</p>
              </div>
            )}
          </div>

        </div>

      </main>

      <PublicFooter />
    </div>
  );
}
