import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function AuthCallback() {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const processed = useRef(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (processed.current) return;
        processed.current = true;
        const hash = window.location.hash || "";
        const m = hash.match(/session_id=([^&]+)/);
        if (!m) {
            navigate("/login", { replace: true });
            return;
        }
        const session_id = m[1];
        (async () => {
            try {
                const { data } = await api.post(
                    "/auth/google/session",
                    {},
                    { headers: { "X-Session-ID": session_id } }
                );
                setUser(data);
                window.history.replaceState({}, "", "/dashboard");
                navigate("/dashboard", { replace: true, state: { user: data } });
            } catch (e) {
                setError("Falha na autenticação Google. Tenta novamente.");
                setTimeout(() => navigate("/login", { replace: true }), 2000);
            }
        })();
    }, [navigate, setUser]);

    return (
        <div className="scout-frame flex items-center justify-center min-h-screen text-center px-8" data-testid="auth-callback">
            <div>
                <div className="font-display font-black text-3xl text-white">SCOUT</div>
                <div className="mt-3 text-zinc-500 text-xs tracking-[0.3em] uppercase font-mono-tech">
                    {error || "A autenticar..."}
                </div>
            </div>
        </div>
    );
}
