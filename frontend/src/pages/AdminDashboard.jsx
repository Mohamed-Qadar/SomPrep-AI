import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { examsApi, adminApi, packagesApi } from "../services/endpoints";
import LoadingState from "../components/LoadingState";
import {
  Sparkles,
  ArrowLeft,
  Plus,
  Trash2,
  X,
  Check,
  HelpCircle,
  AlertTriangle,
  BookOpen,
  Users,
  UserCheck,
  UserX,
  Lock,
  Phone,
  User,
  GraduationCap,
  School,
  FileText,
  Image,
  CreditCard,
  Wallet,
  Shield,
  Activity,
  MessageSquare,
  ChevronRight,
} from "lucide-react";

export default function AdminDashboard() {
  // Tab state lives in the URL (?tab=questions|teachers|packages) so the
  // AdminLayout sidebar can deep-link to a specific management tab.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "questions";
  const setActiveTab = (tab) => setSearchParams({ tab });

  // State managers
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal & Form States (Questions)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubtopic, setNewSubtopic] = useState("");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newExplanation, setNewExplanation] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newReflexTitle, setNewReflexTitle] = useState("");
  const [newDifficulty, setNewDifficulty] = useState("medium");
  const [options, setOptions] = useState([
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  // Modal & Form States (Teachers)
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherPhone, setTeacherPhone] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherSubject, setTeacherSubject] = useState("");
  const [teacherSchool, setTeacherSchool] = useState("");
  const [teacherBio, setTeacherBio] = useState("");
  const [teacherPhoto, setTeacherPhoto] = useState("");
  const [teacherPackageScope, setTeacherPackageScope] = useState("academic");

  // Package catalog form state
  const emptyPackageForm = {
    slug: "",
    name: "",
    display_title: "",
    category: "academic",
    audience: "",
    target: "",
    grade_range: "1-12",
    access_scope: "academic",
    annual_price: "",
    monthly_price: "",
    currency: "USD",
    duration_months: 12,
    features: "",
    button_label: "",
    details_path: "",
    is_active: true,
    sort_order: 100,
  };
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState(null);
  const [packageForm, setPackageForm] = useState(emptyPackageForm);

  // Status indicators
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [questionsRes, categoriesRes, subtopicsRes, teachersRes, packagesRes] = await Promise.all([
        examsApi.questions(),
        examsApi.categories(),
        examsApi.subtopics(),
        adminApi.teachers(),
        packagesApi.adminList(),
      ]);

      setQuestions(questionsRes.data);
      setCategories(categoriesRes.data);
      setSubtopics(subtopicsRes.data);
      setTeachers(teachersRes.data);
      setPackages(packagesRes.data);

      if (subtopicsRes.data.length > 0) {
         setNewSubtopic(subtopicsRes.data[0].id.toString());
      }
    } catch (err) {
      console.error("Error loading back-office data:", err);
      setError("Ma suurtagelin in la soo rogo xogta maamulka.");
    } finally {
      setLoading(false);
    }
  };


  const handleOptionChange = (idx, text) => {
    setOptions((prev) => {
      const nextOptions = [...prev];
      nextOptions[idx].text = text;
      return nextOptions;
    });
  };

  const handleCorrectSelect = (idx) => {
    setOptions((prev) => {
      return prev.map((opt, i) => ({
        ...opt,
        isCorrect: i === idx,
      }));
    });
  };

  const handleDeleteQuestion = async (qId) => {
    const confirmDelete = window.confirm(
      "Ma hubtaa inaad rabto inaad tirto su'aashan? Tallaabadan dib looma soo celin karo."
    );
    if (!confirmDelete) return;

    try {
      setError("");
      setSuccessMsg("");
      await examsApi.deleteQuestion(qId);
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
      setSuccessMsg("Su'aasha waa la tiray si guul leh!");
    } catch (err) {
      console.error("Error deleting question:", err);
      setError(
        err.response?.data?.detail || "Waxaa dhacay qalad intii lagu jiray tirtirista su'aasha."
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    // Form validatons
    if (!newSubtopic) {
      setError("Fadlan dooro mawduuca hoosaadka (Subtopic).");
      return;
    }
    if (!newQuestionText.trim()) {
      setError("Fadlan geli qoraalka su'aasha.");
      return;
    }

    // Check if options are valid
    const emptyOptions = options.some((opt) => !opt.text.trim());
    if (emptyOptions) {
      setError("Fadlan wada geli afarta doorasho (A, B, C, D) oo dhan.");
      return;
    }

    const hasCorrect = options.some((opt) => opt.isCorrect);
    if (!hasCorrect) {
      setError("Fadlan u calaamadee mid ka mid ah doorashooyinka inuu yahay midka saxda ah.");
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        subtopic_id: parseInt(newSubtopic),
        question_text: newQuestionText.trim(),
        difficulty_level: newDifficulty,
        explanation_text: newExplanation.trim() || null,
        explanation_video_url: newVideoUrl.trim() || null,
        reflex_step_title: newReflexTitle.trim() || null,
        choices: options.map((opt) => ({
          choice_text: opt.text.trim(),
          is_correct: opt.isCorrect,
        })),
      };

      const response = await examsApi.createQuestion(payload);

      // Append new question to state
      setQuestions((prev) => [...prev, response.data]);
      setSuccessMsg("Su'aasha cusub waa la keydiyay si guul leh!");

      // Clear Form state
      setNewQuestionText("");
      setNewExplanation("");
      setNewVideoUrl("");
      setNewReflexTitle("");
      setNewDifficulty("medium");
      setOptions([
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ]);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error creating question:", err);
      setError(
        err.response?.data?.detail || "Waxaa dhacay qalad intii lagu guda jiray keydinta su'aasha."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleTeacher = async (teacherId) => {
    try {
      setError("");
      setSuccessMsg("");
      const res = await adminApi.toggleTeacher(teacherId);
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacherId ? res.data : t))
      );
      setSuccessMsg("Xaaladda macallinka waa la beddelay si guul leh!");
    } catch (err) {
      console.error("Error toggling teacher status:", err);
      setError("Ma suurtagelin in la beddelo xaaladda macallinka.");
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!teacherPhone.trim() || !teacherName.trim() || !teacherPassword.trim()) {
      setError("Fadlan geli macluumaadka aasaasiga ah (Taleefan, Magac, Erey Sir ah).");
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        phone_number: teacherPhone.trim(),
        full_name: teacherName.trim(),
        password: teacherPassword,
        subject: teacherSubject.trim() || null,
        school: teacherSchool.trim() || null,
        bio: teacherBio.trim() || null,
        profile_photo_url: teacherPhoto.trim() || null,
        teacher_package_scope: teacherPackageScope,
      };

      const res = await adminApi.createTeacher(payload);
      setTeachers((prev) => [...prev, res.data]);
      setSuccessMsg("Akoonka macallinka cusub waa la abuuray si guul leh!");
      
      // Clear state
      setTeacherPhone("");
      setTeacherName("");
      setTeacherPassword("");
      setTeacherSubject("");
      setTeacherSchool("");
      setTeacherBio("");
      setTeacherPhoto("");
      setTeacherPackageScope("academic");
      setIsTeacherModalOpen(false);
    } catch (err) {
      console.error("Error creating teacher:", err);
      setError(
        err.response?.data?.detail || "Waxaa dhacay qalad intii lagu guda jiray diiwaangelinta macallinka."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Build lookup maps: subtopicId → subtopic, subtopicId → categoryId
  const subtopicMap = Object.fromEntries(subtopics.map((s) => [s.id, s]));
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));


  const openCreatePackage = () => {
    setEditingPackageId(null);
    setPackageForm(emptyPackageForm);
    setIsPackageModalOpen(true);
  };

  const openEditPackage = (pkg) => {
    setEditingPackageId(pkg.id);
    setPackageForm({
      slug: pkg.slug || pkg.id,
      name: pkg.name || pkg.title || "",
      display_title: pkg.display_title || pkg.displayTitle || "",
      category: pkg.category || "academic",
      audience: pkg.audience || "",
      target: pkg.target || "",
      grade_range: pkg.grade_range || "",
      access_scope: pkg.access_scope || "academic",
      annual_price: pkg.annual_price ?? "",
      monthly_price: pkg.monthly_price ?? "",
      currency: pkg.currency || "USD",
      duration_months: pkg.duration_months || 12,
      features: (pkg.features || []).join("\n"),
      button_label: pkg.button_label || pkg.button || "",
      details_path: pkg.details_path || pkg.detailsPath || "",
      is_active: pkg.is_active !== false,
      sort_order: pkg.sort_order ?? 100,
    });
    setIsPackageModalOpen(true);
  };

  const handlePackageField = (field, value) => {
    setPackageForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePackageSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    const payload = {
      ...packageForm,
      annual_price: parseFloat(packageForm.annual_price),
      monthly_price: packageForm.monthly_price === "" ? null : parseFloat(packageForm.monthly_price),
      duration_months: parseInt(packageForm.duration_months, 10),
      sort_order: parseInt(packageForm.sort_order, 10),
      features: packageForm.features.split("\n").map((f) => f.trim()).filter(Boolean),
    };
    if (!payload.slug || !payload.name || Number.isNaN(payload.annual_price)) {
      setError("Package slug, name, and annual price are required.");
      return;
    }
    setActionLoading(true);
    try {
      const res = editingPackageId
        ? await packagesApi.update(editingPackageId, payload)
        : await packagesApi.create(payload);
      setPackages((prev) => {
        const exists = prev.some((pkg) => pkg.id === res.data.id);
        return exists
          ? prev.map((pkg) => (pkg.id === res.data.id ? res.data : pkg))
          : [...prev, res.data].sort((a, b) => (a.sort_order || 100) - (b.sort_order || 100));
      });
      setSuccessMsg(editingPackageId ? "Package updated successfully." : "Package created successfully.");
      setIsPackageModalOpen(false);
      setEditingPackageId(null);
      setPackageForm(emptyPackageForm);
    } catch (err) {
      console.error("Error saving package:", err);
      setError(err.response?.data?.detail || "Package could not be saved.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePackage = async (pkg) => {
    const hard = !pkg.is_active;
    const confirmed = window.confirm(
      hard
        ? `Permanently delete "${pkg.name}"? This cannot be undone. It will be refused if any student still uses this package.`
        : `Deactivate "${pkg.name}"? Students keep their access, but the package is hidden from new signups. You can re-activate it later from Edit.`
    );
    if (!confirmed) return;
    setError("");
    setSuccessMsg("");
    setActionLoading(true);
    try {
      const res = await packagesApi.remove(pkg.id, { hard });
      setPackages((prev) =>
        hard
          ? prev.filter((p) => p.id !== pkg.id)
          : prev.map((p) => (p.id === pkg.id ? res.data : p))
      );
      setSuccessMsg(hard ? "Package deleted permanently." : "Package deactivated.");
    } catch (err) {
      console.error("Error deleting package:", err);
      setError(err.response?.data?.detail || "Package could not be deleted.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Questions
  const filteredQuestions = questions.filter((q) => {
    const sub = subtopicMap[q.subtopic_id];
    const matchesCategory =
      filterCategory === "all" ||
      (sub && sub.category_id === parseInt(filterCategory));
    const matchesSearch =
      q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.explanation_text && q.explanation_text.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return <LoadingState label="Loading admin workspace..." />;
  }

  const optionLetters = ["A", "B", "C", "D"];

  return (
    <div className="pb-12">
      {/* Page title (chrome lives in AdminLayout) */}
      <div className="mb-6">
        <h2 className="font-outfit text-xl font-bold text-white border-l-4 border-indigo-500 pl-3 leading-none">
          Maamulka Nuxurka (Content Management)
        </h2>
      </div>

      <main className="space-y-6 animate-fade-in">
        {/* Error/Success Alert Banners */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-brand-danger/10 border border-brand-danger/20 p-4 text-sm text-brand-danger animate-fade-in">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2.5 rounded-xl bg-brand-success/10 border border-brand-success/20 p-4 text-sm text-brand-success animate-fade-in">
            <Check className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex gap-4 border-b border-brand-border/60 pb-1">
          <button
            onClick={() => setActiveTab("questions")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all relative ${
              activeTab === "questions"
                ? "text-brand-primary font-bold border-b-2 border-brand-primary"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Bankiga Su'aalaha (Questions Bank)</span>
          </button>
          <button
            onClick={() => setActiveTab("teachers")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all relative ${
              activeTab === "teachers"
                ? "text-brand-primary font-bold border-b-2 border-brand-primary"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Maamulka Macallimiinta (Teachers)</span>
          </button>
          <button
            onClick={() => setActiveTab("packages")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all relative ${
              activeTab === "packages"
                ? "text-brand-primary font-bold border-b-2 border-brand-primary"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Packages & Pricing</span>
          </button>
        </div>

        {activeTab === "questions" ? (
          <>
            {/* Filter Controls Row */}
            <div className="glass-panel rounded-2xl p-5 border border-brand-border flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 shadow-xl">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                {/* Search filter input */}
                <input
                  type="text"
                  placeholder="Ka raadi su'aalaha..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 rounded-xl border border-brand-border bg-slate-950 py-2.5 px-4 text-sm text-white placeholder-slate-500 focus:border-brand-primary focus:outline-none"
                />

                {/* Category selection */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="rounded-xl border border-brand-border bg-slate-950 py-2.5 px-4 text-sm text-white focus:border-brand-primary focus:outline-none shrink-0"
                >
                  <option value="all">Dhamaan Mawduucyada (All Categories)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-lg hover:shadow-brand-primary/20 shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Ku Dar Su'aal (Add Question)</span>
              </button>
            </div>

            {/* Questions Display Section (Responsive Layout Shifts) */}
            {filteredQuestions.length === 0 ? (
              <div className="glass-panel rounded-2xl p-16 text-center border border-brand-border">
                <HelpCircle className="h-12 w-12 mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm">Wax su'aalo ah oo buuxinaya shuruudahaas lama helin.</p>
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="hidden md:block glass-panel rounded-2xl border border-brand-border overflow-hidden shadow-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-brand-border bg-slate-900/30 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <th className="p-4 pl-6">Mawduuca</th>
                        <th className="p-4 w-2/5">Su'aasha (Question)</th>
                        <th className="p-4">Doorashooyinka (Choices)</th>
                        <th className="p-4">Sharaxaadda (Explanation)</th>
                        <th className="p-4 pr-6 text-right">Tirtir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40 text-sm text-slate-300">
                      {filteredQuestions.map((q) => {
                        const sub = subtopicMap[q.subtopic_id];
                        const catName = sub
                          ? (categoryMap[sub.category_id]?.name || "General")
                          : "General";
                        const subtopicName = sub?.name || "";

                        return (
                          <tr key={q.id} className="hover:bg-slate-800/10 transition-colors">
                            <td className="p-4 pl-6 shrink-0">
                              <div className="font-semibold text-slate-300 text-xs">{catName}</div>
                              {subtopicName && (
                                <div className="text-[10px] text-slate-500 mt-0.5">{subtopicName}</div>
                              )}
                            </td>
                            <td className="p-4 font-semibold text-white leading-relaxed">
                              {q.question_text}
                            </td>
                            <td className="p-4 text-xs space-y-1">
                              {q.choices.map((choice, cIdx) => (
                                <div
                                  key={choice.id}
                                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${
                                    choice.is_correct
                                      ? "text-brand-success bg-brand-success/10 border border-brand-success/20 font-bold"
                                      : "text-slate-400"
                                  }`}
                                >
                                  <span>{optionLetters[cIdx]}:</span>
                                  <span>{choice.choice_text}</span>
                                </div>
                              ))}
                            </td>
                            <td className="p-4 text-xs text-slate-400 max-w-[200px] truncate" title={q.explanation_text}>
                              {q.explanation_text || "Ma jiraan wax sharaxaad ah."}
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="rounded-lg p-2 text-slate-500 hover:text-brand-danger hover:bg-brand-danger/10 border border-transparent transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards Layout */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {filteredQuestions.map((q) => {
                    const catName =
                      categories.find((c) => c.id === q.category_id)?.name || "General";

                    return (
                      <div
                        key={q.id}
                        className="glass-panel rounded-xl p-5 border border-brand-border space-y-4 shadow-lg"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/20">
                            {catName}
                          </span>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="rounded-lg p-2 text-slate-500 hover:text-brand-danger hover:bg-brand-danger/10 transition-colors"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>

                        <p className="text-sm font-semibold text-white leading-relaxed">
                          {q.question_text}
                        </p>

                        <div className="space-y-2 pt-2 border-t border-brand-border/40 text-xs">
                          {q.choices.map((choice, cIdx) => (
                            <div
                              key={choice.id}
                              className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                                choice.is_correct
                                  ? "bg-brand-success/5 border-brand-success/30 text-brand-success font-bold"
                                  : "bg-slate-900/40 border-brand-border text-slate-400"
                              }`}
                            >
                              <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                choice.is_correct ? "bg-brand-success text-white" : "bg-slate-950 text-slate-400"
                              }`}>
                                {optionLetters[cIdx]}
                              </div>
                              <span>{choice.choice_text}</span>
                            </div>
                          ))}
                        </div>

                        {q.explanation_text && (
                          <div className="rounded-lg bg-slate-950/40 border border-brand-border/40 p-3 text-xs text-slate-400">
                            <div className="flex items-center gap-1.5 text-brand-primary font-bold uppercase tracking-wider mb-1">
                              <BookOpen className="h-3 w-3" />
                              <span>Sharaxaada</span>
                            </div>
                            <p>{q.explanation_text}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : activeTab === "teachers" ? (
          <>
            {/* Teacher Controls Row */}
            <div className="glass-panel rounded-2xl p-5 border border-brand-border flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 shadow-xl">
              <div className="text-sm text-slate-400">
                Total Registered Teachers: <span className="font-bold text-white font-mono">{teachers.length}</span>
              </div>
              <button
                onClick={() => setIsTeacherModalOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-lg hover:shadow-brand-primary/20 shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Diiwaangeli Macallin (Add Teacher)</span>
              </button>
            </div>

            {/* Teachers List */}
            <div className="glass-panel rounded-2xl border border-brand-border overflow-hidden shadow-xl">
              {teachers.length === 0 ? (
                <div className="p-16 text-center">
                  <Users className="h-12 w-12 mx-auto text-slate-605 mb-3" />
                  <p className="text-slate-400 text-sm">Wax macallimiin ah oo diiwaangashan hadda lama helin.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-brand-border bg-slate-900/30 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        <th className="p-4 pl-6">Macallinka (Teacher)</th>
                        <th className="p-4">Taleefanka (Phone)</th>
                        <th className="p-4">Maaddada (Subject)</th>
                        <th className="p-4">Iskoolka (School)</th>
                        <th className="p-4">Xaaladda (Status)</th>
                        <th className="p-4 pr-6 text-right">Waxqabad (Action)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/40 text-sm text-slate-300">
                      {teachers.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-800/10 transition-colors">
                          <td className="p-4 pl-6 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-brand-indigo/20 border border-brand-indigo/35 flex items-center justify-center text-brand-indigo font-bold text-sm shrink-0 uppercase">
                              {t.full_name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{t.full_name}</div>
                              {t.bio && (
                                <div className="text-[11px] text-slate-500 max-w-[200px] truncate" title={t.bio}>
                                  {t.bio}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-mono text-slate-300">{t.phone_number}</td>
                          <td className="p-4 font-semibold text-brand-indigo">{t.subject || "General"}</td>
                          <td className="p-4 text-slate-400">{t.school || "SomPrep School"}</td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                t.is_active
                                  ? "bg-brand-success/10 text-brand-success border border-brand-success/20"
                                  : "bg-brand-danger/10 text-brand-danger border border-brand-danger/20"
                              }`}
                            >
                              {t.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                              <span>{t.is_active ? "Active" : "Inactive"}</span>
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <button
                              onClick={() => handleToggleTeacher(t.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                t.is_active
                                  ? "border-brand-danger/30 text-brand-danger hover:bg-brand-danger/10"
                                  : "border-brand-success/30 text-brand-success hover:bg-brand-success/10"
                              }`}
                            >
                              {t.is_active ? "Dami (Deactivate)" : "Daar (Activate)"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="glass-panel rounded-2xl p-5 border border-brand-border flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 shadow-xl">
              <div>
                <div className="text-sm font-bold text-white">Package Catalog</div>
                <p className="text-xs text-slate-400 mt-1">Admin can change prices, add packages, or disable packages without editing code.</p>
              </div>
              <button
                onClick={openCreatePackage}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-lg hover:shadow-brand-primary/20 shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Add Package</span>
              </button>
            </div>

            <div className="glass-panel rounded-2xl border border-brand-border overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-brand-border bg-slate-900/30 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="p-4 pl-6">Package</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Access</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 pr-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/40 text-sm text-slate-300">
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="font-bold text-white">{pkg.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{pkg.slug}</div>
                          <div className="text-[11px] text-slate-400 mt-1 max-w-xs truncate">{pkg.target || pkg.audience}</div>
                        </td>
                        <td className="p-4 capitalize">{pkg.category}</td>
                        <td className="p-4">
                          <span className="rounded-full border border-brand-border bg-slate-950 px-2 py-1 text-[11px] font-bold text-slate-300">
                            {pkg.access_scope} {pkg.grade_range ? `(${pkg.grade_range})` : ""}
                          </span>
                        </td>
                        <td className="p-4 font-black text-emerald-400">${Number(pkg.annual_price).toFixed(2)} / {pkg.duration_months} mo</td>
                        <td className="p-4">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${pkg.is_active ? "bg-brand-success/10 text-brand-success" : "bg-brand-danger/10 text-brand-danger"}`}>
                            {pkg.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditPackage(pkg)}
                              className="rounded-lg border border-brand-border px-3 py-1.5 text-xs font-bold text-brand-primary hover:bg-brand-primary/10"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePackage(pkg)}
                              disabled={actionLoading}
                              className="rounded-lg border border-brand-danger/40 px-3 py-1.5 text-xs font-bold text-brand-danger hover:bg-brand-danger/10 disabled:opacity-50"
                            >
                              {pkg.is_active ? "Deactivate" : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>



      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl max-h-[calc(100dvh-2rem)] bg-brand-card border border-brand-border rounded-2xl overflow-hidden shadow-2xl my-4 flex flex-col">
            <div className="flex shrink-0 items-center justify-between p-4 sm:p-5 border-b border-brand-border">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-brand-primary" />
                <h3 className="font-outfit text-lg font-bold text-white">{editingPackageId ? "Edit Package" : "Add Package"}</h3>
              </div>
              <button onClick={() => setIsPackageModalOpen(false)} className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePackageSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-2 text-xs font-bold text-slate-400">Slug
                  <input value={packageForm.slug} onChange={(e) => handlePackageField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className="w-full rounded-xl border border-brand-border bg-slate-950 p-3 text-sm text-white" placeholder="new-package" />
                </label>
                <label className="space-y-2 text-xs font-bold text-slate-400">Package Name
                  <input value={packageForm.name} onChange={(e) => handlePackageField("name", e.target.value)} className="w-full rounded-xl border border-brand-border bg-slate-950 p-3 text-sm text-white" placeholder="Academic Exam Prep Bundle" />
                </label>
                <label className="space-y-2 text-xs font-bold text-slate-400">Category
                  <select value={packageForm.category} onChange={(e) => handlePackageField("category", e.target.value)} className="w-full rounded-xl border border-brand-border bg-slate-950 p-3 text-sm text-white">
                    <option value="academic">Academic</option>
                    <option value="technology">Technology</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="space-y-2 text-xs font-bold text-slate-400">Access Scope
                  <select value={packageForm.access_scope} onChange={(e) => handlePackageField("access_scope", e.target.value)} className="w-full rounded-xl border border-brand-border bg-slate-950 p-3 text-sm text-white">
                    <option value="academic">Academic: Grade 1-12</option>
                    <option value="primary">Primary: Grade 1-4</option>
                    <option value="middle">Middle: Grade 5-8</option>
                    <option value="secondary">Secondary: Grade 9-12</option>
                    <option value="technology">Technology only</option>
                    <option value="none">No grade access</option>
                  </select>
                </label>
                <label className="space-y-2 text-xs font-bold text-slate-400">Annual Price USD
                  <input type="number" step="0.01" min="0" value={packageForm.annual_price} onChange={(e) => handlePackageField("annual_price", e.target.value)} className="w-full rounded-xl border border-brand-border bg-slate-950 p-3 text-sm text-white" placeholder="7.50" />
                </label>
                <label className="space-y-2 text-xs font-bold text-slate-400">Monthly Price Optional
                  <input type="number" step="0.01" min="0" value={packageForm.monthly_price} onChange={(e) => handlePackageField("monthly_price", e.target.value)} className="w-full rounded-xl border border-brand-border bg-slate-950 p-3 text-sm text-white" placeholder="1.00" />
                </label>
                <label className="space-y-2 text-xs font-bold text-slate-400">Audience
                  <input value={packageForm.audience} onChange={(e) => handlePackageField("audience", e.target.value)} className="w-full rounded-xl border border-brand-border bg-slate-950 p-3 text-sm text-white" placeholder="Grade 1-12 students" />
                </label>
                <label className="space-y-2 text-xs font-bold text-slate-400">Target
                  <input value={packageForm.target} onChange={(e) => handlePackageField("target", e.target.value)} className="w-full rounded-xl border border-brand-border bg-slate-950 p-3 text-sm text-white" placeholder="Primary, Middle, and Secondary Exam Prep" />
                </label>
                <label className="space-y-2 text-xs font-bold text-slate-400">Grade Range Label
                  <input value={packageForm.grade_range} onChange={(e) => handlePackageField("grade_range", e.target.value)} className="w-full rounded-xl border border-brand-border bg-slate-950 p-3 text-sm text-white" placeholder="1-12" />
                </label>
                <label className="space-y-2 text-xs font-bold text-slate-400">Sort Order
                  <input type="number" value={packageForm.sort_order} onChange={(e) => handlePackageField("sort_order", e.target.value)} className="w-full rounded-xl border border-brand-border bg-slate-950 p-3 text-sm text-white" />
                </label>
              </div>
              <label className="space-y-2 text-xs font-bold text-slate-400 block">Features - one per line
                <textarea value={packageForm.features} onChange={(e) => handlePackageField("features", e.target.value)} rows={6} className="w-full rounded-xl border border-brand-border bg-slate-950 p-3 text-sm text-white" />
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <input type="checkbox" checked={packageForm.is_active} onChange={(e) => handlePackageField("is_active", e.target.checked)} />
                Active package visible to students
              </label>
              <div className="flex justify-end gap-3 border-t border-brand-border pt-4">
                <button type="button" onClick={() => setIsPackageModalOpen(false)} className="rounded-xl border border-brand-border px-5 py-3 text-xs font-bold text-slate-300">Cancel</button>
                <button type="submit" disabled={actionLoading} className="rounded-xl bg-brand-primary px-5 py-3 text-xs font-bold text-white disabled:opacity-60">Save Package</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Add Question Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[calc(100dvh-2rem)] bg-brand-card border border-brand-border rounded-2xl overflow-hidden shadow-2xl animate-fade-in my-4 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-brand-border">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-brand-primary" />
                <h3 className="font-outfit text-lg font-bold text-white">Abuur Su'aal Cusub (Add Question)</h3>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setError("");
                }}
                className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Subtopic selector (grouped by category) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Dooro Mawduuca Hoosaadka (Subtopic)
                </label>
                <select
                  value={newSubtopic}
                  onChange={(e) => setNewSubtopic(e.target.value)}
                  className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white focus:border-brand-primary focus:outline-none"
                >
                  {subtopics.length === 0 && (
                    <option value="" disabled>Wax mawduucyo hoosaad ah lama helin</option>
                  )}
                  {categories.map((cat) => {
                    const catSubs = subtopics.filter((s) => s.category_id === cat.id);
                    if (catSubs.length === 0) return null;
                    return (
                      <optgroup key={cat.id} label={`── ${cat.name} ──`}>
                        {catSubs.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Qoraalka Su'aasha (Question Text)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Geli qoraalka su'aasha halkan..."
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white placeholder-slate-650 transition-colors focus:border-brand-primary focus:outline-none"
                />
              </div>

              {/* Options list */}
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Afarta Doorasho & Midka Saxda ah (Choices & Answer Key)
                </label>

                <div className="space-y-3">
                  {options.map((opt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-slate-900/40 border border-brand-border/60 rounded-xl p-3"
                    >
                      {/* Correct answer indicator selector */}
                      <button
                        type="button"
                        onClick={() => handleCorrectSelect(idx)}
                        className={`h-7 w-7 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                          opt.isCorrect
                            ? "bg-brand-success border-brand-success text-white"
                            : "bg-slate-900 border-brand-border text-slate-500 hover:border-slate-600"
                        }`}
                      >
                        {opt.isCorrect ? <Check className="h-4 w-4" /> : optionLetters[idx]}
                      </button>

                      {/* Choice Text input */}
                      <input
                        type="text"
                        required
                        placeholder={`Doorashada ${optionLetters[idx]}...`}
                        value={opt.text}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        className="flex-1 bg-transparent border-none text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-0 py-1"
                      />

                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        {opt.isCorrect ? "Correct" : "Option"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Difficulty Level */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Heerka Adkaanta (Difficulty Level)
                </label>
                <div className="flex gap-2">
                  {[
                    { value: "easy",   label: "Fudud (Easy)",   color: "border-brand-success text-brand-success bg-brand-success/10" },
                    { value: "medium", label: "Dhexdhexaad",     color: "border-brand-indigo text-brand-indigo bg-brand-indigo/10"  },
                    { value: "hard",   label: "Adag (Hard)",     color: "border-brand-danger text-brand-danger bg-brand-danger/10"  },
                  ].map(({ value, label, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setNewDifficulty(value)}
                      className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${
                        newDifficulty === value ? color : "border-brand-border text-slate-500 hover:border-slate-500"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reflex Step Title */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  ⚡ Reflex Step Title (Diagnostic — Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Reflex 1: Aqoonso sharciga aasaasiga → Reflex 2: Fududee"
                  value={newReflexTitle}
                  onChange={(e) => setNewReflexTitle(e.target.value)}
                  className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white placeholder-slate-600 transition-colors focus:border-brand-primary focus:outline-none"
                />
              </div>

              {/* Explanation Text */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Talo & Sharraxaad (Tutor Explanation — Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Geli sharraxaadda su'aasha si ardaygu wax uga barto..."
                  value={newExplanation}
                  onChange={(e) => setNewExplanation(e.target.value)}
                  className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white placeholder-slate-600 transition-colors focus:border-brand-primary focus:outline-none"
                />
              </div>

              {/* Explanation Video URL */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  🎬 Muuqaalka Sharaxaadda (YouTube URL — Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 px-4 text-sm text-white placeholder-slate-600 transition-colors focus:border-brand-primary focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setError("");
                  }}
                  disabled={actionLoading}
                  className="rounded-xl border border-brand-border px-5 py-3 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Ka Bax (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-blue-600 px-6 py-3 text-xs font-semibold text-white transition-all disabled:opacity-50"
                >
                  {actionLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                      Keydinayaa...
                    </span>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Keydi Su'aasha (Save)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add Teacher Modal Overlay */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg max-h-[calc(100dvh-2rem)] bg-brand-card border border-brand-border rounded-2xl overflow-hidden shadow-2xl animate-fade-in my-4 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-brand-border">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-primary" />
                <h3 className="font-outfit text-lg font-bold text-white">Diiwaangeli Macallin Cusub (Add Teacher)</h3>
              </div>
              <button
                onClick={() => {
                  setIsTeacherModalOpen(false);
                  setError("");
                }}
                className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateTeacher} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Magaca Macallinka (Full Name)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maxamed Cali"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 pl-10 pr-4 text-sm text-white focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    Taleefanka (Phone Number)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Phone className="h-4 w-4" />
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="61xxxxxxx"
                      value={teacherPhone}
                      onChange={(e) => setTeacherPhone(e.target.value)}
                      className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 pl-10 pr-4 text-sm text-white focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    Ereyga Sirta ah (Password)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="At least 6 chars"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 pl-10 pr-4 text-sm text-white focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    Mawduuca / Maaddada (Subject)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <GraduationCap className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Mathematics"
                      value={teacherSubject}
                      onChange={(e) => setTeacherSubject(e.target.value)}
                      className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 pl-10 pr-4 text-sm text-white focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                    Iskoolka (School)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <School className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. Mogadishu High"
                      value={teacherSchool}
                      onChange={(e) => setTeacherSchool(e.target.value)}
                      className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 pl-10 pr-4 text-sm text-white focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Sawirka Profile-ka (Photo URL - Optional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Image className="h-4 w-4" />
                  </span>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={teacherPhoto}
                    onChange={(e) => setTeacherPhoto(e.target.value)}
                    className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 pl-10 pr-4 text-sm text-white focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Taariikh nololeedka (Bio - Optional)
                </label>
                <div className="relative">
                  <span className="absolute top-3 left-3 text-slate-500">
                    <FileText className="h-4 w-4" />
                  </span>
                  <textarea
                    rows={2}
                    placeholder="Macallinka taariikhdiisa oo kooban..."
                    value={teacherBio}
                    onChange={(e) => setTeacherBio(e.target.value)}
                    className="block w-full rounded-xl border border-brand-border bg-slate-900 py-3 pl-10 pr-4 text-sm text-white focus:border-brand-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsTeacherModalOpen(false);
                    setError("");
                  }}
                  disabled={actionLoading}
                  className="rounded-xl border border-brand-border px-5 py-3 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Ka Bax (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-blue-600 px-6 py-3 text-xs font-semibold text-white transition-all disabled:opacity-50"
                >
                  {actionLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                      Diiwaangalinayaa...
                    </span>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Keydi Macallinka (Save)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
