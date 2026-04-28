import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { api } from "../lib/api";
import TopBar from "../components/TopBar";
import { Star, Stars, Trophy, ChevronRight, Settings, Logout, Bell, Shield, Info, Compass, ArrowRight, PartnerIcon } from "../components/Icons";

export default function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [partners, setPartners] = useState([]);

    useEffect(() => {
        api.get("/bookings/me").then(({ data }) => setBookings(data));
        api.get("/partnerships?tier=open").then(({ data }) => setPartners(data.slice(0, 5)));
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
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 ring-2 ring-red-500/30 flex items-center justify-center text-white font-display font-black text-xl">
                        {initials}
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

                <div className="grid grid-cols-2 gap-3 mt-5">
                    <div className="bg-[#0F0F11] border border-white/5 rounded-xl p-4">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-mono-tech mb-1 flex items-center gap-1.5">
                            <Trophy size={11} /> Events Attended
                        </div>
                        <div className="font-display font-black text-3xl text-white">{bookings.length}</div>
                        <div className="text-zinc-500 text-[10px] mt-0.5">Global</div>
                    </div>
                    <div className="bg-[#0F0F11] border border-white/5 rounded-xl p-4">
                        <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-mono-tech mb-1 flex items-center gap-1.5">
                            <Star size={11} /> Current Rank
                        </div>
                        <div className="font-display font-black text-3xl text-red-500">TOP 3%</div>
                        <div className="text-zinc-500 text-[10px] mt-0.5">Sliverstone League</div>
                    </div>
                </div>

                <div className="mt-4 bg-gradient-to-br from-red-600/10 to-transparent border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-baseline justify-between mb-2">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-mono-tech">SCOUT Points Balance</div>
                        <Stars size={14} className="text-yellow-400" />
                    </div>
                    <div className="font-display font-black text-3xl text-white">{points} pts</div>
                    <div className="text-zinc-500 text-[10px] mt-1">Próximo Nível: {nextLevel} pts · {pct}%</div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-gradient-to-r from-red-700 to-red-500" style={{ width: `${pct}%` }} />
                    </div>
                    <button className="mt-3 w-full h-10 rounded-md bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2" data-testid="redeem-points">
                        Trocar pontos <ArrowRight size={12} />
                    </button>
                    <p className="text-zinc-500 text-[11px] mt-3 leading-relaxed">
                        Tem pontos suficientes para resgatar 2 convites para o Estoril Experience Day.
                    </p>
                </div>

                {/* Black Promo */}
                {!user?.is_black && (
                    <Link
                        to="/scout-black"
                        className="block mt-5 relative bg-gradient-to-br from-[#1a1207] to-[#0a0a0a] border border-[#D4AF37]/30 rounded-2xl p-4 overflow-hidden premium-glow"
                        data-testid="profile-black-promo"
                    >
                        <div className="text-[10px] tracking-[0.3em] uppercase gold-shimmer font-bold mb-1">Scout Black</div>
                        <h3 className="font-display font-bold text-white text-base">Sobe ao próximo círculo</h3>
                        <p className="text-zinc-400 text-xs mt-1">Acesso prioritário, eventos privados e parcerias premium.</p>
                        <div className="mt-2 inline-flex items-center gap-1 text-[#D4AF37] font-bold text-xs">
                            Saber Mais <ArrowRight size={12} />
                        </div>
                    </Link>
                )}

                <h3 className="font-display font-bold text-white text-lg mt-7 mb-3">Parcerias Abertas</h3>
                <div className="space-y-2">
                    {partners.map((p) => (
                        <div key={p.partnership_id} className="flex items-center gap-3 bg-[#0F0F11] border border-white/5 rounded-xl p-3" data-testid={`profile-partner-${p.partnership_id}`}>
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-red-500">
                                <PartnerIcon name={p.icon} size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-white text-sm">{p.name}</div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">{p.discount}</div>
                            </div>
                            <ChevronRight size={14} className="text-zinc-600" />
                        </div>
                    ))}
                </div>

                <div className="mt-7 grid grid-cols-2 gap-3">
                    <Link to="/settings" className="h-12 bg-white/5 hover:bg-white/10 rounded-md border border-white/10 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2" data-testid="profile-settings">
                        <Settings size={14} /> Definições
                    </Link>
                    <button onClick={async () => { await logout(); navigate("/login", { replace: true }); }} className="h-12 bg-red-600/10 border border-red-500/30 hover:bg-red-600/20 rounded-md text-red-400 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2" data-testid="profile-logout">
                        <Logout size={14} /> Sair
                    </button>
                </div>
            </div>
        </div>
    );
}
