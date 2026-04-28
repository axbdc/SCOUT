import { Link, useNavigate, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import SecuritySettings from "./SecuritySettings";
import { User, Bell, Shield, Info, ChevronRight, Logout, Stars, Sparkles, Globe, FileText, Privacy } from "../components/Icons";

export default function Settings() {
    return (
        <Routes>
            <Route index element={<SettingsHome />} />
            <Route path="profile" element={<ProfileEdit />} />
            <Route path="notifications" element={<NotificationsSettings />} />
            <Route path="security" element={<SecuritySettings />} />
            <Route path="about" element={<AboutSettings />} />
        </Routes>
    );
}

function Row({ Icon, label, to, danger, onClick, testid }) {
    const cls = `w-full flex items-center gap-3 bg-[#0F0F11] border border-white/5 rounded-xl px-4 py-4 hover:border-white/15 transition ${danger ? "text-red-400" : "text-white"}`;
    const content = (
        <>
            <div className={`w-9 h-9 rounded-lg ${danger ? "bg-red-500/10 text-red-400" : "bg-white/5 text-zinc-300"} flex items-center justify-center`}>
                <Icon size={16} />
            </div>
            <span className="flex-1 text-left font-medium text-sm">{label}</span>
            {!danger && <ChevronRight size={14} className="text-zinc-600" />}
        </>
    );
    return to ? (
        <Link to={to} className={cls} data-testid={testid}>{content}</Link>
    ) : (
        <button onClick={onClick} className={cls} data-testid={testid}>{content}</button>
    );
}

function SettingsHome() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    return (
        <div data-testid="settings-screen">
            <TopBar title="DEFINIÇÕES" subtitle="SCOUT · Settings" />
            <div className="px-5 pt-5 space-y-3">
                <Row Icon={User} label="Perfil" to="/settings/profile" testid="settings-profile" />
                <Row Icon={Bell} label="Notificações" to="/settings/notifications" testid="settings-notifications" />
                <Row Icon={Shield} label="Segurança" to="/settings/security" testid="settings-security" />
                <Row Icon={Info} label="Sobre a SCOUT" to="/settings/about" testid="settings-about" />
                <div className="pt-4">
                    <Row Icon={Logout} label="Sair" onClick={async () => { await logout(); navigate("/login", { replace: true }); }} danger testid="settings-logout" />
                </div>
            </div>
        </div>
    );
}

function ProfileEdit() {
    const { user } = useAuth();
    return (
        <div>
            <TopBar title="PERFIL" />
            <div className="px-5 pt-6 space-y-4">
                <Read label="Nome" value={user?.name} />
                <Read label="Email" value={user?.email} />
                <Read label="Licença" value={user?.license_id || "—"} />
                <Read label="Provider" value={user?.auth_provider} />
                <Read label="Tier" value={user?.is_black ? "SCOUT BLACK" : "Standard"} />
            </div>
        </div>
    );
}

function Read({ label, value }) {
    return (
        <div className="bg-[#0F0F11] border border-white/5 rounded-xl px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono-tech mb-0.5">{label}</div>
            <div className="text-white font-bold text-sm">{value}</div>
        </div>
    );
}

function NotificationsSettings() {
    const [prefs, setPrefs] = useState({ new_events_national: true, events_in_region: true, black_circle: false });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        api.get("/notifications/prefs").then(({ data }) => setPrefs(data));
    }, []);

    const toggle = async (k) => {
        const next = { ...prefs, [k]: !prefs[k] };
        setPrefs(next);
        await api.put("/notifications/prefs", next);
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
    };

    return (
        <div data-testid="notifications-settings">
            <TopBar title="NOTIFICAÇÕES" subtitle="Preferências" />
            <div className="px-5 pt-5">
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                    Personalize como deseja ser informado sobre as últimas novidades da estrada e eventos exclusivos.
                </p>
                <NotificationItem
                    title="Novos Eventos (Nacional)"
                    desc="Receba alertas sobre encontros, track days e tours em todo o território nacional."
                    checked={prefs.new_events_national}
                    onChange={() => toggle("new_events_national")}
                    testid="pref-national"
                />
                <NotificationItem
                    title="Eventos na minha Região"
                    desc="Notificações personalizadas baseadas na sua localização para eventos próximos."
                    checked={prefs.events_in_region}
                    onChange={() => toggle("events_in_region")}
                    testid="pref-region"
                />
                <div className="mt-6 bg-gradient-to-br from-[#1a1207] to-[#0a0a0a] border border-[#D4AF37]/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Stars size={14} className="text-[#D4AF37]" />
                        <div className="text-[10px] uppercase tracking-[0.3em] gold-shimmer font-bold">Clube Exclusivo</div>
                    </div>
                    <h3 className="font-display font-bold text-white text-base">SCOUT BLACK</h3>
                    <NotificationItem
                        title="Convites Privados"
                        desc="Receber convites para encontros 100% privados Black."
                        checked={prefs.black_circle}
                        onChange={() => toggle("black_circle")}
                        testid="pref-black"
                        compact
                    />
                </div>
                {saved && <div className="text-green-400 text-xs mt-4 text-center font-bold uppercase tracking-widest" data-testid="prefs-saved">Guardado</div>}
            </div>
        </div>
    );
}

function NotificationItem({ title, desc, checked, onChange, testid, compact }) {
    return (
        <label className={`flex items-start gap-3 cursor-pointer ${compact ? "mt-3" : "py-4 border-b border-white/5"}`}>
            <div className="flex-1">
                <div className="font-bold text-white text-sm">{title}</div>
                <div className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{desc}</div>
            </div>
            <input type="checkbox" className="scout-switch mt-1" checked={checked} onChange={onChange} data-testid={testid} />
        </label>
    );
}

function SecuritySettingsLegacy() {
    // Replaced by imported SecuritySettings — kept stub to avoid old references
    return null;
}

// Legacy stub end


function AboutSettings() {
    return (
        <div data-testid="about-settings">
            <TopBar title="SOBRE A SCOUT" />
            <div className="px-5 pt-6 text-center">
                <h1 className="font-display font-black text-5xl text-white tracking-tighter">SCOUT</h1>
                <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-mono-tech mt-1">v2.4.0</div>
                <div className="mt-4 flex items-center justify-center gap-2 text-zinc-400 text-sm">
                    <span>Encontra.</span>
                    <span className="text-red-500">Fotografa.</span>
                    <span>Acelera.</span>
                </div>
            </div>

            <div className="px-5 mt-8">
                <h3 className="font-display font-bold text-white text-base mb-2">Nossa Missão</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                    A SCOUT nasceu da paixão pela cultura automóvel. Somos a ponte entre os caçadores de raridades e a comunidade entusiasta. Redefinimos a forma como o mundo vê, capta e partilha a engenharia de alta performance.
                </p>

                <div className="flex items-center gap-2 mt-5 text-zinc-500 text-xs">
                    <Globe size={14} className="text-red-500" />
                    Desenvolvido em <span className="text-white font-bold tracking-[0.2em]">PORTUGAL</span>
                </div>

                <div className="mt-7 space-y-3">
                    <Row Icon={FileText} label="Termos de Serviço" testid="about-terms" />
                    <Row Icon={Privacy} label="Política de Privacidade" testid="about-privacy" />
                    <Row Icon={Sparkles} label="Créditos & Agradecimentos" testid="about-credits" />
                </div>

                <div className="text-center mt-8 mb-4 text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-mono-tech">
                    Powered by High-Octane Communities
                </div>
            </div>
        </div>
    );
}
