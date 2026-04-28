import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { formatApiErrorDetail } from "../lib/api";
import { ArrowLeft, Bolt, User, Mail, Lock, Verified, Speed } from "../components/Icons";

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
    const [accept, setAccept] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (form.password !== form.confirm) return setError("As palavras-passe não coincidem.");
        if (!accept) return setError("Aceita os Membership Protocols para continuar.");
        setLoading(true);
        try {
            await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
            navigate("/dashboard", { replace: true });
        } catch (err) {
            setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="scout-frame min-h-screen relative overflow-hidden" data-testid="register-screen">
            <div
                className="absolute inset-0 opacity-25"
                style={{
                    backgroundImage:
                        "url(https://images.pexels.com/photos/596815/pexels-photo-596815.jpeg)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "brightness(0.3)",
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/85 to-black" />

            <div className="relative px-5 pt-6 pb-4 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center" data-testid="register-back">
                    <ArrowLeft size={18} />
                </button>
                <div className="text-[10px] tracking-[0.35em] text-zinc-500 font-mono-tech">REGISTRATION PHASE</div>
                <div className="w-9" />
            </div>

            <div className="relative px-6">
                <div className="text-[10px] tracking-[0.45em] text-red-500 font-mono-tech mb-2 reveal">GRAND TOURER</div>
                <h1 className="font-display font-black text-4xl text-white tracking-tighter leading-none reveal reveal-1">
                    Join the<br />Circle.
                </h1>
            </div>

            <form onSubmit={submit} className="relative px-6 mt-8 space-y-4 pb-12">
                <Field label="Full Identity" Icon={User}>
                    <input
                        data-testid="register-name"
                        value={form.name}
                        onChange={upd("name")}
                        required
                        placeholder="Arthur Shelby"
                        className="w-full bg-[#0F0F11] border border-white/10 rounded-md h-12 pl-11 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
                    />
                </Field>
                <Field label="Digital Signature (Email)" Icon={Mail}>
                    <input
                        data-testid="register-email"
                        type="email"
                        value={form.email}
                        onChange={upd("email")}
                        required
                        placeholder="exemplo@scout.pt"
                        className="w-full bg-[#0F0F11] border border-white/10 rounded-md h-12 pl-11 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
                    />
                </Field>
                <Field label="Access Key" Icon={Lock}>
                    <input
                        data-testid="register-password"
                        type="password"
                        value={form.password}
                        onChange={upd("password")}
                        required
                        minLength={6}
                        placeholder="•••••••• (mín. 6)"
                        className="w-full bg-[#0F0F11] border border-white/10 rounded-md h-12 pl-11 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
                    />
                </Field>
                <Field label="Verify Key" Icon={Lock}>
                    <input
                        data-testid="register-confirm"
                        type="password"
                        value={form.confirm}
                        onChange={upd("confirm")}
                        required
                        placeholder="••••••••"
                        className="w-full bg-[#0F0F11] border border-white/10 rounded-md h-12 pl-11 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
                    />
                </Field>

                <label className="flex items-start gap-3 pt-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={accept}
                        onChange={(e) => setAccept(e.target.checked)}
                        className="scout-check mt-1 w-4 h-4"
                        data-testid="register-accept"
                    />
                    <span className="text-xs text-zinc-400 leading-relaxed">
                        Aceito os <span className="text-white">Membership Protocols</span> e as condições de privacidade do ecosistema Grand Tourer.
                    </span>
                </label>

                {error && (
                    <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded" data-testid="register-error">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    data-testid="register-submit"
                    className="w-full h-12 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-display font-bold tracking-widest uppercase text-sm rounded-md flex items-center justify-center gap-2 transition shadow-[0_0_30px_rgba(229,57,53,0.35)] disabled:opacity-60"
                >
                    <Bolt size={14} />
                    {loading ? "A criar conta..." : "Create Account"}
                </button>

                <div className="flex items-center justify-center gap-4 pt-2 text-[10px] tracking-[0.15em] uppercase text-zinc-500">
                    <div className="flex items-center gap-1.5">
                        <Verified size={12} /> Encrypted Data
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Speed size={12} /> Zero Latency Sync
                    </div>
                </div>

                <p className="text-center text-zinc-500 text-sm pt-4">
                    Already have an account?{" "}
                    <Link to="/login" className="text-red-500 font-bold hover:text-red-400" data-testid="goto-login">
                        Sign In
                    </Link>
                </p>
            </form>
        </div>
    );
}

function Field({ label, Icon, children }) {
    return (
        <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-2">{label}</label>
            <div className="relative">
                <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                {children}
            </div>
        </div>
    );
}
