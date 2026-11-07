import api from "./api";

export const authApi = {
  login: (payload) => api.post("/api/auth/login", payload),
  adminLogin: (payload) => api.post("/api/auth/admin/login", payload),
  adminPasswordResetRequest: (payload) => api.post("/api/auth/admin/password-reset/request", payload),
  adminPasswordResetVerify: (payload) => api.post("/api/auth/admin/password-reset/verify", payload),
  adminPasswordResetConfirm: (payload) => api.post("/api/auth/admin/password-reset/confirm", payload),
  me: () => api.get("/api/auth/me"),
  register: (payload) => api.post("/api/auth/register", payload),
  updateProfile: (payload) => api.put("/api/auth/profile", payload),
  myPackage: () => api.get("/api/auth/my-package"),
  selectPackage: (payload) => api.post("/api/auth/select-package", payload),
};

export const examsApi = {
  categories: () => api.get("/api/exams/categories"),
  subtopics: () => api.get("/api/exams/subtopics"),
  roadmap: () => api.get("/api/exams/roadmap"),
  attempts: () => api.get("/api/exams/attempts"),
  attempt: (attemptId) => api.get(`/api/exams/attempt/${attemptId}`),
  review: (attemptId) => api.get(`/api/exams/review/${attemptId}`),
  readiness: () => api.get("/api/exams/readiness"),
  wrongAnswers: () => api.get("/api/exams/wrong-answers"),
  questions: () => api.get("/api/exams/questions"),
  createQuestion: (payload) => api.post("/api/exams/questions", payload),
  deleteQuestion: (questionId) => api.delete(`/api/exams/questions/${questionId}`),
  mockExams: () => api.get("/api/exams/mock-exams"),
  startMockExam: (mockExamId) => api.get(`/api/exams/mock-exams/${mockExamId}/start`),
  submitMockExam: (mockExamId, payload) => api.post(`/api/exams/mock-exams/${mockExamId}/submit`, payload),
  startWeaknessExam: () => api.get("/api/exams/start/weakness"),
  startCategoryExam: (categoryId) => api.get(`/api/exams/start/${categoryId}`),
  startSubtopicExam: (subtopicId) => api.get(`/api/exams/start/subtopic/${subtopicId}`),
  submit: (payload) => api.post("/api/exams/submit", payload),
  diagnostic: (attemptId) => api.get(`/api/exams/diagnostic/${attemptId}`),
};

export const reviewerApi = {
  pending: () => api.get("/api/reviewer/pending"),
  reviewQuestion: (questionId, payload) => api.post(`/api/reviewer/questions/${questionId}/review`, payload),
  aiAssist: (questionId) => api.post(`/api/reviewer/questions/${questionId}/ai-assist`),
};

export const videosApi = {
  bySubtopic: (subtopicId) => api.get(`/api/videos/${subtopicId}`),
  watch: (payload) => api.post("/api/videos/watch", payload),
};

export const paymentsApi = {
  status: () => api.get("/api/payments/status"),
  redeemVoucher: (payload) => api.post("/api/payments/voucher-redeem", payload),
};

export const aiCoachApi = {
  brief: () => api.get("/api/ai_coach/brief"),
  analyze: () => api.post("/api/ai_coach/analyze"),
};

export const techApi = {
  tracks: () => api.get("/api/tech/tracks"),
  trackDetail: (slug) => api.get(`/api/tech/tracks/${slug}`),
  enroll: (trackId) => api.post(`/api/tech/enroll/${trackId}`),
  myProgress: () => api.get("/api/tech/my-progress"),
  completeLesson: (lessonId) => api.post(`/api/tech/lesson/${lessonId}/complete`),
  submitQuiz: (lessonId, payload) => api.post(`/api/tech/quiz/${lessonId}`, payload),
};

export const packagesApi = {
  list: () => api.get("/api/packages"),
  adminList: () => api.get("/api/packages/admin"),
  create: (payload) => api.post("/api/packages/admin", payload),
  update: (id, payload) => api.patch(`/api/packages/admin/${id}`, payload),
  remove: (id, { hard = false } = {}) =>
    api.delete(`/api/packages/admin/${id}`, { params: { hard } }),
};

export const adminApi = {
  createTeacher: (payload) => api.post("/api/admin/create-teacher", payload),
  teachers: () => api.get("/api/admin/teachers"),
  toggleTeacher: (teacherId) => api.patch(`/api/admin/teachers/${teacherId}/toggle`),
};

