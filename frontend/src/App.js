import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/lib/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Frame from "@/components/Frame";

import Splash from "@/screens/Splash";
import Login from "@/screens/Login";
import Register from "@/screens/Register";
import AuthCallback from "@/screens/AuthCallback";
import Dashboard from "@/screens/Dashboard";
import MapScreen from "@/screens/MapScreen";
import CalendarScreen from "@/screens/CalendarScreen";
import EventDetail from "@/screens/EventDetail";
import Profile from "@/screens/Profile";
import Settings from "@/screens/Settings";
import ScoutBlack from "@/screens/ScoutBlack";
import Checkout from "@/screens/Checkout";
import Partnerships from "@/screens/Partnerships";
import PartnershipDetail from "@/screens/PartnershipDetail";
import SubmitEvent from "@/screens/SubmitEvent";
import Rewards from "@/screens/Rewards";
import Admin from "@/screens/Admin";

function AppRouter() {
    const location = useLocation();
    if (location.hash?.includes("session_id=")) return <AuthCallback />;

    return (
        <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Admin (protected, role=admin enforced inside) */}
            <Route path="/admin/*" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

            {/* Member app */}
            <Route element={<ProtectedRoute><Frame /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/map" element={<MapScreen />} />
                <Route path="/calendar" element={<CalendarScreen />} />
                <Route path="/events/:id" element={<EventDetail />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings/*" element={<Settings />} />
                <Route path="/scout-black" element={<ScoutBlack />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/partnerships" element={<Partnerships />} />
                <Route path="/partnerships/:id" element={<PartnershipDetail />} />
                <Route path="/submit-event" element={<SubmitEvent />} />
                <Route path="/rewards" element={<Rewards />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <AuthProvider>
                    <AppRouter />
                </AuthProvider>
            </BrowserRouter>
        </div>
    );
}

export default App;
