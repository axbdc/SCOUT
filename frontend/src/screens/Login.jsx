import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { formatApiErrorDetail } from "../lib/api";
import { Eye, EyeOff, Mail, Lock, Bolt, Apple, Google, Verified, Speed } from "../components/Icons";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const u = await login(email.trim(), password);
            navigate(u?.role === "admin" ? "/admin" : "/dashboard", { replace: true });
        } catch (err) {
            setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
        } finally {
            setLoading(false);
        }
    };

    const googleSignIn = () => {
        // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
        const redirectUrl = window.location.origin + "/dashboard";
        window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    };

    return (
        <div className="scout-frame min-h-screen relative overflow-hidden" data-testid="login-screen">
            <div
                className="absolute inset-0 opacity-30"
                style={{
                    backgroundImage:
                        "url(https://images.pexels.com/photos/596815/pexels-photo-596815.jpeg)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "brightness(0.3) contrast(1.3)",
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/80 to-black" />

            <div className="relative px-6 pt-12 pb-8">
                <div className="text-[10px] tracking-[0.4em] text-zinc-500 font-mono-tech mb-2 reveal">
                    GRAND TOURER · LOGIN
                </div>
                <h1 className="font-display font-black text-5xl text-white tracking-tighter leading-none reveal reveal-1">
                    SCOUT
                </h1>
                <p className="text-zinc-400 mt-3 text-sm reveal reveal-2">
                    The Inner Circle of <span className="text-red-500">Automotive Excellence</span>
                </p>
            </div>

            <form onSubmit={submit} className="relative px-6 space-y-4">
                <div className="reveal reveal-2">
                    <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-2">
                        Identificação
                    </label>
                    <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            data-testid="login-email-input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            placeholder="exemplo@scout.pt"
                            className="w-full bg-[#0F0F11] border border-white/10 rounded-md h-12 pl-11 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 transition"
                        />
                    </div>
                </div>

                <div className="reveal reveal-3">
                    <div className="flex justify-between items-end mb-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">
                            Credenciais
                        </label>
                        <Link to="/forgot" className="text-[10px] uppercase tracking-[0.15em] text-red-500 font-bold hover:text-red-400">
                            Recuperar?
                        </Link>
                    </div>
                    <div className="relative">
                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            data-testid="login-password-input"
                            type={show ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                            placeholder="••••••••"
                            className="w-full bg-[#0F0F11] border border-white/10 rounded-md h-12 pl-11 pr-12 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 transition"
                        />
                        <button
                            type="button"
                            onClick={() => setShow(!show)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                            data-testid="toggle-password-visibility"
                        >
                            {show ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded" data-testid="login-error">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    data-testid="login-submit"
                    className="w-full h-12 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-display font-bold tracking-widest uppercase text-sm rounded-md flex items-center justify-center gap-2 transition shadow-[0_0_30px_rgba(229,57,53,0.35)] reveal reveal-4 disabled:opacity-60"
                >
                    <Speed size={16} />
                    {loading ? "A entrar..." : "Access Command Center"}
                </button>

                <div className="relative my-6 flex items-center reveal reveal-4">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="px-3 text-[10px] tracking-[0.3em] uppercase text-zinc-600 font-mono-tech">
                        Third Party Entry
                    </span>
                    <div className="flex-1 h-px bg-white/5" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        disabled
                        className="h-12 rounded-md bg-white/5 border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
                        data-testid="login-apple"
                        title="Em breve"
                    >
                        <Apple size={18} />
                        Apple
                    </button>
                    <button
                        type="button"
                        onClick={googleSignIn}
                        className="h-12 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
                        data-testid="login-google"
                    >
                        <Google size={18} />
                        Google
                    </button>
                </div>

                <div className="flex items-center justify-center gap-4 pt-4 text-[10px] tracking-[0.15em] uppercase text-zinc-500">
                    <div className="flex items-center gap-1.5">
                        <Verified size={12} />
                        Encrypted
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Bolt size={12} />
                        Zero Latency
                    </div>
                </div>

                <p className="text-center text-zinc-500 text-sm pt-6">
                    Not a member of the fleet?{" "}
                    <Link to="/register" className="text-red-500 font-bold hover:text-red-400" data-testid="goto-register">
                        Register for Access
                    </Link>
                </p>
            </form>
        </div>
    );
}
