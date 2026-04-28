import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import TopBar from "../components/TopBar";
import { Star, Stars, Trophy, ChevronRight, Settings, Logout, ArrowRight, Heart, Camera, Plus } from "../components/Icons";

export default function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [tab, setTab] = useState("bookings");

    useEffect(() => {
        api.get("/bookings/me").then(({ data }) => setBookings(data));
        api.get("/events/me/submissions").then(({ data }) => setSubmissions(data));
        api.get("/favorites/me").then(({ data }) => setFavorites(data));
        api.get("/photos/me").then(({ data }) => setPhotos(data));
    }, []);

    const initials = user?.name?.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "??";
    const points = user?.points ?? 0;
    const nextLevel = 1500;
    const pct = Math.min(100, Math.round((points / nextLevel) * 100));

    return (
        <div data-testid="profile-screen">
            <TopBar
                title="PILOT PROFILE"
                onBack={false}
                right={
                    <Link to="/settings" className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center" data-testid="goto-settings">
                        <Settings size={16} />
                    </Link>
                }
            />

            <div className="px-5 pt-6">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 ring-2 ring-red-500/30 flex items-center justify-center text-white font-display font-black text-xl overflow-hidden">
                        {user?.picture ? <img src={user.picture} alt="" className="w-full h-full object-cover" /> : initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        {user?.is_black ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 mb-1">
                                <Stars size={10} className="text-[#D4AF37]" />
                                <span className="text-[9px] uppercase tracking-[0.2em] gold-shimmer font-bold">Membro Scout Black</span>
                            </div>
                        ) : (
                            <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-white/10 mb-1">
                                <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-400 font-bold">Membro</span>
                            </div>
                        )}
                        <h2 className="font-display font-bold text-white text-xl truncate">{user?.name}</h2>
                        <div className="text-zinc-500 text-xs font-mono-tech">Licença: {user?.license_id || "—"}</div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-5">
                    <Mini Icon={Trophy} label="Reservas" value={bookings.length} />
                    <Mini Icon={Heart} label="Favoritos" value={favorites.length} />
                    <Mini Icon={Camera} label="Fotos" value={photos.length} />
                </div>

                <Link to="/rewards" className="mt-4 block bg-gradient-to-br from-red-600/15 via-[#0F0F11] to-[#0F0F11] border border-red-500/25 rounded-xl p-4 hover:border-red-500/40 transition" data-testid="profile-rewards-card">
                    <div className="flex items-baseline justify-between mb-2">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-mono-tech flex items-center gap-1.5">
                            <Stars size={11} className="text-yellow-400" /> SCOUT Points · Trocar
                        </div>
                        <ArrowRight size={14} className="text-red-500" />
                    </div>
                    <div className="font-display font-black text-3xl text-white">{points} pts</div>
                    <div className="text-zinc-500 text-[10px] mt-1">Próximo Nível: {nextLevel} pts · {pct}%</div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-gradient-to-r from-red-700 to-red-500" style={{ width: `${pct}%` }} />
                    </div>
                </Link>

                {/* Tabs: My Events */}
                <div className="mt-7">
                    <div className="flex gap-1 bg-[#0F0F11] border border-white/5 rounded-full p-1 mb-4" data-testid="my-events-tabs">
                        {[
                            { id: "bookings", label: "Reservados", count: bookings.length },
                            { id: "submissions", label: "Submetidos", count: submissions.length },
                            { id: "favorites", label: "Favoritos", count: favorites.length },
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                data-testid={`tab-${t.id}`}
                                className={`flex-1 h-9 rounded-full text-[11px] font-bold uppercase tracking-wider transition ${
                                    tab === t.id ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"
                                }`}
                            >
                                {t.label} ({t.count})
                            </button>
                        ))}
                    </div>

                    {tab === "bookings" && <BookingsList items={bookings} navigate={navigate} />}
                    {tab === "submissions" && <SubmissionsList items={submissions} />}
                    {tab === "favorites" && <FavoritesList items={favorites} navigate={navigate} />}
                </div>

                {!user?.is_black && (
                    <Link to="/scout-black" className="block mt-6 relative bg-gradient-to-br from-[#1a1207] to-[#0a0a0a] border border-[#D4AF37]/30 rounded-2xl p-4 overflow-hidden premium-glow" data-testid="profile-black-promo">
                        <div className="text-[10px] tracking-[0.3em] uppercase gold-shimmer font-bold mb-1">Scout Black</div>
                        <h3 className="font-display font-bold text-white text-base">Sobe ao próximo círculo</h3>
                        <p className="text-zinc-400 text-xs mt-1">Acesso prioritário, eventos privados e parcerias premium.</p>
                        <div className="mt-2 inline-flex items-center gap-1 text-[#D4AF37] font-bold text-xs">Saber Mais <ArrowRight size={12} /></div>
                    </Link>
                )}

                <div className="mt-7 grid grid-cols-2 gap-3 mb-2">
                    <Link to="/submit-event" className="h-12 bg-red-600/10 hover:bg-red-600/15 rounded-md border border-red-500/30 text-red-400 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2" data-testid="profile-submit">
                        <Plus size={14} /> Submeter Evento
                    </Link>
                    <button onClick={async () => { await logout(); navigate("/login", { replace: true }); }} className="h-12 bg-white/5 hover:bg-white/10 rounded-md border border-white/10 text-zinc-300 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2" data-testid="profile-logout">
                        <Logout size={14} /> Sair
                    </button>
                </div>
            </div>
        </div>
    );
}

