import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import TopBar from "../components/TopBar";
import { ChevronLeft, ChevronRight, Pin, ArrowRight } from "../components/Icons";

const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DOW_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export default function CalendarScreen() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [cursor, setCursor] = useState(new Date(2024, 9, 1)); // October 2024 to match seed
    const [selected, setSelected] = useState(new Date(2024, 9, 9));

    useEffect(() => {
        api.get("/events").then(({ data }) => setEvents(data));
    }, []);

    const eventsByDate = useMemo(() => {
        const m = {};
        for (const e of events) {
            (m[e.date] ||= []).push(e);
        }
        return m;
    }, [events]);

    const grid = useMemo(() => {
        const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const startDow = first.getDay(); // 0..6 Sun..Sat
        const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
        const cells = [];
        // prev month padding
        for (let i = 0; i < startDow; i++) {
            const d = new Date(first);
            d.setDate(d.getDate() - (startDow - i));
            cells.push({ d, outside: true });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            cells.push({ d: new Date(cursor.getFullYear(), cursor.getMonth(), i), outside: false });
        }
        while (cells.length < 42) {
            const last = cells[cells.length - 1].d;
            const d = new Date(last);
            d.setDate(d.getDate() + 1);
            cells.push({ d, outside: true });
        }
        return cells;
    }, [cursor]);

    const dayEvents = eventsByDate[formatDate(selected)] || [];

    return (
        <div data-testid="calendar-screen">
            <TopBar title="CALENDÁRIO" subtitle="Schedule & Expeditions" onBack={false} />

            <div className="px-5 pt-5">
                <div className="flex items-center justify-between mb-5">
                    <button
                        onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                        className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
                        data-testid="cal-prev"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <div className="text-center">
                        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-mono-tech">
                            {cursor.getFullYear()}
                        </div>
                        <div className="font-display font-black text-2xl text-white tracking-tighter">
                            {MONTHS_PT[cursor.getMonth()].toUpperCase()}
                        </div>
                    </div>
                    <button
                        onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                        className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
                        data-testid="cal-next"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                    {DOW_PT.map((d) => (
                        <div key={d} className="text-center text-[10px] uppercase tracking-widest text-zinc-600 font-mono-tech">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {grid.map(({ d, outside }, i) => {
                        const k = formatDate(d);
                        const has = !!eventsByDate[k];
                        const isSel = formatDate(selected) === k;
                        return (
                            <button
                                key={i}
                                onClick={() => setSelected(d)}
                                data-testid={`cal-day-${k}`}
                                className={`relative h-11 rounded-lg text-sm font-bold flex items-center justify-center transition ${
                                    isSel
                                        ? "bg-red-600 text-white shadow-[0_0_20px_rgba(229,57,53,0.4)]"
                                        : outside
                                          ? "text-zinc-700"
                                          : "text-white hover:bg-white/5"
                                }`}
                            >
                                {d.getDate()}
                                {has && !isSel && (
                                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="px-5 mt-7">
                <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-mono-tech mb-1">
                    {DOW_PT[selected.getDay()]}, {selected.getDate()} {MONTHS_PT[selected.getMonth()].slice(0, 3)}
                </div>
                <h2 className="font-display font-bold text-white text-xl mb-4">
                    {dayEvents.length} {dayEvents.length === 1 ? "Evento" : "Eventos"}
                </h2>

                {dayEvents.length === 0 && (
                    <div className="text-center text-zinc-600 text-xs uppercase tracking-widest py-10" data-testid="calendar-empty">
                        Sem eventos neste dia
                    </div>
                )}

                <div className="space-y-3">
                    {dayEvents.map((e, i) => (
                        <button
                            key={e.event_id}
                            onClick={() => navigate(`/events/${e.event_id}`)}
                            data-testid={`cal-event-${e.event_id}`}
                            className="w-full flex gap-3 bg-[#0F0F11] border border-white/5 rounded-xl overflow-hidden hover:border-white/15 transition reveal text-left"
                            style={{ animationDelay: `${i * 0.05}s` }}
                        >
                            <img src={e.image} alt="" className="w-24 h-24 object-cover" />
                            <div className="flex-1 py-2.5 pr-3 min-w-0">
                                <div className="text-[10px] uppercase tracking-[0.2em] text-red-500 font-mono-tech">
                                    {e.time_start} — {e.time_end}
                                </div>
                                <div className="font-display font-bold text-white text-sm truncate">{e.title}</div>
                                <div className="flex items-center gap-1 text-zinc-500 text-[11px] mt-1 truncate">
                                    <Pin size={10} /> {e.location_name}
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-zinc-600 self-center mr-3" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
