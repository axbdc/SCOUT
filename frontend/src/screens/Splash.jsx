import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { Bolt } from "../components/Icons";

export default function Splash() {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (loading) return;
        const t = setTimeout(() => {
            if (!user) navigate("/login", { replace: true });
            else navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
        }, 2200);
        return () => clearTimeout(t);
    }, [user, loading, navigate]);

    return (
        <div
            className="scout-frame relative overflow-hidden flex flex-col items-center justify-center min-h-screen text-center px-8"
            data-testid="splash-screen"
        >
            <div
                className="absolute inset-0 opacity-40"
                style={{
                    backgroundImage:
                        "url(https://images.pexels.com/photos/596815/pexels-photo-596815.jpeg)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "brightness(0.4) contrast(1.2)",
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black" />
            <div className="absolute top-10 left-0 right-0 text-center">
                <div className="text-[10px] tracking-[0.4em] text-zinc-500 font-mono-tech reveal">EST. 2024</div>
            </div>
            <div className="relative z-10 reveal reveal-1">
                <div className="text-[11px] tracking-[0.45em] text-red-500 font-mono-tech mb-4">
                    AUTOMOTIVE INTELLIGENCE
                </div>
                <h1 className="font-display font-black text-6xl text-white tracking-tighter leading-none">
                    SCOUT
                </h1>
                <div className="mt-6 flex items-center justify-center gap-2 text-zinc-400 font-display text-[13px] tracking-tight">
                    <span>Encontra.</span>
                    <span className="text-red-500">Fotografa.</span>
                    <span>Acelera.</span>
                </div>
            </div>
            <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-2 text-zinc-600 reveal reveal-3">
                <Bolt size={14} />
                <span className="text-[10px] tracking-[0.3em] font-mono-tech">GRAND TOURER PROTOCOL</span>
            </div>
        </div>
    );
}
