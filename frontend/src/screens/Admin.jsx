import { Routes, Route, Navigate, NavLink, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import {
    Gauge, Calendar, User, Camera, Logout, Stars, Trophy, ChevronRight, Check, X, ArrowLeft, Plus, Trash, Eye
} from "../components/Icons";

export default function Admin() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
    return (
        <div className="scout-frame relative" data-testid="admin-screen">
            {/* Top bar */}
            <header className="sticky top-0 z-30 bg-[#050505]/90 backdrop-blur-xl border-b border-[#D4AF37]/15 px-4 h-14 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg gold-bg flex items-center justify-center text-black">
                        <Stars size={18} />
                    </div>
                    <div>
                        <div className="font-display font-black text-white text-sm tracking-tight">SCOUT ADMIN</div>
                        <div className="text-[9px] uppercase tracking-[0.3em] gold-shimmer font-bold">Command Console</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link to="/dashboard" className="h-9 px-3 rounded-full bg-white/5 hover:bg-white/10 flex items-center gap-1.5 text-zinc-300 text-[10px] font-bold uppercase tracking-widest" data-testid="admin-view-as-member">
                        <Eye size={12} /> Modo Membro
                    </Link>
                    <button onClick={async () => { await logout(); navigate("/login", { replace: true }); }} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-300" data-testid="admin-logout">
                        <Logout size={14} />
                    </button>
                </div>
            </header>

            <div className="pb-[78px] min-h-[calc(100vh-56px)]">
                <Routes>
                    <Route index element={<AdminDashboard />} />
                    <Route path="events" element={<AdminEvents />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="photos" element={<AdminPhotos />} />
                </Routes>
            </div>

            {/* Admin bottom nav */}
            <nav className="absolute bottom-0 left-0 right-0 h-[72px] bg-black/85 backdrop-blur-xl border-t border-[#D4AF37]/15 flex justify-around items-stretch z-40" data-testid="admin-bottom-nav">
                <AdminTab to="/admin" Icon={Gauge} label="Stats" testid="admin-nav-stats" end />
                <AdminTab to="/admin/events" Icon={Calendar} label="Eventos" testid="admin-nav-events" />
                <AdminTab to="/admin/users" Icon={User} label="Users" testid="admin-nav-users" />
                <AdminTab to="/admin/photos" Icon={Camera} label="Fotos" testid="admin-nav-photos" />
            </nav>
        </div>
    );
}

function AdminTab({ to, Icon, label, testid, end }) {
    return (
        <NavLink to={to} end={end} data-testid={testid}
            className={({ isActive }) =>
                `relative flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${isActive ? "text-[#D4AF37]" : "text-zinc-500 hover:text-zinc-300"}`
            }>
            {({ isActive }) => (
                <>
                    {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-0.5 gold-bg rounded-b-full" />}
                    <Icon size={20} />
                    <span className="text-[9px] font-bold tracking-wider uppercase">{label}</span>
                </>
            )}
        </NavLink>
    );
}

function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [pending, setPending] = useState([]);
    const [monthly, setMonthly] = useState([]);

    useEffect(() => {
        api.get("/admin/stats").then(({ data }) => setStats(data));
        api.get("/admin/events?status=pending").then(({ data }) => setPending(data));
        api.get("/admin/revenue/monthly").then(({ data }) => setMonthly(data));
    }, []);

    if (!stats) return <div className="text-zinc-500 text-center py-20 font-mono-tech text-xs uppercase tracking-widest">A carregar...</div>;

    const cards = [
        { label: "Membros", value: stats.users, color: "red" },
        { label: "Black Members", value: stats.members_black, color: "gold" },
        { label: "Eventos Aprovados", value: stats.events_approved, color: "green" },
        { label: "Em Revisão", value: stats.events_pending, color: "amber" },
        { label: "Reservas", value: stats.bookings, color: "blue" },
        { label: "Subscrições Ativas", value: stats.subscriptions_active, color: "gold" },
    ];

    return (
        <div className="px-4 pt-5 pb-4" data-testid="admin-dashboard">
            <h1 className="font-display font-black text-2xl text-white tracking-tighter mb-1">Dashboard</h1>
            <p className="text-zinc-500 text-xs mb-5">Estado da plataforma em tempo real</p>

            <div className="grid grid-cols-2 gap-2.5 mb-6">
                {cards.map((c) => (
                    <div key={c.label} className={`bg-[#0F0F11] border border-white/5 rounded-xl p-3 ${c.color === "gold" ? "border-[#D4AF37]/25" : ""}`}>
                        <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-mono-tech">{c.label}</div>
                        <div className={`font-display font-black text-3xl mt-1 ${c.color === "gold" ? "text-[#D4AF37]" : c.color === "amber" ? "text-amber-400" : c.color === "green" ? "text-green-400" : c.color === "blue" ? "text-blue-400" : "text-white"}`}>
                            {c.value}
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-gradient-to-br from-green-600/10 to-transparent border border-green-500/20 rounded-xl p-4 mb-6" data-testid="admin-revenue">
                <div className="text-[9px] uppercase tracking-[0.2em] text-green-400/80 font-mono-tech mb-1">Receita Acumulada</div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <div className="text-zinc-500 text-[10px] uppercase tracking-widest">Submissões</div>
                        <div className="font-display font-black text-2xl text-white">€{stats.submission_revenue_eur.toFixed(2)}</div>
                    </div>
                    <div>
                        <div className="text-zinc-500 text-[10px] uppercase tracking-widest">Subscrições</div>
                        <div className="font-display font-black text-2xl text-white">€{stats.subscription_revenue_eur.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* Monthly Revenue Chart */}
            <div className="bg-[#0F0F11] border border-white/5 rounded-xl p-4 mb-6" data-testid="admin-revenue-chart">
                <div className="flex items-baseline justify-between mb-3">
                    <h3 className="font-display font-bold text-white">Receita por Mês</h3>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-mono-tech">EUR</span>
                </div>
                <RevenueChart data={monthly} />
                <div className="flex items-center gap-4 mt-3 text-[10px]">
                    <Legend color="#E53935" label="Submissões" />
                    <Legend color="#D4AF37" label="Subscrições" />
                    <Legend color="#3B82F6" label="Fotos" />
                </div>
            </div>

            <h2 className="font-display font-bold text-white text-base mb-3 flex items-center justify-between">
                Eventos em Revisão
                <NavLink to="/admin/events" className="text-[10px] uppercase tracking-[0.15em] text-red-500 font-bold flex items-center gap-1">
                    Gerir <ChevronRight size={12} />
                </NavLink>
            </h2>

            {pending.length === 0 && <div className="text-center text-zinc-600 text-xs uppercase tracking-widest py-8" data-testid="admin-pending-empty">Sem submissões pendentes</div>}

            <div className="space-y-2">
                {pending.slice(0, 4).map((e) => (
                    <div key={e.event_id} className="flex items-center gap-3 bg-[#0F0F11] border border-amber-500/20 rounded-xl p-3" data-testid={`admin-pending-${e.event_id}`}>
                        <img src={e.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-white text-sm truncate">{e.title}</div>
                            <div className="text-zinc-500 text-[11px] truncate">{e.organizer} · {e.date}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[9px] font-bold uppercase tracking-wider">Pending</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Legend({ color, label }) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
            <span className="text-zinc-400 uppercase tracking-widest font-mono-tech">{label}</span>
        </div>
    );
}

function RevenueChart({ data }) {
    if (!data || data.length === 0) {
        return <div className="text-center text-zinc-600 text-[11px] uppercase tracking-widest py-8" data-testid="revenue-chart-empty">Sem receita registada ainda</div>;
    }
    const max = Math.max(...data.map((m) => m.total), 1);
    const W = 360;
    const H = 140;
    const PAD = 24;
    const slot = (W - PAD * 2) / Math.max(data.length, 4);
    const barW = Math.min(slot - 12, 44);
    return (
        <svg viewBox={`0 0 ${W} ${H + 40}`} className="w-full" data-testid="revenue-chart">
            {[0.25, 0.5, 0.75, 1].map((p) => (
                <line key={p} x1={PAD} x2={W - PAD} y1={H - p * H + 5} y2={H - p * H + 5} stroke="rgba(255,255,255,0.05)" />
            ))}
            {data.map((m, i) => {
                const cx = PAD + slot * i + slot / 2;
                const x = cx - barW / 2;
                const subH = (m.submissions / max) * H;
                const subsH = (m.subscriptions / max) * H;
                const phH = (m.photos / max) * H;
                let y = H + 5;
                return (
                    <g key={m.month} data-testid={`bar-${m.month}`}>
                        <rect x={x} y={y - subH} width={barW} height={subH} fill="#E53935" rx={2} />
                        <rect x={x} y={y - subH - subsH} width={barW} height={subsH} fill="#D4AF37" rx={2} />
                        <rect x={x} y={y - subH - subsH - phH} width={barW} height={phH} fill="#3B82F6" rx={2} />
                        <text x={cx} y={H + 22} textAnchor="middle" fill="#71717a" fontSize="9" fontFamily="JetBrains Mono">
                            {m.month.slice(5)}/{m.month.slice(2, 4)}
                        </text>
                        <text x={cx} y={y - subH - subsH - phH - 4} textAnchor="middle" fill="#fafafa" fontSize="9" fontWeight="700">
                            €{Math.round(m.total)}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

function AdminEvents() {
    const [filter, setFilter] = useState("pending");
    const [events, setEvents] = useState([]);
    const [busy, setBusy] = useState(null);

    const load = async () => {
        const { data } = await api.get(`/admin/events?status=${filter}`);
        setEvents(data);
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

    const approve = async (id) => {
        setBusy(id);
        try { await api.post(`/admin/events/${id}/approve`); await load(); } finally { setBusy(null); }
    };
    const reject = async (id) => {
        const reason = prompt("Motivo da rejeição (opcional):", "") ?? "";
        setBusy(id);
        try { await api.post(`/admin/events/${id}/reject`, { reason }); await load(); } finally { setBusy(null); }
    };
    const remove = async (id) => {
        if (!confirm("Eliminar evento permanentemente?")) return;
        setBusy(id);
        try { await api.delete(`/admin/events/${id}`); await load(); } finally { setBusy(null); }
    };

    return (
        <div className="px-4 pt-5 pb-4" data-testid="admin-events">
            <h1 className="font-display font-black text-2xl text-white tracking-tighter mb-1">Eventos</h1>
            <p className="text-zinc-500 text-xs mb-4">Aprovar, rejeitar ou eliminar.</p>

            <div className="flex gap-1 bg-[#0F0F11] border border-white/5 rounded-full p-1 mb-4">
                {[
                    { id: "pending", label: "Pendentes" },
                    { id: "approved", label: "Aprovados" },
                    { id: "rejected", label: "Rejeitados" },
                ].map((t) => (
                    <button key={t.id} onClick={() => setFilter(t.id)} data-testid={`admin-filter-${t.id}`}
                        className={`flex-1 h-9 rounded-full text-[11px] font-bold uppercase tracking-wider transition ${
                            filter === t.id ? "bg-red-600 text-white" : "text-zinc-400"
                        }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {events.length === 0 && <div className="text-center text-zinc-600 text-xs uppercase tracking-widest py-12" data-testid="admin-events-empty">Lista vazia</div>}

            <div className="space-y-3">
                {events.map((e) => (
                    <div key={e.event_id} className="bg-[#0F0F11] border border-white/5 rounded-xl overflow-hidden" data-testid={`admin-event-${e.event_id}`}>
                        <div className="flex gap-3">
                            <img src={e.image} alt="" className="w-20 h-20 object-cover" />
                            <div className="flex-1 py-2.5 pr-3 min-w-0">
                                <div className="font-bold text-white text-sm">{e.title}</div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-red-500 font-mono-tech mt-0.5">
                                    {e.type} · €{e.price}
                                </div>
                                <div className="text-zinc-500 text-[11px] mt-0.5 truncate">{e.organizer} · {e.date}</div>
                                <div className="text-zinc-600 text-[11px] truncate">{e.location_name}</div>
                            </div>
                        </div>
                        <div className="px-3 pb-3 pt-1">
                            <div className="text-zinc-400 text-xs leading-relaxed line-clamp-2 mb-2">{e.description}</div>
                            {e.categories?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {e.categories.map((c) => (
                                        <span key={c} className="px-2 py-0.5 rounded-full bg-red-600/15 border border-red-500/30 text-[9px] uppercase tracking-[0.2em] text-red-400 font-bold">{c}</span>
                                    ))}
                                </div>
                            )}
                            {e.rejection_reason && (
                                <div className="text-red-400 text-[11px] mb-2 italic">Razão: {e.rejection_reason}</div>
                            )}
                            <div className="flex gap-2">
                                {e.status === "pending" && (
                                    <>
                                        <button disabled={busy === e.event_id} onClick={() => approve(e.event_id)} data-testid={`approve-${e.event_id}`}
                                            className="flex-1 h-10 rounded-md bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 disabled:opacity-50">
                                            <Check size={12} strokeWidth={3} /> Aprovar
                                        </button>
                                        <button disabled={busy === e.event_id} onClick={() => reject(e.event_id)} data-testid={`reject-${e.event_id}`}
                                            className="flex-1 h-10 rounded-md bg-amber-600/30 hover:bg-amber-600/40 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 disabled:opacity-50">
                                            <X size={12} strokeWidth={3} /> Rejeitar
                                        </button>
                                    </>
                                )}
                                {e.status === "rejected" && (
                                    <button disabled={busy === e.event_id} onClick={() => approve(e.event_id)} data-testid={`reapprove-${e.event_id}`}
                                        className="flex-1 h-10 rounded-md bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                                        <Check size={12} strokeWidth={3} /> Reaprovar
                                    </button>
                                )}
                                <button disabled={busy === e.event_id} onClick={() => remove(e.event_id)} data-testid={`delete-${e.event_id}`}
                                    className="h-10 px-3 rounded-md bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400 flex items-center justify-center disabled:opacity-50">
                                    <Trash size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AdminUsers() {
    const [users, setUsers] = useState([]);

    const load = async () => {
        const { data } = await api.get("/admin/users");
        setUsers(data);
    };

    useEffect(() => { load(); }, []);

    const toggleBlack = async (u) => {
        await api.patch(`/admin/users/${u.user_id}`, { is_black: !u.is_black });
        await load();
    };
    const toggleAdmin = async (u) => {
        if (!confirm(`Tornar ${u.email} ${u.role === "admin" ? "membro" : "ADMIN"}?`)) return;
        await api.patch(`/admin/users/${u.user_id}`, { role: u.role === "admin" ? "member" : "admin" });
        await load();
    };
    const remove = async (u) => {
        if (!confirm(`Eliminar ${u.email}?`)) return;
        try { await api.delete(`/admin/users/${u.user_id}`); await load(); }
        catch (e) { alert(formatApiErrorDetail(e.response?.data?.detail)); }
    };

    return (
        <div className="px-4 pt-5 pb-4" data-testid="admin-users">
            <h1 className="font-display font-black text-2xl text-white tracking-tighter mb-1">Utilizadores</h1>
            <p className="text-zinc-500 text-xs mb-4">{users.length} membros registados</p>

            <div className="space-y-2">
                {users.map((u) => (
                    <div key={u.user_id} className="bg-[#0F0F11] border border-white/5 rounded-xl p-3" data-testid={`admin-user-${u.user_id}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-white font-display font-black text-xs overflow-hidden">
                                {u.picture ? <img src={u.picture} alt="" className="w-full h-full object-cover" /> : (u.name || u.email).slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <div className="font-bold text-white text-sm truncate">{u.name}</div>
                                    {u.role === "admin" && <span className="px-1.5 py-0 rounded bg-red-600/20 text-red-400 text-[9px] font-bold uppercase tracking-wider">Admin</span>}
                                    {u.is_black && <span className="px-1.5 py-0 rounded bg-[#D4AF37]/20 text-[#D4AF37] text-[9px] font-bold uppercase tracking-wider">Black</span>}
                                </div>
                                <div className="text-zinc-500 text-[11px] truncate">{u.email}</div>
                                <div className="text-zinc-600 text-[10px] font-mono-tech">{u.points || 0} pts · {u.auth_provider}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                            <button onClick={() => toggleBlack(u)} className="h-8 rounded-md bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] text-[9px] font-bold uppercase tracking-wider" data-testid={`toggle-black-${u.user_id}`}>
                                {u.is_black ? "Remover Black" : "Add Black"}
                            </button>
                            <button onClick={() => toggleAdmin(u)} className="h-8 rounded-md bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 text-[9px] font-bold uppercase tracking-wider" data-testid={`toggle-admin-${u.user_id}`}>
                                {u.role === "admin" ? "Remover Admin" : "Tornar Admin"}
                            </button>
                            <button onClick={() => remove(u)} className="h-8 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1" data-testid={`delete-user-${u.user_id}`}>
                                <Trash size={10} /> Apagar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AdminPhotos() {
    const [events, setEvents] = useState([]);
    const [selected, setSelected] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [form, setForm] = useState({ photographer_name: "", image_url: "", price: "5", car_label: "" });

    useEffect(() => {
        api.get("/admin/events?status=approved").then(({ data }) => setEvents(data));
    }, []);

    const loadPhotos = async (eventId) => {
        const { data } = await api.get(`/events/${eventId}/photos`);
        setPhotos(data);
    };

    const select = (e) => {
        setSelected(e);
        loadPhotos(e.event_id);
    };

    const add = async () => {
        if (!selected || !form.image_url || !form.photographer_name) return alert("Preenche todos os campos");
        try {
            await api.post("/admin/photos", {
                event_id: selected.event_id,
                photographer_name: form.photographer_name,
                image_url: form.image_url,
                price: parseFloat(form.price) || 0,
                car_label: form.car_label,
            });
            setForm({ photographer_name: "", image_url: "", price: "5", car_label: "" });
            loadPhotos(selected.event_id);
        } catch (e) {
            alert(formatApiErrorDetail(e.response?.data?.detail));
        }
    };

    const removePhoto = async (id) => {
        if (!confirm("Remover foto?")) return;
        await api.delete(`/admin/photos/${id}`);
        loadPhotos(selected.event_id);
    };

    return (
        <div className="px-4 pt-5 pb-4" data-testid="admin-photos">
            <h1 className="font-display font-black text-2xl text-white tracking-tighter mb-1">Galeria por Evento</h1>
            <p className="text-zinc-500 text-xs mb-4">Adicionar fotos vendíveis (parceria fotógrafos).</p>

            {!selected && (
                <div className="space-y-2">
                    {events.map((e) => (
                        <button key={e.event_id} onClick={() => select(e)} className="w-full flex items-center gap-3 bg-[#0F0F11] border border-white/5 rounded-xl p-3 text-left hover:border-white/15" data-testid={`admin-photos-event-${e.event_id}`}>
                            <img src={e.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-white text-sm truncate">{e.title}</div>
                                <div className="text-zinc-500 text-[11px]">{e.date}</div>
                            </div>
                            <ChevronRight size={14} className="text-zinc-600" />
                        </button>
                    ))}
                </div>
            )}

            {selected && (
                <div>
                    <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-widest mb-3" data-testid="admin-photos-back">
                        <ArrowLeft size={14} /> Voltar
                    </button>
                    <div className="font-display font-bold text-white">{selected.title}</div>
                    <div className="text-zinc-500 text-xs mb-4">{photos.length} fotos</div>

                    <div className="bg-[#0F0F11] border border-white/5 rounded-xl p-3 mb-5 space-y-2">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-mono-tech mb-1">Adicionar Foto</div>
                        <input value={form.photographer_name} onChange={(e) => setForm({ ...form, photographer_name: e.target.value })} placeholder="Nome do fotógrafo" className="w-full bg-black/40 border border-white/10 rounded-md h-10 px-3 text-white text-sm placeholder:text-zinc-600" data-testid="ap-photographer" />
                        <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="URL da imagem" className="w-full bg-black/40 border border-white/10 rounded-md h-10 px-3 text-white text-sm placeholder:text-zinc-600" data-testid="ap-image" />
                        <input value={form.car_label} onChange={(e) => setForm({ ...form, car_label: e.target.value })} placeholder="Carro (opcional)" className="w-full bg-black/40 border border-white/10 rounded-md h-10 px-3 text-white text-sm placeholder:text-zinc-600" data-testid="ap-car" />
                        <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Preço €" className="w-full bg-black/40 border border-white/10 rounded-md h-10 px-3 text-white text-sm placeholder:text-zinc-600" data-testid="ap-price" />
                        <button onClick={add} className="w-full h-10 rounded-md bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1" data-testid="ap-add">
                            <Plus size={12} /> Adicionar
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {photos.map((p) => (
                            <div key={p.photo_id} className="relative rounded-lg overflow-hidden border border-white/5" data-testid={`admin-photo-${p.photo_id}`}>
                                <img src={p.image_url} alt="" className="w-full aspect-square object-cover" />
                                <button onClick={() => removePhoto(p.photo_id)} className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/80 text-red-400 flex items-center justify-center" data-testid={`remove-photo-${p.photo_id}`}>
                                    <Trash size={12} />
                                </button>
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent p-1.5">
                                    <div className="text-white text-[9px] font-bold truncate">{p.car_label || "—"}</div>
                                    <div className="text-[#D4AF37] text-[9px] font-bold">€{p.price}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
