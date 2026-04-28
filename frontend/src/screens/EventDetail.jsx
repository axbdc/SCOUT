import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import TopBar from "../components/TopBar";
import { Calendar, Pin, Speed, Share, Star, Stars, NavigateTo, ArrowLeft, Camera, Globe } from "../components/Icons";

export default function EventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ev, setEv] = useState(null);
    const [booking, setBooking] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get(`/events/${id}`).then(({ data }) => setEv(data)).catch(() => navigate("/calendar"));
    }, [id, navigate]);

    if (!ev) return <div className="text-zinc-500 text-center py-20 font-mono-tech text-xs uppercase tracking-widest">Carregando...</div>;

    const filled = Math.round(((ev.spots_total - ev.spots_left) / ev.spots_total) * 100);

    const book = async () => {
        setBooking(true);
        setError("");
        try {
            const { data } = await api.post(`/events/${ev.event_id}/book`);
            setSuccess(data);
            const { data: refreshed } = await api.get(`/events/${id}`);
            setEv(refreshed);
        } catch (e) {
            setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
        } finally {
            setBooking(false);
        }
    };

    return (
        <div data-testid="event-detail">
            <div className="relative h-[280px]">
                <img src={ev.image} alt={ev.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white"
                    data-testid="event-back"
                >
                    <ArrowLeft size={18} />
                </button>
                <button
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white"
                    data-testid="event-share"
                >
                    <Share size={16} />
                </button>
                {ev.exclusive && (
                    <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full gold-bg text-black text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <Stars size={12} /> Exclusive Edition
                    </div>
                )}
            </div>

            <div className="px-5 -mt-8 relative z-10">
                <div className="text-[10px] uppercase tracking-[0.3em] text-red-500 font-mono-tech">{ev.type}</div>
                <h1 className="font-display font-black text-2xl text-white tracking-tight leading-tight mt-1">
                    {ev.title}
                </h1>

                <div className="grid grid-cols-3 gap-3 mt-6">
                    <Stat Icon={Calendar} label="Data" value={formatDatePT(ev.date)} />
                    <Stat Icon={Speed} label="Horário" value={`${ev.time_start} - ${ev.time_end}`} />
                    <Stat Icon={Pin} label="Local" value={ev.location_name.split(",")[0]} />
                </div>

                <div className="bg-[#0F0F11] border border-white/5 rounded-2xl p-5 mt-6">
                    <div className="flex items-baseline justify-between mb-3">
                        <h3 className="font-display font-bold text-white">Disponibilidade de Pista</h3>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono-tech">
                            {ev.spots_total - ev.spots_left}/{ev.spots_total}
                        </span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all" style={{ width: `${filled}%` }} />
                    </div>
                    <div className="text-zinc-500 text-xs">
                        {ev.spots_left > 0 ? (
                            <>
                                <span className="text-white font-bold">{ev.spots_left}</span> vagas restantes
                            </>
                        ) : (
                            <span className="text-red-500 font-bold uppercase tracking-wider">Esgotado</span>
                        )}
                    </div>
                </div>

                <div className="mt-6">
                    <h3 className="font-display font-bold text-white text-base mb-2">Sobre o Evento</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">{ev.description}</p>
                </div>

                {ev.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                        {ev.tags.map((t) => (
                            <span key={t} className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] uppercase tracking-[0.2em] text-zinc-300 font-bold">
                                {t}
                            </span>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 mt-6">
                    <button
                        className="h-12 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                        data-testid="event-navigate"
                        onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${ev.lat}&mlon=${ev.lng}#map=15/${ev.lat}/${ev.lng}`, "_blank")}
                    >
                        <NavigateTo size={14} /> Levar-me
                    </button>
                    <button
                        className="h-12 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                        data-testid="event-add-cal"
                    >
                        <Calendar size={14} /> Adicionar
                    </button>
                </div>

                <div className="mt-6 bg-[#0F0F11] border border-white/5 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center">
                        <Star size={18} />
                    </div>
                    <div className="flex-1">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono-tech">Organizado por</div>
                        <div className="font-bold text-white text-sm">{ev.organizer}</div>
                    </div>
                    <button className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-zinc-300" data-testid="organizer-photo">
                        <Camera size={14} />
                    </button>
                    <button className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-zinc-300" data-testid="organizer-web">
                        <Globe size={14} />
                    </button>
                </div>

                {error && (
                    <div className="mt-4 text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded" data-testid="booking-error">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mt-4 bg-green-600/10 border border-green-500/30 rounded-xl p-4 text-green-400 text-sm" data-testid="booking-success">
                        <div className="font-display font-bold text-base">Reserva confirmada!</div>
                        <div className="text-xs mt-1">+{success.points_earned} pts SCOUT · ID: <span className="font-mono-tech">{success.booking_id}</span></div>
                    </div>
                )}

                <button
                    onClick={book}
                    disabled={booking || ev.spots_left <= 0 || !!success}
                    data-testid="book-event-btn"
                    className="w-full h-14 mt-6 mb-8 rounded-md bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition shadow-[0_0_30px_rgba(229,57,53,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Speed size={16} />
                    {success ? "Reservado" : ev.spots_left <= 0 ? "Esgotado" : booking ? "A reservar..." : ev.price > 0 ? `Reservar · €${ev.price}` : "Reservar Entrada"}
                </button>
            </div>
        </div>
    );
}

function Stat({ Icon, label, value }) {
    return (
        <div className="bg-[#0F0F11] border border-white/5 rounded-xl p-3 text-center">
            <Icon size={14} className="mx-auto text-red-500 mb-1.5" />
            <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-mono-tech">{label}</div>
            <div className="text-white text-xs font-bold mt-0.5 truncate">{value}</div>
        </div>
    );
}

function formatDatePT(iso) {
    const d = new Date(iso);
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}
