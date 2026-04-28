import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { Calendar, Pin, Speed, Share, Star, Stars, NavigateTo, ArrowLeft, Camera, Globe, Heart, Lock, Check } from "../components/Icons";

const TABS = ["overview", "gallery"];

export default function EventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ev, setEv] = useState(null);
    const [tab, setTab] = useState("overview");
    const [booking, setBooking] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState("");
    const [favorite, setFavorite] = useState(false);
    const [photos, setPhotos] = useState([]);
    const [purchasing, setPurchasing] = useState(null);
    const [attending, setAttending] = useState(false);
    const [attendCount, setAttendCount] = useState(0);
    const [showShare, setShowShare] = useState(false);

    useEffect(() => {
        api.get(`/events/${id}`).then(({ data }) => setEv(data)).catch(() => navigate("/calendar"));
        api.get("/favorites/me").then(({ data }) => setFavorite(data.some((e) => e.event_id === id)));
        api.get(`/events/${id}/photos`).then(({ data }) => setPhotos(data)).catch(() => {});
        api.get(`/events/${id}/attendance`).then(({ data }) => {
            setAttending(data.attending);
            setAttendCount(data.count);
        }).catch(() => {});
    }, [id, navigate]);

    if (!ev) return <div className="text-zinc-500 text-center py-20 font-mono-tech text-xs uppercase tracking-widest">A carregar...</div>;

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

    const toggleFav = async () => {
        try {
            if (favorite) await api.delete(`/favorites/${id}`);
            else await api.post(`/favorites/${id}`);
            setFavorite(!favorite);
        } catch {}
    };

    const buyPhoto = async (photoId) => {
        setPurchasing(photoId);
        try {
            await api.post(`/photos/${photoId}/buy`);
            const { data } = await api.get(`/events/${id}/photos`);
            setPhotos(data);
        } catch (e) {
            alert(formatApiErrorDetail(e.response?.data?.detail) || e.message);
        } finally {
            setPurchasing(null);
        }
    };

    const exportIcs = () => {
        const dt = ev.date.replace(/-/g, "");
        const tStart = ev.time_start.replace(":", "") + "00";
        const tEnd = ev.time_end.replace(":", "") + "00";
        const ics = [
            "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SCOUT//EN", "BEGIN:VEVENT",
            `UID:${ev.event_id}@scout.pt`,
            `DTSTART:${dt}T${tStart}`, `DTEND:${dt}T${tEnd}`,
            `SUMMARY:${ev.title}`, `LOCATION:${ev.location_name}`,
            `DESCRIPTION:${ev.description.replace(/\n/g, "\\n")}`,
            "END:VEVENT", "END:VCALENDAR",
        ].join("\r\n");
        const blob = new Blob([ics], { type: "text/calendar" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${ev.event_id}.ics`; a.click();
        URL.revokeObjectURL(url);
    };

    const shareEvent = () => {
        setShowShare(true);
    };

    const toggleAttend = async () => {
        try {
            const { data } = await api.post(`/events/${id}/attend`);
            setAttending(data.attending);
            setAttendCount((c) => c + (data.attending ? 1 : -1));
        } catch (e) {
            alert(formatApiErrorDetail(e.response?.data?.detail) || e.message);
        }
    };

    return (
        <div data-testid="event-detail">
            <div className="relative h-[260px]">
                <img src={ev.image} alt={ev.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black" />
                <button onClick={() => navigate(-1)} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white" data-testid="event-back">
                    <ArrowLeft size={18} />
                </button>
                <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={toggleFav} className="w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white" data-testid="event-favorite">
                        <Heart size={16} className={favorite ? "fill-red-500 text-red-500" : ""} />
                    </button>
                    <button onClick={shareEvent} className="w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white" data-testid="event-share">
                        <Share size={16} />
                    </button>
                </div>
                {ev.exclusive && (
                    <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full gold-bg text-black text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <Stars size={12} /> Exclusive Edition
                    </div>
                )}
            </div>

            <div className="px-5 -mt-8 relative z-10">
                <div className="text-[10px] uppercase tracking-[0.3em] text-red-500 font-mono-tech">{ev.type}</div>
                <h1 className="font-display font-black text-2xl text-white tracking-tight leading-tight mt-1">{ev.title}</h1>

                {/* Tab switcher */}
                <div className="flex gap-1 bg-[#0F0F11] border border-white/5 rounded-full p-1 mt-5">
                    {TABS.map((t) => (
                        <button key={t} onClick={() => setTab(t)} data-testid={`tab-${t}`}
                            className={`flex-1 h-9 rounded-full text-[11px] font-bold uppercase tracking-wider transition ${
                                tab === t ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"
                            }`}>
                            {t === "overview" ? "Detalhes" : `Galeria (${photos.length})`}
                        </button>
                    ))}
                </div>

                {tab === "overview" && (
                    <>
                        <div className="grid grid-cols-3 gap-3 mt-5">
                            <Stat Icon={Calendar} label="Data" value={formatDatePT(ev.date)} />
                            <Stat Icon={Speed} label="Horário" value={`${ev.time_start}-${ev.time_end}`} />
                            <Stat Icon={Pin} label="Local" value={ev.location_name.split(",")[0]} />
                        </div>

                        <div className="bg-[#0F0F11] border border-white/5 rounded-2xl p-5 mt-5">
                            <div className="flex items-baseline justify-between mb-3">
                                <h3 className="font-display font-bold text-white">Disponibilidade</h3>
                                <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono-tech">
                                    {ev.spots_total - ev.spots_left}/{ev.spots_total}
                                </span>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                                <div className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all" style={{ width: `${filled}%` }} />
                            </div>
                            <div className="text-zinc-500 text-xs">
                                {ev.spots_left > 0 ? <><span className="text-white font-bold">{ev.spots_left}</span> vagas restantes</> : <span className="text-red-500 font-bold uppercase tracking-wider">Esgotado</span>}
                            </div>
                        </div>

                        <div className="mt-5">
                            <h3 className="font-display font-bold text-white text-base mb-2">Sobre o Evento</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed">{ev.description}</p>
                        </div>

                        {ev.categories?.length > 0 && (
                            <div className="mt-4">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono-tech mb-2">Categorias</div>
                                <div className="flex flex-wrap gap-2">
                                    {ev.categories.map((c) => (
                                        <span key={c} className="px-3 py-1 rounded-full bg-red-600/15 border border-red-500/30 text-[10px] uppercase tracking-[0.2em] text-red-400 font-bold">{c}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 mt-5">
                            <button onClick={() => window.open(`https://www.openstreetmap.org/?mlat=${ev.lat}&mlon=${ev.lng}#map=15/${ev.lat}/${ev.lng}`, "_blank")} className="h-12 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2" data-testid="event-navigate">
                                <NavigateTo size={14} /> Levar-me
                            </button>
                            <button onClick={exportIcs} className="h-12 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2" data-testid="event-add-cal">
                                <Calendar size={14} /> Adicionar
                            </button>
                        </div>

                        <div className="mt-5 bg-[#0F0F11] border border-white/5 rounded-xl p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center"><Star size={18} /></div>
                            <div className="flex-1">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono-tech">Organizado por</div>
                                <div className="font-bold text-white text-sm">{ev.organizer}</div>
                            </div>
                        </div>

                        {/* "Eu Vou" attendance */}
                        <div className="mt-4 bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/25 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="text-[10px] uppercase tracking-[0.25em] text-blue-300/70 font-mono-tech">Quem Vai</div>
                                    <div className="font-display font-black text-2xl text-white">{attendCount} <span className="text-base text-zinc-500 font-normal">{attendCount === 1 ? "pessoa" : "pessoas"}</span></div>
                                </div>
                                <button
                                    onClick={toggleAttend}
                                    data-testid="event-attend-btn"
                                    className={`h-11 px-5 rounded-md text-xs font-display font-bold uppercase tracking-widest transition flex items-center gap-2 ${
                                        attending
                                            ? "bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                                    }`}
                                >
                                    {attending ? <><Check size={14} strokeWidth={3} /> Vou</> : <>Eu Vou</>}
                                </button>
                            </div>
                            <div className="text-zinc-500 text-[11px] leading-relaxed">
                                Marca presença para ganhares <span className="text-green-400 font-bold">+10 pts</span> e ajudar a comunidade a saber a dimensão do evento.
                            </div>
                        </div>

                        {error && <div className="mt-4 text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded" data-testid="booking-error">{error}</div>}
                        {success && (
                            <div className="mt-4 bg-green-600/10 border border-green-500/30 rounded-xl p-4 text-green-400 text-sm" data-testid="booking-success">
                                <div className="font-display font-bold text-base">Reserva confirmada!</div>
                                <div className="text-xs mt-1">+{success.points_earned} pts SCOUT · ID: <span className="font-mono-tech">{success.booking_id}</span></div>
                            </div>
                        )}

                        <button onClick={book} disabled={booking || ev.spots_left <= 0 || !!success} data-testid="book-event-btn"
                            className="w-full h-14 mt-5 mb-8 rounded-md bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition shadow-[0_0_30px_rgba(229,57,53,0.4)] disabled:opacity-50 disabled:cursor-not-allowed">
                            <Speed size={16} />
                            {success ? "Reservado" : ev.spots_left <= 0 ? "Esgotado" : booking ? "A reservar..." : ev.price > 0 ? `Reservar · €${ev.price}` : "Reservar Entrada"}
                        </button>
                    </>
                )}

                {tab === "gallery" && (
                    <div className="mt-5 mb-8" data-testid="gallery-tab">
                        <div className="bg-[#0F0F11] border border-white/5 rounded-xl p-4 mb-4 flex items-start gap-3">
                            <Camera size={16} className="text-red-500 mt-0.5" />
                            <div className="text-zinc-400 text-xs leading-relaxed">
                                Fotos oficiais do evento por <b className="text-white">fotógrafos parceiros (FPAK)</b>. Compra a foto do teu carro para receber a versão sem marca-de-água em alta resolução.
                            </div>
                        </div>

                        {photos.length === 0 && (
                            <div className="text-center text-zinc-600 text-xs uppercase tracking-widest py-12" data-testid="gallery-empty">
                                Galeria ainda vazia
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            {photos.map((p) => (
                                <div key={p.photo_id} className="relative rounded-xl overflow-hidden border border-white/5 bg-[#0F0F11] group" data-testid={`photo-${p.photo_id}`}>
                                    <div className="relative aspect-[4/5] overflow-hidden">
                                        <img src={p.image_url} alt="" className={`absolute inset-0 w-full h-full object-cover ${!p.purchased ? "blur-[1.5px]" : ""}`} />
                                        {!p.purchased && (
                                            <>
                                                <div className="absolute inset-0 bg-black/30" />
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <div
                                                        className="font-display font-black text-white/40 text-3xl tracking-[0.2em] rotate-[-25deg] select-none"
                                                        style={{
                                                            textShadow: "0 1px 0 #000, 0 0 20px rgba(0,0,0,0.6)",
                                                        }}
                                                    >
                                                        SCOUT
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        {p.purchased && (
                                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-green-500 text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                                <Check size={10} strokeWidth={3} /> COMPRADA
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <div className="font-bold text-white text-xs truncate">{p.car_label || "Sem identificação"}</div>
                                        <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-mono-tech mt-0.5">{p.photographer_name}</div>
                                        {p.purchased ? (
                                            <a href={p.image_url} target="_blank" rel="noopener noreferrer" className="mt-2 w-full h-9 rounded-md bg-green-600/15 border border-green-500/30 text-green-400 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                                                Descarregar HD
                                            </a>
                                        ) : (
                                            <button onClick={() => buyPhoto(p.photo_id)} disabled={purchasing === p.photo_id} className="mt-2 w-full h-9 rounded-md bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 disabled:opacity-60" data-testid={`buy-photo-${p.photo_id}`}>
                                                {purchasing === p.photo_id ? "..." : <>Comprar · €{p.price}</>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {showShare && <ShareSheet ev={ev} onClose={() => setShowShare(false)} />}
        </div>
    );
}

function ShareSheet({ ev, onClose }) {
    const url = window.location.href;
    const message = `Vamos a este evento? "${ev.title}" — ${ev.date} em ${ev.location_name}. Mais info na app SCOUT: ${url}`;
    const channels = [
        { id: "whatsapp", label: "WhatsApp", color: "bg-green-600", href: `https://wa.me/?text=${encodeURIComponent(message)}` },
        { id: "telegram", label: "Telegram", color: "bg-sky-500", href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(ev.title)}` },
        { id: "email", label: "Email", color: "bg-zinc-700", href: `mailto:?subject=${encodeURIComponent(ev.title)}&body=${encodeURIComponent(message)}` },
        { id: "x", label: "X / Twitter", color: "bg-black border border-white/20", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}` },
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={onClose} data-testid="share-sheet">
            <div className="w-full max-w-[430px] bg-[#0a0a0a] rounded-t-3xl border-t border-white/10 p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <div className="font-display font-bold text-white text-lg">Partilhar Evento</div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center" data-testid="close-share">
                        <ArrowLeft size={14} />
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {channels.map((c) => (
                        <a key={c.id} href={c.href} target="_blank" rel="noopener noreferrer"
                            data-testid={`share-${c.id}`}
                            className={`h-14 rounded-xl ${c.color} text-white font-display font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:opacity-90`}>
                            {c.label}
                        </a>
                    ))}
                </div>
                <button
                    onClick={() => { navigator.clipboard.writeText(url); alert("Link copiado!"); }}
                    data-testid="share-copy"
                    className="w-full h-12 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold uppercase tracking-widest text-xs"
                >
                    Copiar Link
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
