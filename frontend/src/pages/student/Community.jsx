import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { communityApi, moderationApi } from "../../services/endpoints";
import {
  MessageSquare,
  Users,
  Trophy,
  Zap,
  Flame,
  Send,
  PlusCircle,
  Image,
  Shield,
  HelpCircle,
  Loader2,
  AlertTriangle,
  Award,
  BookOpen,
  ArrowRight,
  User as UserIcon,
  X,
  Search,
  CheckCircle2,
  Flag,
  Slash,
  Maximize2,
  Lock
} from "lucide-react";

// Client-side profanity checking matching backend list
const PROFANITY_WORDS = [
  "fuck", "shit", "bitch", "asshole", "bastard", "dick", "cunt", "pussy",
  "was", "wasa", "waso", "wasaya", "wasaye", "siil", "gus", "kintir", "futada", "dabo",
  "qooq", "naas", "nacas", "doqon", "wasmo"
];

const MAX_COMMUNITY_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_COMMUNITY_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

function ProtectedImage({ src, alt, className }) {
  const [objectUrl, setObjectUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) return undefined;
    if (!src.startsWith("/api/community/media/")) {
      setObjectUrl(src);
      return undefined;
    }

    let localUrl = "";
    let cancelled = false;
    setFailed(false);
    communityApi.mediaBlob(src)
      .then((res) => {
        if (cancelled) return;
        localUrl = URL.createObjectURL(res.data);
        setObjectUrl(localUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [src]);

  if (failed) {
    return <div className="flex h-28 items-center justify-center bg-slate-950 text-[10px] text-slate-500">Image unavailable</div>;
  }

  if (!objectUrl) {
    return <div className="flex h-28 items-center justify-center bg-slate-950"><Loader2 className="h-4 w-4 animate-spin text-indigo-400" /></div>;
  }

  return <img src={objectUrl} alt={alt} className={className} />;
}

export default function Community() {
  const { user, subscriptionActive } = useAuth();
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState("chat"); // 'chat', 'homework', 'leaderboard'

  // General states
  const [_loading, _setLoading] = useState(false);
  const [_errorMsg, setErrorMsg] = useState("");

  // Modal states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Profile modal data
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Report modal data
  const [reportMessageId, setReportMessageId] = useState(null);
  const [reportReason, setReportReason] = useState("Abaabulo colaad ama anshax xumo");

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 1: CHAT STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [profanityWarning, setProfanityWarning] = useState(false);
  const [chatImageInput, setChatImageInput] = useState("");
  const [chatImageName, setChatImageName] = useState("");
  const [chatImageUploading, setChatImageUploading] = useState(false);
  
  // Custom group creation
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupType, setNewGroupType] = useState("group"); // 'group' or 'direct'
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);

  // Auto-scroll ref
  const messagesEndRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 2: HOMEWORK HELP STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [replyText, setReplyText] = useState("");
  const [aiCoachLoading, setAiCoachLoading] = useState(false);
  const [aiCoachOutput, setAiCoachOutput] = useState(null); // { type, text }
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  // New question form
  const [newQTitle, setNewQTitle] = useState("");
  const [newQDesc, setNewQDesc] = useState("");
  const [newQSubject, setNewQSubject] = useState("Mathematics");
  const [newQGrade, setNewQGrade] = useState(user?.grade_level || 12);
  const [newQImageUrl, setNewQImageUrl] = useState("");
  const [newQImageName, setNewQImageName] = useState("");
  const [questionImageUploading, setQuestionImageUploading] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // TAB 3: LEADERBOARD & MISSIONS STATE
  // ─────────────────────────────────────────────────────────────────────────────
  const [rankings, setRankings] = useState([]);
  const [missions, setMissions] = useState([]);

  // ─────────────────────────────────────────────────────────────────────────────
  // GENERAL DATA FETCHING
  // ─────────────────────────────────────────────────────────────────────────────
  const loadChatData = useCallback(async () => {
    setChatLoading(true);
    try {
      const res = await communityApi.rooms();
      setRooms(res.data);
      if (res.data.length > 0 && !currentRoom) {
        setCurrentRoom(res.data[0]);
      }
    } catch (err) {
      console.error("Failed to load rooms:", err);
      setErrorMsg("Qalad ayaa dhacay intii lagu guda jiray soo rarista qolalka wada-hadalka.");
    } finally {
      setChatLoading(false);
    }
  }, [currentRoom]);

  const loadHomeworkData = useCallback(async () => {
    try {
      const res = await communityApi.questions(filterSubject, filterGrade);
      setQuestions(res.data);
      // Update selected question in place if open
      if (selectedQuestion) {
        const updated = res.data.find(q => q.id === selectedQuestion.id);
        if (updated) setSelectedQuestion(updated);
      }
    } catch (err) {
      console.error("Failed to load homework questions:", err);
    }
  }, [filterSubject, filterGrade, selectedQuestion]);

  // Moderation: admins/teachers can remove inappropriate Q&A posts.
  const handleModerateDeleteQuestion = async (q) => {
    const confirmed = window.confirm(
      `Delete this question by ${q.user_name}? This cannot be undone and is recorded in the audit log.`
    );
    if (!confirmed) return;
    try {
      await moderationApi.deleteQuestion(q.id);
      setQuestions((prev) => prev.filter((x) => x.id !== q.id));
      if (selectedQuestion?.id === q.id) setSelectedQuestion(null);
    } catch (err) {
      console.error("Failed to delete question:", err);
      setErrorMsg("Su'aasha lama tirtiri karin. (Could not delete the question.)");
    }
  };

  const loadLeaderboardData = useCallback(async () => {
    try {
      const resL = await communityApi.leaderboard();
      setRankings(resL.data.rankings);
      const resM = await communityApi.missions();
      setMissions(resM.data);
    } catch (err) {
      console.error("Failed to load gamification data:", err);
    }
  }, []);

  // Fetch messages when current room changes
  useEffect(() => {
    if (!currentRoom) return;
    let isMounted = true;

    const fetchMessages = async () => {
      try {
        const res = await communityApi.messages(currentRoom.id);
        if (isMounted) setMessages(res.data);
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    };

    fetchMessages();
    // Poll messages every 6 seconds for simple real-time feel
    const interval = setInterval(fetchMessages, 6000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentRoom]);

  // Scroll to bottom helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load initial tab data
  useEffect(() => {
    if (activeSubTab === "chat") {
      loadChatData();
    } else if (activeSubTab === "homework") {
      loadHomeworkData();
    } else if (activeSubTab === "leaderboard") {
      loadLeaderboardData();
    }
  }, [activeSubTab, loadChatData, loadHomeworkData, loadLeaderboardData]);

  useEffect(() => {
    if (!showCreateGroupModal || memberSearchQuery.trim().length < 2) {
      setMemberSearchResults([]);
      return undefined;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setMemberSearchLoading(true);
      try {
        const res = await communityApi.searchUsers(memberSearchQuery.trim());
        if (!cancelled) {
          setMemberSearchResults(
            res.data.filter((candidate) => !selectedMembers.some((member) => member.id === candidate.id))
          );
        }
      } catch (err) {
        if (!cancelled) setMemberSearchResults([]);
      } finally {
        if (!cancelled) setMemberSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [memberSearchQuery, selectedMembers, showCreateGroupModal]);

  const uploadCommunityImage = async (file) => {
    if (!file) return null;
    if (!ALLOWED_COMMUNITY_IMAGE_TYPES.includes(file.type)) {
      throw new Error("Only PNG, JPG, or WEBP images are allowed.");
    }
    if (file.size > MAX_COMMUNITY_IMAGE_BYTES) {
      throw new Error("Image must be under 5MB.");
    }
    const formData = new FormData();
    formData.append("file", file);
    const res = await communityApi.uploadMedia(formData);
    return res.data;
  };

  const addSelectedMember = (candidate) => {
    setSelectedMembers((prev) => {
      if (newGroupType === "direct") return [candidate];
      if (prev.some((member) => member.id === candidate.id)) return prev;
      return [...prev, candidate];
    });
    setMemberSearchQuery("");
    setMemberSearchResults([]);
  };

  const removeSelectedMember = (memberId) => {
    setSelectedMembers((prev) => prev.filter((member) => member.id !== memberId));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS: CHAT
  // ─────────────────────────────────────────────────────────────────────────────
  const handleChatTextChange = (e) => {
    const txt = e.target.value;
    setNewMessageText(txt);

    // Dynamic profanity warn
    const cleanText = txt.toLowerCase().replace(/[^\w\s]/g, "");
    const words = cleanText.split(/\s+/);
    const hasBadWord = words.some(w => PROFANITY_WORDS.includes(w));
    setProfanityWarning(hasBadWord);
  };

  const handleChatImageSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setChatImageUploading(true);
    try {
      const uploaded = await uploadCommunityImage(file);
      setChatImageInput(uploaded.media_url);
      setChatImageName(file.name);
    } catch (err) {
      alert(err.message || "Image upload failed.");
    } finally {
      setChatImageUploading(false);
    }
  };

  const handleQuestionImageSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setQuestionImageUploading(true);
    try {
      const uploaded = await uploadCommunityImage(file);
      setNewQImageUrl(uploaded.media_url);
      setNewQImageName(file.name);
    } catch (err) {
      alert(err.message || "Image upload failed.");
    } finally {
      setQuestionImageUploading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (chatImageUploading) return;
    if (!newMessageText.trim() && !chatImageInput) return;
    if (profanityWarning) {
      alert("Fadlan bedel farriintaada, waxaa ku jira kalmado anshax xumo ah.");
      return;
    }

    setSendingMsg(true);
    try {
      const res = await communityApi.sendMessage(currentRoom.id, {
        content: newMessageText,
        image_url: chatImageInput || null
      });
      setMessages(prev => [...prev, res.data]);
      setNewMessageText("");
      setChatImageInput("");
      setChatImageName("");
    } catch (err) {
      alert(err.response?.data?.detail || "Qalad ayaa dhacay intii dirista farriinta.");
    } finally {
      setSendingMsg(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (newGroupType === "group" && !newGroupName.trim()) return;
    if (newGroupType === "direct" && selectedMembers.length !== 1) {
      alert("Dooro hal arday si aad DM u bilowdo. (Choose one student to start a DM.)");
      return;
    }

    try {
      const membersArr = selectedMembers.map((member) => member.id);

      const res = await communityApi.createRoom({
        name: newGroupType === "direct" ? `DM: ${selectedMembers[0]?.full_name || "Student"}` : newGroupName,
        type: newGroupType,
        members: membersArr
      });
      setRooms(prev => [res.data, ...prev]);
      setCurrentRoom(res.data);
      setShowCreateGroupModal(false);
      setNewGroupName("");
      setSelectedMembers([]);
      setMemberSearchQuery("");
      setMemberSearchResults([]);
    } catch (err) {
      alert(err.response?.data?.detail || "Qalad ayaa dhacay markii la abuuraayay qolka wada-hadalka.");
    }
  };

  const handleBlockUser = async (userId) => {
    if (!confirm("Ma hubtaa inaad rabto inaad xannibto ardaygan? Ma arki doontid farriimihiisa hadhow.")) return;
    try {
      await communityApi.blockUser(userId);
      alert("Ardayga waa la xannibay.");
      // Reload messages
      const res = await communityApi.messages(currentRoom.id);
      setMessages(res.data);
      setShowProfileModal(false);
    } catch (err) {
      alert("Xannibaadda waa ay guuldareysatay.");
    }
  };

  const handleReportMessageSubmit = async (e) => {
    e.preventDefault();
    try {
      await communityApi.reportMessage(reportMessageId, reportReason);
      alert("Farriinta waa la soo sheegay. Macallimiinta ayaa dib u eegi doona.");
      setShowReportModal(false);
    } catch (err) {
      alert("Gudbinta soo-sheegista waa ay guuldareysatay.");
    }
  };

  const openStudentProfile = async (userId) => {
    setProfileLoading(true);
    setShowProfileModal(true);
    try {
      const res = await communityApi.profile(userId);
      setProfileData(res.data);
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setProfileLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // HANDLERS: HOMEWORK
  // ─────────────────────────────────────────────────────────────────────────────
  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (questionImageUploading) return;
    if (!newQTitle.trim() || !newQDesc.trim()) return;

    setSubmittingQuestion(true);
    try {
      await communityApi.createQuestion({
        title: newQTitle,
        description: newQDesc,
        subject: newQSubject,
        grade_level: parseInt(newQGrade),
        image_url: newQImageUrl || null
      });

      alert("Su'aashaada waa la soo geliyey! Waxaa lagu siiyey +10 XP.");
      setShowAddQuestionModal(false);
      setNewQTitle("");
      setNewQDesc("");
      setNewQImageUrl("");
      setNewQImageName("");
      loadHomeworkData();
    } catch (err) {
      alert(err.response?.data?.detail || "Gudbinta su'aasha waa ay guuldareysatay.");
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSubmittingReply(true);
    try {
      const res = await communityApi.replyToQuestion(selectedQuestion.id, {
        content: replyText
      });
      // Add reply to state
      setSelectedQuestion(prev => ({
        ...prev,
        replies: [...(prev.replies || []), res.data]
      }));
      setReplyText("");
      // Refresh list
      loadHomeworkData();
    } catch (err) {
      alert(err.response?.data?.detail || "Gudbinta jawaabta waa ay guuldareysatay.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleAskCoachRefik = async (action) => {
    setAiCoachLoading(true);
    setAiCoachOutput(null);
    try {
      const res = await communityApi.askAi(selectedQuestion.id, { action });
      // Update selected question cache
      setSelectedQuestion(res.data);
      // Display the target output
      let text = "";
      if (action === "hint") text = res.data.ai_hint;
      else if (action === "solution") text = res.data.ai_solution;
      else text = res.data.ai_similar_question;

      setAiCoachOutput({ action, text });
      loadHomeworkData();
    } catch (err) {
      console.error(err);
      alert("Koochka AI Refik hadda diyaar ma aha.");
    } finally {
      setAiCoachLoading(false);
    }
  };

  // Helper to split AI response by dividers
  const renderAiFormattedMessage = (msg) => {
    if (!msg) return null;
    const divider = "─────────────────────";
    const parts = msg.split(divider);
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs sm:text-sm text-slate-200 leading-relaxed">
          <p className="font-bold text-indigo-400 mb-2 flex items-center gap-1.5">
            <span>🇸🇴 Sharixaada Somali:</span>
          </p>
          <div className="whitespace-pre-line">{parts[0].replace(/===.*?===/g, "").trim()}</div>
        </div>
        {parts[1] && (
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs sm:text-sm text-slate-350 leading-relaxed">
            <p className="font-bold text-slate-400 mb-2 flex items-center gap-1.5">
              <span>🇬🇧 English Explanation:</span>
            </p>
            <div className="whitespace-pre-line">{parts[1].trim()}</div>
          </div>
        )}
      </div>
    );
  };


  if (!subscriptionActive && user?.role === "student") {
    return (
      <div className="flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-lg rounded-3xl border border-indigo-950/40 bg-gradient-to-b from-[#130b24] to-[#0d051a] p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          {/* Glow decoration */}
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl" />

          {/* Lock Icon */}
          <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto shrink-0 relative">
            <Lock className="h-6 w-6" />
            <div className="absolute inset-0 rounded-2xl bg-indigo-500/5 animate-ping opacity-45" />
          </div>

          {/* Messaging */}
          <div className="space-y-2.5">
            <h3 className="font-outfit text-lg font-bold text-white tracking-wide">
              Bulshada Ardayda (Student Community)
            </h3>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              Kaliya ardayda subscribed ah ayaa isticmaali kara adeegyadan.
            </p>
            <p className="text-[10px] text-slate-500 leading-snug">
              Kula hadal fasalkaaga, weydii su'aalo koochka AI, oo hel dhibco iyo XP adoo caawinaya ardayda kale. Fadlan is-qor ama hawlgeli rukunkaaga si aad u hesho adeegyadan bulshada.
              (Connect with classmates, ask AI coach homework questions, and earn points by helping others. Upgrade your subscription package to unlock community rooms.)
            </p>
          </div>

          {/* Upgrade Button */}
          <button
            onClick={() => navigate("/dashboard/profile")}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3.5 text-xs font-bold text-white transition active:scale-[0.98] shadow-lg shadow-indigo-600/25"
          >
            <span>Upgrade Package (Daar Rukunkaaga)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-slate-800/80 bg-slate-900/25 p-1 rounded-2xl">
        <button
          onClick={() => setActiveSubTab("chat")}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 ${
            activeSubTab === "chat"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
              : "text-slate-400 hover:text-white hover:bg-slate-800/30"
          }`}
        >
          <MessageSquare className="h-4.5 w-4.5" />
          <span>Fariimaha & Qolalka (Chat Rooms)</span>
        </button>
        <button
          onClick={() => setActiveSubTab("homework")}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 ${
            activeSubTab === "homework"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
              : "text-slate-400 hover:text-white hover:bg-slate-800/30"
          }`}
        >
          <HelpCircle className="h-4.5 w-4.5" />
          <span>Homework Board (Q&A)</span>
        </button>
        <button
          onClick={() => setActiveSubTab("leaderboard")}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 ${
            activeSubTab === "leaderboard"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
              : "text-slate-400 hover:text-white hover:bg-slate-800/30"
          }`}
        >
          <Trophy className="h-4.5 w-4.5" />
          <span>Dhibcaha & Kala-sarreynta (Rankings)</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 1: CHAT ROOMS & DM
          ───────────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[72vh] min-h-[500px]">
          {/* Rooms Sidebar */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-[#130b24] p-4 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-outfit text-sm font-extrabold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-400" />
                <span>Mawaadiicda Wada-hadalka</span>
              </h3>
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 transition"
                title="Create Group Chat"
              >
                <PlusCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Rooms List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {chatLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                </div>
              ) : rooms.length === 0 ? (
                <p className="text-[11px] text-slate-500 text-center py-8">Ma jiraan qolal firfircoon hadda.</p>
              ) : (
                rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setCurrentRoom(room)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition text-left border ${
                      currentRoom?.id === room.id
                        ? "bg-indigo-600/15 border-indigo-500 text-indigo-300"
                        : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{room.name}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5 font-bold">
                        {room.type === "class" ? "Fasalka" : room.type === "subject" ? "Maaddada" : "Wada-hadal gaar ah"}
                      </p>
                    </div>
                    {room.type === "class" && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/25">
                        G{room.grade_min}-{room.grade_max}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Active Chat Area */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-[#130b24] flex flex-col h-full overflow-hidden">
            {currentRoom ? (
              <>
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-slate-850 bg-slate-900/30 flex items-center justify-between shrink-0">
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{currentRoom.name}</h4>
                    <p className="text-[10px] text-slate-500 font-medium">SomPrep Student Community Channel</p>
                  </div>
                  <span className="text-[10px] bg-slate-800 px-3 py-1 rounded-full text-slate-400 font-bold uppercase tracking-wider">
                    {currentRoom.type}
                  </span>
                </div>

                {/* Message list */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex items-start gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                        {/* Avatar */}
                        <button
                          onClick={() => !isMe && openStudentProfile(msg.sender_id)}
                          className="h-8 w-8 rounded-lg bg-indigo-950 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase shrink-0"
                        >
                          {msg.sender_name.charAt(0)}
                        </button>

                        {/* Text bubble */}
                        <div className={`max-w-[70%] space-y-1 ${isMe ? "items-end" : ""}`}>
                          <div className={`flex items-center gap-1.5 text-[10px] font-bold text-slate-500 ${isMe ? "justify-end" : ""}`}>
                            <span className="text-slate-350">{msg.sender_name}</span>
                            {msg.sender_role !== "student" && (
                              <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px]">
                                {msg.sender_role}
                              </span>
                            )}
                            <span>•</span>
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? "bg-indigo-600 text-white rounded-tr-none"
                              : "bg-slate-900/80 text-slate-200 rounded-tl-none border border-slate-850"
                          }`}>
                            <p className="whitespace-pre-line">{msg.content}</p>
                            {msg.image_url && (
                              <div className="mt-2 rounded-lg overflow-hidden border border-white/10 max-h-48">
                                <ProtectedImage src={msg.image_url} alt="Attached screenshot" className="object-cover w-full h-full" />
                              </div>
                            )}
                          </div>

                          {/* Report & Block actions */}
                          {!isMe && (
                            <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-500">
                              <button
                                onClick={() => { setReportMessageId(msg.id); setShowReportModal(true); }}
                                className="hover:text-rose-400 flex items-center gap-0.5"
                              >
                                <Flag className="h-2.5 w-2.5" />
                                <span>Sheeg (Report)</span>
                              </button>
                              <span>|</span>
                              <button
                                onClick={() => handleBlockUser(msg.sender_id)}
                                className="hover:text-rose-400 flex items-center gap-0.5"
                              >
                                <Slash className="h-2.5 w-2.5" />
                                <span>Xannib (Block)</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input panel */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-850 bg-slate-900/20 shrink-0 space-y-2">
                  {/* File attach input */}
                  {chatImageInput && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-indigo-400">
                      <span className="truncate">Attached screenshot: {chatImageName || chatImageInput}</span>
                      <button type="button" onClick={() => { setChatImageInput(""); setChatImageName(""); }} className="text-slate-400 hover:text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <label
                      className={`p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 transition cursor-pointer ${chatImageUploading ? "opacity-60 pointer-events-none" : ""}`}
                      title="Attach screenshot"
                    >
                      {chatImageUploading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Image className="h-4.5 w-4.5" />}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleChatImageSelect}
                      />
                    </label>

                    <input
                      type="text"
                      value={newMessageText}
                      onChange={handleChatTextChange}
                      placeholder="Halkan ku qor farriintaada..."
                      className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />

                    <button
                      type="submit"
                      disabled={sendingMsg || profanityWarning || chatImageUploading}
                      className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition"
                    >
                      {sendingMsg ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Send className="h-4.5 w-4.5" />}
                    </button>
                  </div>

                  {profanityWarning && (
                    <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Fadlan iska ilaali ereyada xun anshax ahaan.</span>
                    </p>
                  )}
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
                <MessageSquare className="h-12 w-12 text-slate-700 mb-4 animate-pulse" />
                <h4 className="text-sm font-bold text-white">No Chat Selected</h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1">Fadlan ka dooro sidebar-ka mid ka mid ah qolalka wada-hadalka ama saaxiibadaa.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 2: HOMEWORK BOARD
          ───────────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === "homework" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[60vh]">
          {/* Left panel: List and filters */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#130b24] p-4 rounded-2xl border border-slate-800">
              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-350 focus:outline-none"
                >
                  <option value="">Dhammaan Maaddooyinka</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Somali">Somali</option>
                  <option value="Science">Science</option>
                  <option value="English">English</option>
                </select>

                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-350 focus:outline-none"
                >
                  <option value="">Dhammaan Fasallada</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowAddQuestionModal(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-lg shadow-indigo-600/10"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Qor Su'aal Cusub</span>
              </button>
            </div>

            {/* Questions Feed */}
            <div className="space-y-4">
              {questions.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-8 text-center">
                  <HelpCircle className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                  <h4 className="text-xs font-bold text-white">No Questions Found</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Lama helin su'aalo ku habboon shaandheyntaada.</p>
                </div>
              ) : (
                questions.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => { setSelectedQuestion(q); setAiCoachOutput(null); }}
                    className={`rounded-2xl border p-5 transition cursor-pointer text-left ${
                      selectedQuestion?.id === q.id
                        ? "bg-indigo-950/20 border-indigo-500/60 shadow-lg"
                        : "bg-[#130b24] border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/25"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-400">{q.subject}</span>
                        <span>•</span>
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-bold">Grade {q.grade_level}</span>
                      </div>
                      <span>{new Date(q.created_at).toLocaleDateString()}</span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-extrabold text-white leading-snug">{q.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">{q.description}</p>

                    <div className="border-t border-slate-850/60 mt-4 pt-3 flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span className="text-slate-350">By: {q.user_name}</span>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded ${q.is_solved ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                          {q.is_solved ? "Solved (Xallan)" : "Open (Furan)"}
                        </span>
                        <span>{q.replies?.length ?? 0} Replies</span>
                        {(user?.role === "admin" || user?.role === "teacher") && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleModerateDeleteQuestion(q); }}
                            className="px-2 py-0.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10"
                            title="Remove inappropriate question (moderation)"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right panel: Question details, Replies, and AI Coach */}
          <div className="lg:col-span-5">
            {selectedQuestion ? (
              <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-6 space-y-6 h-full overflow-y-auto max-h-[78vh]">
                {/* Question Info Header */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20">
                      {selectedQuestion.subject}
                    </span>
                    <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-800 px-2.5 py-1 rounded border border-slate-700/50">
                      Grade {selectedQuestion.grade_level}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-white leading-snug">{selectedQuestion.title}</h3>
                  
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>By: {selectedQuestion.user_name}</span>
                    <span>•</span>
                    <span>{new Date(selectedQuestion.created_at).toLocaleString()}</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/20 p-4 rounded-xl border border-slate-850">
                    {selectedQuestion.description}
                  </p>

                  {selectedQuestion.image_url && (
                    <div className="rounded-xl overflow-hidden border border-slate-800 relative group">
                      <ProtectedImage src={selectedQuestion.image_url} alt="Homework Screenshot" className="w-full object-cover max-h-56" />
                      <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/80 text-slate-300 backdrop-blur-md opacity-0 group-hover:opacity-100 transition">
                        <Maximize2 className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Coach Refik AI Options */}
                <div className="border-t border-slate-850 pt-5 space-y-4">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Shield className="h-4 w-4 text-indigo-400" />
                    <span>Ask AI Coach Refik (Cawinaada Refik)</span>
                  </h4>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleAskCoachRefik("hint")}
                      disabled={aiCoachLoading}
                      className="px-2.5 py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-xl text-[10px] font-bold border border-indigo-500/25 transition disabled:opacity-50"
                    >
                      💡 Tusmo (Hint)
                    </button>
                    <button
                      onClick={() => handleAskCoachRefik("solution")}
                      disabled={aiCoachLoading}
                      className="px-2.5 py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-xl text-[10px] font-bold border border-emerald-500/25 transition disabled:opacity-50"
                    >
                      🛠️ Xal (Solution)
                    </button>
                    <button
                      onClick={() => handleAskCoachRefik("similar")}
                      disabled={aiCoachLoading}
                      className="px-2.5 py-2.5 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 rounded-xl text-[10px] font-bold border border-amber-500/25 transition disabled:opacity-50"
                    >
                      📝 Su'aal Kale (Similar)
                    </button>
                  </div>

                  {aiCoachLoading && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    </div>
                  )}

                  {/* Render Cached AI Answers */}
                  {!aiCoachLoading && aiCoachOutput && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500 bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span>Coach Refik response: {aiCoachOutput.action}</span>
                        <button onClick={() => setAiCoachOutput(null)} className="hover:text-white">Close</button>
                      </div>
                      {renderAiFormattedMessage(aiCoachOutput.text)}
                    </div>
                  )}

                  {/* Fallback to show cached answers from db if no new request output is open */}
                  {!aiCoachLoading && !aiCoachOutput && (selectedQuestion.ai_hint || selectedQuestion.ai_solution) && (
                    <div className="space-y-3 bg-slate-900/30 p-4 rounded-xl border border-slate-850">
                      <span className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">Loaded AI History:</span>
                      {selectedQuestion.ai_hint && (
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-slate-400 block">💡 Cached Hint:</span>
                          {renderAiFormattedMessage(selectedQuestion.ai_hint)}
                        </div>
                      )}
                      {selectedQuestion.ai_solution && (
                        <div className="space-y-2 pt-2 border-t border-slate-850">
                          <span className="text-[9px] font-bold text-slate-400 block">🛠️ Cached Solution:</span>
                          {renderAiFormattedMessage(selectedQuestion.ai_solution)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Classmates Replies */}
                <div className="border-t border-slate-850 pt-5 space-y-4">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-indigo-400" />
                    <span>Jawaabaha Ardayda ({selectedQuestion.replies?.length ?? 0})</span>
                  </h4>

                  {/* Replies List */}
                  <div className="space-y-3">
                    {selectedQuestion.replies?.length === 0 ? (
                      <p className="text-[11px] text-slate-500 text-center py-3">Ma jiraan jawaabo arday wali. Noqo kii ugu horeeyay oo caawiya!</p>
                    ) : (
                      selectedQuestion.replies.map(r => (
                        <div key={r.id} className="p-3 bg-slate-900/60 border border-slate-850 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                            <span className="text-slate-350">{r.user_name}</span>
                            <span>{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{r.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Reply Input Form */}
                  <form onSubmit={handlePostReply} className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="U qor jawaab saaxiibkaa... (+15 XP)"
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={submittingReply || !replyText.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      {submittingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gudbi"}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-8 text-center flex flex-col items-center justify-center h-full min-h-[300px]">
                <HelpCircle className="h-10 w-10 text-slate-700 mb-3" />
                <h4 className="text-xs font-bold text-white">No Details Selected</h4>
                <p className="text-[11px] text-slate-500 max-w-xs mt-1">Fadlan guji mid ka mid ah su'aalaha bidixda ku yaala si aad u aragto xalka, jawaabaha, iyo wada-hadalka AI Coach.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 3: LEADERBOARD, MISSIONS, BADGES
          ───────────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === "leaderboard" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Weekly Rankings List */}
          <div className="md:col-span-2 rounded-2xl border border-slate-800 bg-[#130b24] p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-850 pb-4">
              <div>
                <h3 className="font-outfit text-sm font-extrabold text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-indigo-400" />
                  <span>Kala-sarreynta Isbuuclaha (Weekly Scoreboard)</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">Ardayda ugu dhibcaha badan dalka oo dhan.</p>
              </div>
            </div>

            {/* Ranking list */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {rankings.map((student, idx) => {
                const isCurUser = student.user_id === user?.id;
                const rankNum = idx + 1;
                return (
                  <div
                    key={student.user_id}
                    onClick={() => openStudentProfile(student.user_id)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
                      isCurUser
                        ? "bg-indigo-600/10 border-indigo-500/60"
                        : "bg-slate-900/60 border-slate-850 hover:bg-slate-850/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank Number Circle */}
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        rankNum === 1
                          ? "bg-amber-500 text-slate-950"
                          : rankNum === 2
                          ? "bg-slate-300 text-slate-950"
                          : rankNum === 3
                          ? "bg-amber-700 text-white"
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        {rankNum}
                      </div>

                      {/* Student Details */}
                      <div>
                        <p className="text-xs font-bold text-white">{student.full_name}</p>
                        <p className="text-[9px] text-slate-500">Grade {student.grade_level} Student • {student.package_type || "No package"}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs font-bold">
                      {student.current_streak > 0 && (
                        <div className="flex items-center gap-0.5 text-amber-500" title="Streak Days">
                          <Flame className="h-3.5 w-3.5" />
                          <span>{student.current_streak}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-0.5 text-indigo-400" title="XP Points">
                        <Zap className="h-3.5 w-3.5" />
                        <span>{student.total_xp_points.toLocaleString()} XP</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Missions & Personal Stats */}
          <div className="space-y-6">
            {/* Streak & XP Visual Widget */}
            <div className="rounded-2xl border border-indigo-950 bg-gradient-to-br from-[#1c0f38] to-[#120826] p-6 space-y-4 shadow-lg">
              <h4 className="font-outfit text-xs font-black uppercase text-indigo-400 tracking-wider">Kala-sarreyntaada gaarka ah</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-center">
                  <Flame className="h-6 w-6 text-amber-500 mx-auto mb-1 animate-pulse" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">My Streak</span>
                  <span className="text-sm font-extrabold text-white">{user?.current_streak ?? 0} Days</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-center">
                  <Zap className="h-6 w-6 text-indigo-400 mx-auto mb-1" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Total XP</span>
                  <span className="text-sm font-extrabold text-white">{(user?.total_xp_points ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Daily Missions Checklist */}
            <div className="rounded-2xl border border-slate-800 bg-[#130b24] p-5 space-y-4 shadow-md">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Award className="h-4.5 w-4.5 text-indigo-400" />
                  <span>Hawlaha Maalinlaha ah (Daily Missions)</span>
                </h4>
                <p className="text-[9px] text-slate-500 mt-0.5">Xal howlahakan maalin kasta si aad u hesho XP dheeraad ah.</p>
              </div>

              <div className="space-y-2.5">
                {missions.map(mission => (
                  <div key={mission.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-850/80 flex items-center justify-between">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <p className={`text-xs font-semibold truncate ${mission.is_completed ? "text-slate-500 line-through" : "text-slate-200"}`}>
                        {mission.title}
                      </p>
                      <p className="text-[9px] font-bold text-indigo-400">Reward: +{mission.points_reward} XP</p>
                    </div>
                    {mission.is_completed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded bg-slate-800 shrink-0">
                        {mission.current_count}/{mission.target_count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ─────────────────────────────────────────────────────────────────────────────
          MODALS SECTION
          ───────────────────────────────────────────────────────────────────────────── */}

      {/* CREATE GROUP MODAL */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowCreateGroupModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#130b24] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h3 className="text-sm font-bold text-white">Abuuri Qol wada-hadal gaar ah</h3>
              <button onClick={() => setShowCreateGroupModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Magaca Qolka (Room Name)</label>
                <input
                  type="text"
                  required={newGroupType === "group"}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={newGroupType === "direct" ? "DM name is created automatically" : "tusaale: Diyaarinta Imtixaanka Fiisigiska"}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nooca Wada-hadalka (Chat Type)</label>
                <select
                  value={newGroupType}
                  onChange={(e) => {
                    setNewGroupType(e.target.value);
                    setSelectedMembers((prev) => e.target.value === "direct" ? prev.slice(0, 1) : prev);
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="group">Group Chat (Qol Wadaad ah)</option>
                  <option value="direct">Direct Message (Farriin Gaar ah)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Raadi Xubnaha (Search name or phone)</label>
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="tusaale: Ayaan ama 61..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-white focus:outline-none"
                />
                {memberSearchLoading && (
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Searching...</span>
                  </div>
                )}
                {memberSearchResults.length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-850 bg-slate-950/50">
                    {memberSearchResults.map((candidate) => (
                      <button
                        type="button"
                        key={candidate.id}
                        onClick={() => addSelectedMember(candidate)}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-900"
                      >
                        <span className="font-bold text-white truncate">{candidate.full_name}</span>
                        <span className="text-[10px] text-slate-500 shrink-0">G{candidate.grade_level}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedMembers.map((member) => (
                      <span key={member.id} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[10px] font-bold text-indigo-300">
                        {member.full_name}
                        <button type="button" onClick={() => removeSelectedMember(member.id)} className="text-indigo-200 hover:text-white">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
              >
                Abuuri Qolka
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD QUESTION MODAL */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAddQuestionModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#130b24] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h3 className="text-sm font-bold text-white">Soo rar Su'aal Cusub (Ask Classmates)</h3>
              <button onClick={() => setShowAddQuestionModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Mawduuca / Ciwaanka (Question Title)</label>
                <input
                  type="text"
                  required
                  value={newQTitle}
                  onChange={(e) => setNewQTitle(e.target.value)}
                  placeholder="tusaale: Sidee loo xalliyaa sharciga 2aad Newton?"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Faahfaahinta Su'aasha (Description)</label>
                <textarea
                  required
                  rows={3}
                  value={newQDesc}
                  onChange={(e) => setNewQDesc(e.target.value)}
                  placeholder="Halkan ku faahfaahi meesha aad ka mari la'dahay..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-white focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Maaddada</label>
                  <select
                    value={newQSubject}
                    onChange={(e) => setNewQSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Somali">Somali</option>
                    <option value="Science">Science</option>
                    <option value="English">English</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Fasalka (Grade)</label>
                  <select
                    value={newQGrade}
                    onChange={(e) => setNewQGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-white focus:outline-none"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-850 bg-slate-900/60 p-3 text-xs">
                <label className={`flex cursor-pointer items-center justify-between gap-3 text-slate-350 ${questionImageUploading ? "opacity-60 pointer-events-none" : ""}`}>
                  <span className="flex items-center gap-2">
                    {questionImageUploading ? <Loader2 className="h-4 w-4 animate-spin text-indigo-400" /> : <Image className="h-4 w-4 text-indigo-400" />}
                    <span>{newQImageName || "Upload screenshot (PNG/JPG)"}</span>
                  </span>
                  <span className="text-[10px] font-bold text-indigo-300">Choose</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleQuestionImageSelect}
                  />
                </label>
                {newQImageUrl && (
                  <div className="flex items-center justify-between rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[10px] text-indigo-300">
                    <span className="truncate">{newQImageName}</span>
                    <button type="button" onClick={() => { setNewQImageUrl(""); setNewQImageName(""); }} className="text-slate-400 hover:text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submittingQuestion || questionImageUploading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition disabled:opacity-50"
              >
                {submittingQuestion ? <Loader2 className="h-4.5 w-4.5 animate-spin mx-auto" /> : "Gudbi Su'aasha (+10 XP)"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REPORT MESSAGE MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowReportModal(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-[#130b24] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h3 className="text-sm font-bold text-white">Sheeg Farriinta (Report Message)</h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReportMessageSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Sababta sheegashada (Reason)</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-850 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="Abaabulo colaad ama anshax xumo">Abaabulo colaad ama anshax xumo (Abuse/Harassment)</option>
                  <option value="Aflegaado iyo cay">Aflegaado iyo cay (Profanity/Swearing)</option>
                  <option value="Faafinta xayaysiis aan la ogolayn">Faafinta xayaysiis aan la ogolayn (Spam)</option>
                  <option value="Qish ama khayaano imtixaan">Qish ama khayaano imtixaan (Cheating)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition"
              >
                Gudbi Dacwada
              </button>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT PROFILE STATS MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowProfileModal(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-800 bg-[#130b24] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3">
              <h3 className="text-sm font-bold text-white">Student Info Panel</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {profileLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : profileData ? (
              <div className="space-y-4 text-center">
                {/* Avatar */}
                <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/35 flex items-center justify-center text-indigo-400 font-extrabold text-2xl uppercase mx-auto">
                  {profileData.full_name.charAt(0)}
                </div>

                <div>
                  <h4 className="text-sm font-black text-white">{profileData.full_name}</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Grade {profileData.grade_level} Student • {profileData.package_type || "No package"}
                  </p>
                </div>

                {/* Score panel */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-850">
                    <Flame className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                    <span className="text-[9px] font-bold text-slate-500 block">Streak</span>
                    <span className="text-xs font-bold text-white">{profileData.current_streak} Days</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-850">
                    <Zap className="h-5 w-5 text-indigo-400 mx-auto mb-1" />
                    <span className="text-[9px] font-bold text-slate-500 block">Total XP</span>
                    <span className="text-xs font-bold text-white">{profileData.total_xp_points} XP</span>
                  </div>
                </div>

                {/* Lessons & Quizzes */}
                <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-400">
                  <div className="p-2 bg-slate-900/40 rounded-lg">
                    📖 Watched: {profileData.completed_lessons_count} lessons
                  </div>
                  <div className="p-2 bg-slate-900/40 rounded-lg">
                    ✏️ Solved: {profileData.solved_quizzes_count} quizzes
                  </div>
                </div>

                {/* Badges Earned */}
                <div className="space-y-2 text-left pt-2 border-t border-slate-850">
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Dhaq-dhaqaaqa Badges ({profileData.badges?.length ?? 0}):</span>
                  {profileData.badges?.length === 0 ? (
                    <p className="text-[9px] text-slate-500">Wax badge ah wali uma abaal-marin.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {profileData.badges.map(b => (
                        <span key={b.id} className="text-[9px] font-bold px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" title={b.description}>
                          {b.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Block option */}
                {profileData.user_id !== user?.id && (
                  <button
                    onClick={() => handleBlockUser(profileData.user_id)}
                    className="w-full py-2 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-400 rounded-xl text-[10px] font-bold transition mt-4"
                  >
                    Xannib Ardayga (Block Student)
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">Failed to load info.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