export const teacherApi = {
  updateProfile: (payload) => api.patch("/api/teacher/profile", payload),
  videos: () => api.get("/api/teacher/videos"),
  createVideo: (payload) => api.post("/api/teacher/videos", payload),
  updateVideo: (id, payload) => api.patch(`/api/teacher/videos/${id}`, payload),
  deleteVideo: (id) => api.delete(`/api/teacher/videos/${id}`),
  publishVideo: (id) => api.patch(`/api/teacher/videos/${id}/publish`),
  exams: () => api.get("/api/teacher/exams"),
  createExam: (payload) => api.post("/api/teacher/exams", payload),
  exam: (id) => api.get(`/api/teacher/exams/${id}`),
  updateExam: (id, payload) => api.patch(`/api/teacher/exams/${id}`, payload),
  deleteExam: (id) => api.delete(`/api/teacher/exams/${id}`),
  toggleOpenExam: (id) => api.patch(`/api/teacher/exams/${id}/toggle-open`),
  toggleReviewExam: (id) => api.patch(`/api/teacher/exams/${id}/toggle-review`),
  examResults: (id) => api.get(`/api/teacher/exams/${id}/results`),
  uploadExamMaterial: (id, formData) => api.post(`/api/teacher/exams/${id}/materials`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  deleteExamMaterial: (examId, materialId) => api.delete(`/api/teacher/exams/${examId}/materials/${materialId}`),
};

export const lmsApi = {
  // Teacher: course builder
  myCourses: () => api.get("/api/teacher/courses"),
  createCourse: (payload) => api.post("/api/teacher/courses", payload),
  updateCourse: (id, payload) => api.patch(`/api/teacher/courses/${id}`, payload),
  deleteCourse: (id) => api.delete(`/api/teacher/courses/${id}`),
  addChapter: (courseId, payload) => api.post(`/api/teacher/courses/${courseId}/chapters`, payload),
  updateChapter: (id, payload) => api.patch(`/api/teacher/chapters/${id}`, payload),
  deleteChapter: (id) => api.delete(`/api/teacher/chapters/${id}`),
  addLesson: (chapterId, payload) => api.post(`/api/teacher/chapters/${chapterId}/lessons`, payload),
  updateLesson: (id, payload) => api.patch(`/api/teacher/lessons/${id}`, payload),
  deleteLesson: (id) => api.delete(`/api/teacher/lessons/${id}`),
  uploadLessonFile: (id, formData) => api.post(`/api/teacher/lessons/${id}/file`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  // Teacher: insight
  analytics: () => api.get("/api/teacher/analytics"),
  students: () => api.get("/api/teacher/students"),
  // Student: published courses for my grade
  studentCourses: () => api.get("/api/student/courses"),
};

export const studentTeacherExamsApi = {
  exams: () => api.get("/api/exams/teacher-exams"),
  examDetail: (id) => api.get(`/api/exams/teacher-exams/${id}`),
  myAttempts: () => api.get("/api/exams/teacher-exams/attempts"),
  attempt: (id) => api.get(`/api/exams/teacher-exams/attempts/${id}`),
  startExam: (id) => api.post(`/api/exams/teacher-exams/${id}/start`),
  submitExam: (id, payload) => api.post(`/api/exams/teacher-exams/${id}/submit`, payload),
};

export const communityApi = {
  rooms: () => api.get("/api/community/rooms"),
  createRoom: (payload) => api.post("/api/community/rooms", payload),
  messages: (roomId) => api.get(`/api/community/rooms/${roomId}/messages`),
  sendMessage: (roomId, payload) => api.post(`/api/community/rooms/${roomId}/messages`, payload),
  uploadMedia: (formData) => api.post("/api/community/media/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  mediaBlob: (mediaUrl) => api.get(mediaUrl, { responseType: "blob" }),
  searchUsers: (query) => api.get(`/api/community/users/search?q=${encodeURIComponent(query)}`),
  directMessages: (userId) => api.get(`/api/community/direct-messages/${userId}`),
  sendDirectMessage: (payload) => api.post("/api/community/direct-messages", payload),
  reportMessage: (messageId, reason) => api.post(`/api/community/messages/${messageId}/report?reason=${encodeURIComponent(reason)}`),
  blockUser: (userId) => api.post(`/api/community/users/${userId}/block`),
  unblockUser: (userId) => api.post(`/api/community/users/${userId}/unblock`),
  questions: (subject, gradeLevel) => {
    let url = "/api/community/questions";
    const params = [];
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (gradeLevel) params.push(`grade_level=${gradeLevel}`);
    if (params.length > 0) url += "?" + params.join("&");
    return api.get(url);
  },
  createQuestion: (payload) => api.post("/api/community/questions", payload),
  replyToQuestion: (questionId, payload) => api.post(`/api/community/questions/${questionId}/reply`, payload),
  askAi: (questionId, payload) => api.post(`/api/community/questions/${questionId}/ask-ai`, payload),
  leaderboard: () => api.get("/api/community/leaderboard"),
  missions: () => api.get("/api/community/missions"),
  profile: (userId) => api.get(`/api/community/profile/${userId}`),
};

export const moderationApi = {
  reports: () => api.get("/api/admin/moderation/reports"),
  resolveReport: (reportId, payload) => api.post(`/api/admin/moderation/reports/${reportId}/resolve`, payload),
  deleteQuestion: (questionId) => api.delete(`/api/admin/moderation/questions/${questionId}`),
  deleteReply: (replyId) => api.delete(`/api/admin/moderation/replies/${replyId}`),
  blockedWords: () => api.get("/api/admin/moderation/blocked-words"),
  createBlockedWord: (payload) => api.post("/api/admin/moderation/blocked-words", payload),
  toggleBlockedWord: (wordId) => api.patch(`/api/admin/moderation/blocked-words/${wordId}/toggle`),
  deleteBlockedWord: (wordId) => api.delete(`/api/admin/moderation/blocked-words/${wordId}`),
};
