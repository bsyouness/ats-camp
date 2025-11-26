import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/auth';

// Public pages
import {
  HomePage,
  LoginPage,
  RegisterPage,
  AboutPage,
  InfoPage,
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
  ResourcesPage,
} from './pages/user';

// Admin pages
import {
  AdminDashboardPage,
  UserManagementPage,
  MapManagementPage,
  ShiftManagementPage,
  MediaManagementPage,
  ContactsPage,
  SiteConfigPage,
} from './pages/admin';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/info" element={<InfoPage />} />
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
                  <ShiftsPage />
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
            <Route
              path="/resources"
              element={
                <ProtectedRoute>
                  <ResourcesPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
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
