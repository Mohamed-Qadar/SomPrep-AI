import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { GuestRoute, ProtectedRoute, RoleRoute, TeacherRoute } from "./components/RouteGuards";
import LoadingState from "./components/LoadingState";
import { AuthProvider } from "./context/AuthContext";

// ── Lazy-loaded pages (route-level code splitting) ──────────────────────────
// Public / marketing
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminForgotPassword = lazy(() => import("./pages/AdminForgotPassword"));
const Register = lazy(() => import("./pages/Register"));
const Packages = lazy(() => import("./pages/Packages"));
const SampleVideos = lazy(() => import("./pages/SampleVideos"));
const Features = lazy(() => import("./pages/Features"));
const ExamPrep = lazy(() => import("./pages/ExamPrep"));
const AiDiagnostics = lazy(() => import("./pages/AiDiagnostics"));
const Schools = lazy(() => import("./pages/Schools"));
const SocialImpact = lazy(() => import("./pages/SocialImpact"));
const About = lazy(() => import("./pages/About"));
const AcademicQuality = lazy(() => import("./pages/AcademicQuality"));
const Team = lazy(() => import("./pages/Team"));
const Contact = lazy(() => import("./pages/Contact"));
const TechnologySkills = lazy(() => import("./pages/TechnologySkills"));
const OfficeSkills = lazy(() => import("./pages/OfficeSkills"));
const TechTrackDetail = lazy(() => import("./pages/TechTrackDetail"));
const ProfessionalTech = lazy(() => import("./pages/ProfessionalTech"));
const ProgrammingSkills = lazy(() => import("./pages/ProgrammingSkills"));
const DataAnalysisSkills = lazy(() => import("./pages/DataAnalysisSkills"));
const MachineLearningSkills = lazy(() => import("./pages/MachineLearningSkills"));
const TechnologyPackages = lazy(() => import("./pages/TechnologyPackages"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PaywallPage = lazy(() => import("./pages/PaywallPage"));

// Student
const StudentLayout = lazy(() => import("./layouts/StudentLayout"));
const StudentHome = lazy(() => import("./pages/student/StudentHome"));
const StudentCourses = lazy(() => import("./pages/student/StudentCourses"));
const StudentProfile = lazy(() => import("./pages/student/StudentProfile"));
const StudentRoadmap = lazy(() => import("./pages/student/StudentRoadmap"));
const StudentAiCoach = lazy(() => import("./pages/student/StudentAiCoach"));
const StudentTeacherExams = lazy(() => import("./pages/student/StudentTeacherExams"));
const Community = lazy(() => import("./pages/student/Community"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ExamSession = lazy(() => import("./pages/ExamSession"));
const Results = lazy(() => import("./pages/Results"));
const Shop = lazy(() => import("./pages/Shop"));
const VideoPlayer = lazy(() => import("./pages/VideoPlayer"));
const MockExamCenter = lazy(() => import("./pages/MockExamCenter"));
const DiagnosticReport = lazy(() => import("./pages/DiagnosticReport"));
const WrongAnswers = lazy(() => import("./pages/WrongAnswers"));

// Admin (split from student bundle)
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ReviewerDashboard = lazy(() => import("./pages/ReviewerDashboard"));
const ModerationConsole = lazy(() => import("./pages/admin/ModerationConsole"));
const PaymentAccounts = lazy(() => import("./pages/admin/PaymentAccounts"));
const PaymentReview = lazy(() => import("./pages/admin/PaymentReview"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const WebhookEvents = lazy(() => import("./pages/admin/WebhookEvents"));
const SystemHealth = lazy(() => import("./pages/admin/SystemHealth"));

// Teacher Portal
const TeacherLayout = lazy(() => import("./pages/teacher/TeacherLayout"));
const TeacherDashboard = lazy(() => import("./pages/teacher/TeacherDashboard"));
const TeacherCourses = lazy(() => import("./pages/teacher/TeacherCourses"));
const TeacherStudents = lazy(() => import("./pages/teacher/TeacherStudents"));
const StudentCoursesLms = lazy(() => import("./pages/student/StudentCoursesLms"));
const TeacherVideos = lazy(() => import("./pages/teacher/TeacherVideos"));
const AddVideo = lazy(() => import("./pages/teacher/AddVideo"));
const TeacherExams = lazy(() => import("./pages/teacher/TeacherExams"));
const CreateExam = lazy(() => import("./pages/teacher/CreateExam"));
const ExamResults = lazy(() => import("./pages/teacher/ExamResults"));
const TeacherProfile = lazy(() => import("./pages/teacher/TeacherProfile"));

function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <AuthProvider>
      <Suspense fallback={<LoadingState label="" />}>
        <Routes>
        {/* Public Landing Page and Marketing Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/packages" element={<Packages />} />
        <Route path="/sample-videos" element={<SampleVideos />} />
        <Route path="/features" element={<Features />} />
        <Route path="/exam-prep" element={<ExamPrep />} />
        <Route path="/ai-diagnostics" element={<AiDiagnostics />} />
        <Route path="/schools" element={<Schools />} />
        <Route path="/social-impact" element={<SocialImpact />} />
        <Route path="/about" element={<About />} />
        <Route path="/academic-quality" element={<AcademicQuality />} />
        <Route path="/team" element={<Team />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/technology-skills" element={<TechnologySkills />} />
        <Route path="/technology-skills/office" element={<OfficeSkills />} />
        <Route path="/technology-skills/professional" element={<ProfessionalTech />} />
        <Route path="/technology-skills/programming" element={<ProgrammingSkills />} />
        <Route path="/technology-skills/data-analysis" element={<DataAnalysisSkills />} />
        <Route path="/technology-skills/machine-learning" element={<MachineLearningSkills />} />
        <Route path="/packages/technology" element={<TechnologyPackages />} />
        <Route
          path="/checkout/:packageId"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/paywall"
          element={
            <ProtectedRoute>
              <PaywallPage />
            </ProtectedRoute>
          }
        />

        {/* Guest Authentication Routes */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/loginasadmin"
          element={
            <GuestRoute>
              <AdminLogin />
            </GuestRoute>
          }
        />
        <Route
          path="/admin/forgot-password"
          element={
            <GuestRoute>
              <AdminForgotPassword />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />

        {/* Protected Student Routes with Shell Layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentHome />} />
          <Route path="courses/:grade" element={<StudentCourses />} />
          <Route path="my-courses" element={<StudentCoursesLms />} />
          <Route path="tech" element={<TechnologySkills />} />
          <Route path="tech/:slug" element={<TechTrackDetail />} />
          <Route path="exams" element={<MockExamCenter />} />
          <Route path="teacher-exams" element={<StudentTeacherExams />} />
          <Route path="wrong-answers" element={<WrongAnswers />} />
          <Route path="roadmap" element={<StudentRoadmap />} />
          <Route path="ai-coach" element={<StudentAiCoach />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="community" element={<Community />} />
        </Route>

        {/* Redirects for legacy flat routes */}
        <Route path="/mock-center" element={<Navigate to="/dashboard/exams" replace />} />
        <Route path="/wrong-answers" element={<Navigate to="/dashboard/wrong-answers" replace />} />

        <Route
          path="/shop"
          element={
            <ProtectedRoute>
              <Shop />
            </ProtectedRoute>
          }
        />
        <Route
          path="/video/:subtopicId"
          element={
            <ProtectedRoute>
              <VideoPlayer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam/:categoryId"
          element={
            <ProtectedRoute>
              <ExamSession />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results/:attemptId"
          element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam/mock/:mockExamId"
          element={
            <ProtectedRoute>
              <ExamSession />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam/teacher/:teacherExamId"
          element={
            <ProtectedRoute>
              <ExamSession />
            </ProtectedRoute>
          }
        />
        <Route
          path="/diagnostic/:attemptId"
          element={
            <ProtectedRoute>
              <DiagnosticReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer"
          element={
            <RoleRoute allowedRoles={["admin", "teacher", "reviewer"]}>
              <ReviewerDashboard />
            </RoleRoute>
          }
        />

        {/* Admin Routes — all nested inside the AdminLayout shell */}
        <Route
          path="/admin"
          element={
            <RoleRoute allowedRoles={["admin", "teacher"]}>
              <AdminLayout />
            </RoleRoute>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="manage" element={<AdminDashboard />} />
          <Route path="moderation" element={<ModerationConsole />} />
          <Route path="payment-review" element={<PaymentReview />} />
          <Route
            path="payment-accounts"
            element={
              <RoleRoute allowedRoles={["admin"]}>
                <PaymentAccounts />
              </RoleRoute>
            }
          />
          <Route
            path="audit-logs"
            element={
              <RoleRoute allowedRoles={["admin"]}>
                <AuditLogs />
              </RoleRoute>
            }
          />
          <Route
            path="webhook-events"
            element={
              <RoleRoute allowedRoles={["admin"]}>
                <WebhookEvents />
              </RoleRoute>
            }
          />
          <Route
            path="system-health"
            element={
              <RoleRoute allowedRoles={["admin"]}>
                <SystemHealth />
              </RoleRoute>
            }
          />
        </Route>

        {/* Teacher Portal Routes */}
        <Route
          path="/teacher"
          element={
            <TeacherRoute>
              <TeacherLayout />
            </TeacherRoute>
          }
        >
          <Route index element={<TeacherDashboard />} />
          <Route path="courses" element={<TeacherCourses />} />
          <Route path="students" element={<TeacherStudents />} />
          <Route path="videos" element={<TeacherVideos />} />
          <Route path="videos/add" element={<AddVideo />} />
          <Route path="exams" element={<TeacherExams />} />
          <Route path="exams/create" element={<CreateExam />} />
          <Route path="exams/:examId/results" element={<ExamResults />} />
          <Route path="profile" element={<TeacherProfile />} />
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