function Mini({ Icon, label, value }) {
    return (
        <div className="bg-[#0F0F11] border border-white/5 rounded-xl p-3 text-center">
            <Icon size={14} className="mx-auto text-red-500 mb-1" />
            <div className="font-display font-black text-2xl text-white leading-none">{value}</div>
            <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-mono-tech mt-1">{label}</div>
        </div>
    );
}

function BookingsList({ items, navigate }) {
    if (items.length === 0) return <Empty msg="Sem reservas ainda." />;
    return (
        <div className="space-y-2">
            {items.map((b) => (
                <button key={b.booking_id} onClick={() => navigate(`/events/${b.event_id}`)} data-testid={`booking-${b.booking_id}`}
                    className="w-full flex items-center gap-3 bg-[#0F0F11] border border-white/5 rounded-xl p-3 hover:border-white/15 transition text-left">
                    <div className="w-10 h-10 rounded-lg bg-green-600/15 text-green-400 flex items-center justify-center"><Trophy size={16} /></div>
                    <div className="flex-1">
                        <div className="font-bold text-white text-sm">Reserva confirmada</div>
                        <div className="text-zinc-500 text-[11px] font-mono-tech">{b.booking_id}</div>
                    </div>
                    <ChevronRight size={14} className="text-zinc-600" />
                </button>
            ))}
        </div>
    );
}

function SubmissionsList({ items }) {
    if (items.length === 0) return <Empty msg="Ainda não submeteste nenhum evento." />;
    return (
        <div className="space-y-2">
            {items.map((e) => {
                const colorMap = { pending: "amber", approved: "green", rejected: "red" };
                const c = colorMap[e.status] || "zinc";
                return (
                    <div key={e.event_id} className="flex items-center gap-3 bg-[#0F0F11] border border-white/5 rounded-xl p-3" data-testid={`submission-${e.event_id}`}>
                        <img src={e.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-white text-sm truncate">{e.title}</div>
                            <div className="text-zinc-500 text-[11px]">{e.date} · {e.location_name}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full bg-${c}-500/15 text-${c}-400 text-[9px] font-bold uppercase tracking-wider`}>
                            {e.status === "pending" ? "Em revisão" : e.status === "approved" ? "Aprovado" : "Rejeitado"}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function FavoritesList({ items, navigate }) {
    if (items.length === 0) return <Empty msg="Sem eventos favoritos." />;
    return (
        <div className="space-y-2">
            {items.map((e) => (
                <button key={e.event_id} onClick={() => navigate(`/events/${e.event_id}`)} data-testid={`fav-${e.event_id}`}
                    className="w-full flex items-center gap-3 bg-[#0F0F11] border border-white/5 rounded-xl p-3 hover:border-white/15 transition text-left">
                    <img src={e.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-white text-sm truncate">{e.title}</div>
                        <div className="text-zinc-500 text-[11px]">{e.date} · {e.location_name}</div>
                    </div>
                    <Heart size={14} className="text-red-500 fill-red-500" />
                </button>
            ))}
        </div>
    );
}

function Empty({ msg }) {
    return <div className="text-center text-zinc-600 text-[11px] uppercase tracking-widest py-8">{msg}</div>;
}
