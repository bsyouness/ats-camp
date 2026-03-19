import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/auth';

// Public pages
import {
  HomePage,
  LoginPage,
  RegisterPage,
  AboutPage,
  InfoPage as ResourcesPage,
  ContactPage,
  WhatsAppRequestPage,
  ReportIssuePage,
} from './pages/public';

// User pages
import {
  DashboardPage,
  MyProfilePage,
  MembersPage,
  MemberProfilePage,
  CampMapPage,
  ShiftsPage,
  MediaPage,
} from './pages/user';

// Admin pages
import {
  UserManagementPage,
  MapManagementPage,
  ShiftManagementPage,
  MediaManagementPage,
  ContactsPage,
  SiteConfigPage,
} from './pages/admin';

function HomeRedirect() {
  const { firebaseUser } = useAuth();
  if (firebaseUser) return <Navigate to="/dashboard" replace />;
  return <HomePage />;
}

function SmartShifts() {
  const { isAdmin } = useAuth();
  return isAdmin ? <ShiftManagementPage /> : <ShiftsPage />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/join-whatsapp" element={<WhatsAppRequestPage />} />
            <Route path="/report" element={<ReportIssuePage />} />

            {/* Protected User Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <MyProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/members"
              element={
                <ProtectedRoute>
                  <MembersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/members/:uid"
              element={
                <ProtectedRoute>
                  <MemberProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/map"
              element={
                <ProtectedRoute>
                  <CampMapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shifts"
              element={
                <ProtectedRoute>
                  <SmartShifts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/media"
              element={
                <ProtectedRoute>
                  <MediaPage />
                </ProtectedRoute>
              }
            />
            {/* Admin Routes */}
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/map"
              element={
                <ProtectedRoute requireAdmin>
                  <MapManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shifts"
              element={
                <ProtectedRoute requireAdmin>
                  <ShiftManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/media"
              element={
                <ProtectedRoute requireAdmin>
                  <MediaManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/contacts"
              element={
                <ProtectedRoute requireAdmin>
                  <ContactsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/config"
              element={
                <ProtectedRoute requireAdmin>
                  <SiteConfigPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
