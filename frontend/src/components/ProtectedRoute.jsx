import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (loading) {
        return (
            <div className="scout-frame flex items-center justify-center min-h-screen">
                <div className="text-zinc-500 font-mono-tech text-xs tracking-widest">CARREGANDO...</div>
            </div>
        );
    }
    if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
    return children;
}
