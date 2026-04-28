import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { Map, Calendar, Stars, ChevronRight, PartnerIcon, ArrowRight, Trophy, Plus, Heart, Camera } from "../components/Icons";

export default function Dashboard() {
    const { user } = useAuth();
    const [partners, setPartners] = useState([]);
    const [blackPartners, setBlackPartners] = useState([]);
    const [upcoming, setUpcoming] = useState([]);

    useEffect(() => {
        api.get("/partnerships?tier=open").then(({ data }) => setPartners(data.slice(0, 3)));
        api.get("/partnerships?tier=black").then(({ data }) => setBlackPartners(data.slice(0, 2)));
        api.get("/events").then(({ data }) => setUpcoming(data.slice(0, 3)));
    }, []);

    const firstName = user?.name?.split(" ")[0] || "Pilot";

    return (
        <div className="px-5 pt-6" data-testid="dashboard-screen">
            <div className="flex items-start justify-between mb-1 reveal">
                <div>
                    <div className="text-[10px] tracking-[0.3em] uppercase text-zinc-500 font-mono-tech">Command Center</div>
                    <h1 className="font-display font-black text-3xl text-white tracking-tighter">
                        Olá, <span className="text-red-500">{firstName}.</span>
                    </h1>
                </div>
                <Link to="/profile" className="w-11 h-11 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 ring-1 ring-white/10 flex items-center justify-center text-white font-display font-black text-sm" data-testid="dash-avatar">
                    {firstName.slice(0, 2).toUpperCase()}
                </Link>
            </div>

            <div className="flex items-center gap-2 text-zinc-400 text-sm mb-6 reveal reveal-1">
                <Stars size={14} className="text-yellow-400" />
                <span className="font-bold text-white">{user?.points ?? 0}</span>
                <span>pontos acumulados</span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6 reveal reveal-2">
                <QuickAction to="/calendar" Icon={Calendar} label="Eventos" active />
                <QuickAction to="/map" Icon={Map} label="Mapa" />
                <QuickAction to="/rewards" Icon={Stars} label="Pontos" />
                <QuickAction to="/scout-black" Icon={Trophy} label="Black" gold />
            </div>

            {/* Upcoming events strip */}
            <div className="flex items-end justify-between mb-3 reveal reveal-2">
                <h2 className="font-display font-bold text-white text-lg">Próximos Eventos</h2>
                <Link to="/calendar" className="text-[10px] uppercase tracking-[0.15em] text-red-500 font-bold flex items-center gap-1" data-testid="see-all-events">
                    Ver todos <ArrowRight size={12} />
                </Link>
            </div>
            <div className="-mx-5 px-5 mb-7 flex gap-3 overflow-x-auto scout-scroll pb-1">
                {upcoming.length === 0 && (
                    <div className="text-zinc-600 text-xs uppercase tracking-widest py-8" data-testid="upcoming-empty">
                        Sem eventos aprovados ainda
                    </div>
                )}
                {upcoming.map((e, i) => (
                    <Link
                        key={e.event_id}
                        to={`/events/${e.event_id}`}
                        data-testid={`upcoming-${e.event_id}`}
                        className="flex-shrink-0 w-[240px] rounded-xl overflow-hidden border border-white/5 bg-[#0F0F11] hover:border-white/15 transition reveal"
                        style={{ animationDelay: `${i * 0.05}s` }}
                    >
                        <div className="relative aspect-[5/3]">
                            <img src={e.image} alt={e.title} className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-[9px] font-bold uppercase tracking-wider text-white">
                                {e.type}
                            </div>
                            {e.exclusive && (
                                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full gold-bg text-black text-[9px] font-black uppercase tracking-wider">
                                    Exclusive
                                </div>
                            )}
                        </div>
                        <div className="p-3">
                            <div className="font-display font-bold text-white text-sm truncate">{e.title}</div>
                            <div className="text-[10px] uppercase tracking-[0.15em] text-red-500 font-mono-tech mt-1">
                                {formatDateChip(e.date)} · {e.time_start}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {!user?.is_black && (
                <Link
                    to="/scout-black"
                    className="block relative bg-gradient-to-br from-[#1a1207] via-[#0F0F11] to-[#0a0a0a] border border-[#D4AF37]/30 rounded-2xl p-5 mb-6 overflow-hidden premium-glow reveal reveal-3"
                    data-testid="black-promo"
                >
                    <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#D4AF37]/10 blur-3xl" />
                    <div className="text-[10px] tracking-[0.3em] uppercase gold-shimmer font-bold mb-1">Membro Elite</div>
                    <h3 className="font-display font-bold text-white text-lg leading-tight">
                        Junta-te à Elite. <span className="gold-shimmer">Scout Black</span>
                    </h3>
                    <p className="text-zinc-500 text-xs mt-2 leading-relaxed">
                        Acesso prioritário a eventos, conteúdos exclusivos e parcerias premium de detailing.
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-[#D4AF37] font-bold text-xs">
                        Saber Mais <ArrowRight size={14} />
                    </div>
                </Link>
            )}

            {user?.is_black && (
                <div className="bg-gradient-to-br from-[#D4AF37]/15 to-transparent border border-[#D4AF37]/30 rounded-2xl p-4 mb-6 flex items-center gap-3 reveal reveal-3" data-testid="black-active">
                    <div className="w-12 h-12 rounded-full gold-bg flex items-center justify-center">
                        <Trophy size={20} className="text-black" />
                    </div>
                    <div className="flex-1">
                        <div className="text-[10px] tracking-[0.25em] uppercase font-bold gold-shimmer">SCOUT BLACK ATIVO</div>
                        <div className="text-white font-display text-sm">Acesso VIP desbloqueado</div>
                    </div>
                </div>
            )}

            <div className="flex items-end justify-between mb-3 reveal reveal-3">
                <h2 className="font-display font-bold text-white text-lg">Parcerias Abertas</h2>
                <Link to="/partnerships" className="text-[10px] uppercase tracking-[0.15em] text-red-500 font-bold flex items-center gap-1" data-testid="see-all-partners">
                    Ver mais <ArrowRight size={12} />
                </Link>
            </div>
            <div className="space-y-3 mb-7">
                {partners.map((p, i) => <PartnerRow key={p.partnership_id} p={p} delay={i} />)}
            </div>

            <div className="flex items-end justify-between mb-3">
                <h2 className="font-display font-bold text-white text-lg flex items-center gap-2">
                    Benefícios Elite <Stars size={14} className="text-[#D4AF37]" />
                </h2>
            </div>
            <div className="space-y-3 mb-8">
                {blackPartners.map((p) => <PartnerRow key={p.partnership_id} p={p} locked={!user?.is_black} elite />)}
            </div>
        </div>
    );
}

function QuickAction({ to, Icon, label, active, gold }) {
    return (
        <Link
            to={to}
            className={`relative flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl border transition ${
                gold
                    ? "bg-gradient-to-br from-[#D4AF37]/15 to-[#D4AF37]/5 border-[#D4AF37]/30 text-[#F3E5AB] hover:border-[#D4AF37]/60"
                    : active
                      ? "bg-red-600/10 border-red-500/30 text-white"
                      : "bg-[#0F0F11] border-white/5 text-zinc-300 hover:border-white/15"
            }`}
            data-testid={`quick-${label.toLowerCase()}`}
        >
            <Icon size={18} />
            <span className="text-[10px] uppercase tracking-[0.1em] font-bold">{label}</span>
        </Link>
    );
}

function PartnerRow({ p, locked, elite, delay = 0 }) {
    return (
        <Link
            to={`/partnerships/${p.partnership_id}`}
            className={`flex items-center gap-3 bg-[#0F0F11] border ${elite ? "border-[#D4AF37]/20" : "border-white/5"} rounded-xl p-3 hover:border-white/15 transition reveal`}
            style={{ animationDelay: `${0.1 + delay * 0.05}s` }}
            data-testid={`partner-${p.partnership_id}`}
        >
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${elite ? "bg-[#D4AF37]/15 text-[#D4AF37]" : "bg-white/5 text-red-500"}`}>
                <PartnerIcon name={p.icon} size={20} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm truncate">{p.name}</div>
                <div className={`text-[10px] uppercase tracking-[0.15em] font-bold ${elite ? "text-[#D4AF37]" : "text-zinc-500"}`}>
                    {p.discount}
                </div>
            </div>
            {locked ? (
                <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#D4AF37]/60">Bloqueado</span>
            ) : (
                <ChevronRight size={16} className="text-zinc-500" />
            )}
        </Link>
    );
}

function formatDateChip(iso) {
    const d = new Date(iso);
    const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    return `${d.getDate()} ${months[d.getMonth()]}`;
}
