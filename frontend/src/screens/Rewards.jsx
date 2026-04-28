import { useEffect, useState } from "react";
import Barcode from "react-barcode";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import TopBar from "../components/TopBar";
import { Stars, Trophy, Camera, Wrench, ArrowRight, Check, X, Plus, Speed } from "../components/Icons";

const ICONS = {
    ticket: Plus,
    camera: Camera,
    stars: Stars,
    trophy: Trophy,
    wrench: Wrench,
};

const EARN_ACTIONS = [
    { label: "Reservar evento", points: 50, Icon: Trophy, desc: "Reserva confirmada num evento aprovado" },
    { label: "Confirmar presença", points: 10, Icon: Check, desc: "Marcar 'Eu Vou' num evento" },
    { label: "Comprar foto", points: 20, Icon: Camera, desc: "Compra de foto no Galeria" },
    { label: "Submissão aprovada", points: 200, Icon: Plus, desc: "Quando o teu evento é aprovado pela equipa" },
    { label: "Subscrever Scout Black", points: 500, Icon: Stars, desc: "Bónus único ao tornares-te BLACK" },
];

export default function Rewards() {
    const { user, refresh } = useAuth();
    const [catalog, setCatalog] = useState([]);
    const [history, setHistory] = useState([]);
    const [active, setActive] = useState(null);
    const [tab, setTab] = useState("spend");

    const load = async () => {
        const [{ data: c }, { data: h }] = await Promise.all([
            api.get("/rewards/catalog"),
            api.get("/rewards/me"),
        ]);
        setCatalog(c);
        setHistory(h);
    };

    useEffect(() => { load(); }, []);

    const redeem = async (rw) => {
        if (!confirm(`Trocar ${rw.cost} pts por "${rw.title}"?`)) return;
        try {
            const { data } = await api.post(`/rewards/${rw.reward_id}/redeem`);
            await refresh();
            await load();
            setActive(data);
        } catch (e) {
            alert(formatApiErrorDetail(e.response?.data?.detail));
        }
    };

    return (
        <div data-testid="rewards-screen">
            <TopBar title="RECOMPENSAS" subtitle="Earn & Spend" />

            {/* Balance */}
            <div className="px-5 pt-5">
                <div className="bg-gradient-to-br from-red-600/15 via-[#0F0F11] to-[#0F0F11] border border-red-500/25 rounded-2xl p-5">
                    <div className="flex items-baseline justify-between">
                        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 font-mono-tech">Saldo</div>
                        <Stars size={16} className="text-yellow-400" />
                    </div>
                    <div className="font-display font-black text-4xl text-white tracking-tighter mt-1">{user?.points ?? 0} <span className="text-lg text-zinc-500">pts</span></div>
                </div>
            </div>

            <div className="px-5 mt-5">
                <div className="flex gap-1 bg-[#0F0F11] border border-white/5 rounded-full p-1 mb-4">
                    {[
                        { id: "spend", label: "Gastar" },
                        { id: "earn", label: "Ganhar" },
                        { id: "history", label: `Histórico (${history.length})` },
                    ].map((t) => (
                        <button key={t.id} onClick={() => setTab(t.id)} data-testid={`rewards-tab-${t.id}`}
                            className={`flex-1 h-9 rounded-full text-[11px] font-bold uppercase tracking-wider transition ${
                                tab === t.id ? "bg-red-600 text-white" : "text-zinc-400"
                            }`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === "spend" && (
                    <div className="space-y-3 mb-8" data-testid="rewards-spend">
                        {catalog.map((rw) => {
                            const Icon = ICONS[rw.icon] || Trophy;
                            const can = (user?.points ?? 0) >= rw.cost;
                            return (
                                <div key={rw.reward_id} className="bg-[#0F0F11] border border-white/5 rounded-xl p-4" data-testid={`reward-${rw.reward_id}`}>
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-lg bg-red-500/15 text-red-500 flex items-center justify-center flex-shrink-0">
                                            <Icon size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-white text-sm">{rw.title}</div>
                                            <div className="text-zinc-500 text-[11px] leading-relaxed mt-0.5">{rw.description}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-display font-black text-white">{rw.cost}</div>
                                            <div className="text-[9px] uppercase tracking-widest text-zinc-500 font-mono-tech">PTS</div>
                                        </div>
                                    </div>
                                    <button onClick={() => redeem(rw)} disabled={!can} data-testid={`redeem-${rw.reward_id}`}
                                        className={`w-full h-10 rounded-md font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1 transition ${
                                            can
                                                ? "bg-red-600 hover:bg-red-500 text-white"
                                                : "bg-white/5 border border-white/5 text-zinc-600 cursor-not-allowed"
                                        }`}>
                                        {can ? "Trocar Pontos" : `Faltam ${rw.cost - (user?.points ?? 0)} pts`}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {tab === "earn" && (
                    <div className="space-y-2 mb-8" data-testid="rewards-earn">
                        {EARN_ACTIONS.map((a, i) => (
                            <div key={i} className="bg-[#0F0F11] border border-white/5 rounded-xl p-3 flex items-center gap-3" data-testid={`earn-${i}`}>
                                <div className="w-10 h-10 rounded-lg bg-green-500/15 text-green-400 flex items-center justify-center flex-shrink-0">
                                    <a.Icon size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-white text-sm">{a.label}</div>
                                    <div className="text-zinc-500 text-[11px]">{a.desc}</div>
                                </div>
                                <div className="text-green-400 font-bold text-sm flex items-center gap-1">
                                    +{a.points}
                                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-mono-tech">pts</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === "history" && (
                    <div className="space-y-2 mb-8" data-testid="rewards-history">
                        {history.length === 0 && (
                            <div className="text-center text-zinc-600 text-xs uppercase tracking-widest py-12">
                                Ainda não trocaste nenhum prémio
                            </div>
                        )}
                        {history.map((r) => (
                            <button key={r.redemption_id} onClick={() => setActive(r)} data-testid={`history-${r.redemption_id}`}
                                className="w-full text-left bg-[#0F0F11] border border-white/5 rounded-xl p-3 flex items-center gap-3 hover:border-white/15">
                                <div className="w-10 h-10 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center"><Stars size={14} /></div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-white text-sm truncate">{r.title}</div>
                                    <div className="text-zinc-500 text-[11px] font-mono-tech">{r.code}</div>
                                </div>
                                <div className="text-zinc-500 text-xs">-{r.cost}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {active && <RedemptionModal r={active} onClose={() => setActive(null)} />}
        </div>
    );
}

function RedemptionModal({ r, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={onClose} data-testid="redemption-modal">
            <div className="w-full max-w-[430px] bg-[#0a0a0a] rounded-t-3xl border-t border-white/10 p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-red-500 font-mono-tech">Recompensa Resgatada</div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center" data-testid="close-redemption">
                        <X size={14} />
                    </button>
                </div>
                <h3 className="font-display font-black text-white text-xl tracking-tight mb-1">{r.title}</h3>
                <p className="text-zinc-500 text-xs mb-4">Mostra este código no estabelecimento para usar.</p>

                <div className="bg-white rounded-xl p-4">
                    <div className="flex items-center justify-center mb-2">
                        <Barcode value={r.code} height={70} width={1.6} fontSize={10} margin={0} background="#ffffff" lineColor="#000000" />
                    </div>
                    <div className="text-center text-zinc-700 text-[10px] font-mono-tech tracking-widest">{r.code}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                    <div>
                        <div className="text-zinc-500 uppercase tracking-widest text-[9px] font-mono-tech">Custo</div>
                        <div className="text-white font-bold">{r.cost} pts</div>
                    </div>
                    <div>
                        <div className="text-zinc-500 uppercase tracking-widest text-[9px] font-mono-tech">Estado</div>
                        <div className="text-green-400 font-bold uppercase">{r.status}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
