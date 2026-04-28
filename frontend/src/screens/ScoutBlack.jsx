import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import TopBar from "../components/TopBar";
import { Stars, Trophy, Camera, Speed, Sparkles, ChevronRight, PartnerIcon } from "../components/Icons";

const PERKS = [
    { Icon: Trophy, title: "Acesso VIP", desc: "Prioridade em eventos e acesso antecipado de 48h." },
    { Icon: Stars, title: "Eventos Privados", desc: "Convites para encontros e ralis 100% privados." },
    { Icon: Camera, title: "Lente Prioritária", desc: "Fotógrafo oficial foca o teu carro. Fotos HD garantidas." },
    { Icon: Sparkles, title: "Parcerias Premium", desc: "Detailing, seguros e logística com descontos exclusivos." },
];

export default function ScoutBlack() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [partners, setPartners] = useState([]);

    useEffect(() => {
        api.get("/partnerships?tier=black").then(({ data }) => setPartners(data));
    }, []);

    return (
        <div className="relative" data-testid="scout-black-screen">
            <TopBar title="SCOUT BLACK" subtitle="The Inner Circle" />

            {/* 3D Premium Card */}
            <div className="px-5 pt-6 pb-8 flex justify-center">
                <PremiumCard userName={user?.name} licenseId={user?.license_id} active={user?.is_black} />
            </div>

            <div className="px-5 -mt-2 text-center">
                <div className="text-[10px] uppercase tracking-[0.4em] gold-shimmer font-bold mb-2">Exclusive Tier</div>
                <h1 className="font-display font-black text-3xl text-white tracking-tighter">
                    SCOUT <span className="gold-shimmer">BLACK</span>
                </h1>
                <p className="text-zinc-300 text-xs mt-2 max-w-[300px] mx-auto">
                    O círculo restrito da cultura automóvel em Portugal.
                </p>
            </div>

            {user?.is_black && (
                <div className="px-5 pt-5">
                    <div className="bg-gradient-to-br from-[#D4AF37]/20 to-transparent border border-[#D4AF37]/40 rounded-2xl p-5 text-center" data-testid="black-active-banner">
                        <Stars size={24} className="mx-auto text-[#D4AF37] mb-2" />
                        <div className="font-display font-bold text-white text-lg">Acesso BLACK Ativo</div>
                        <div className="text-zinc-400 text-xs mt-1">Aproveita os teus benefícios exclusivos.</div>
                    </div>
                </div>
            )}

            <div className="px-5 pt-6 grid grid-cols-2 gap-3">
                {PERKS.map(({ Icon, title, desc }) => (
                    <div key={title} className="bg-[#0F0F11] border border-[#D4AF37]/20 rounded-xl p-4 reveal">
                        <Icon size={20} className="text-[#D4AF37] mb-2" />
                        <div className="font-bold text-white text-sm">{title}</div>
                        <div className="text-zinc-500 text-[11px] mt-1 leading-snug">{desc}</div>
                    </div>
                ))}
            </div>

            <div className="px-5 mt-7">
                <h3 className="font-display font-bold text-white text-base mb-3 flex items-center gap-2">
                    Parcerias <span className="gold-shimmer">BLACK</span>
                </h3>
                <div className="space-y-3">
                    {partners.map((p) => (
                        <div key={p.partnership_id} className="flex items-center gap-3 bg-[#0F0F11] border border-[#D4AF37]/15 rounded-xl p-3" data-testid={`black-partner-${p.partnership_id}`}>
                            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center">
                                <PartnerIcon name={p.icon} size={18} />
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-white text-sm">{p.name}</div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] font-bold">{p.discount}</div>
                            </div>
                            <ChevronRight size={14} className="text-zinc-600" />
                        </div>
                    ))}
                </div>
            </div>

            {!user?.is_black && (
                <div className="px-5 mt-8 mb-8">
                    <div className="bg-gradient-to-br from-[#D4AF37]/15 to-[#D4AF37]/5 border border-[#D4AF37]/40 rounded-2xl p-5 premium-glow">
                        <div className="text-center">
                            <div className="text-[10px] uppercase tracking-[0.3em] gold-shimmer font-bold mb-1">Torna-te Membro</div>
                            <div className="font-display font-black text-3xl text-white">€39,99<span className="text-base text-zinc-500 font-normal">/mês</span></div>
                            <div className="text-zinc-400 text-xs mt-1">ou <span className="text-white font-bold">€290/ano</span> · poupa 2 meses</div>
                        </div>
                        <button onClick={() => navigate("/checkout")} data-testid="subscribe-btn"
                            className="w-full h-14 mt-4 rounded-md gold-bg text-black font-display font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition shadow-[0_0_40px_rgba(212,175,55,0.3)]">
                            <Speed size={16} /> Subscrever Agora
                        </button>
                        <div className="text-center text-zinc-500 text-[11px] mt-3">Cancelamento imediato sem fidelização</div>
                    </div>
                </div>
            )}
        </div>
    );
}

/** 3D-tilting premium card. Pure CSS perspective — light, no three.js. */
function PremiumCard({ userName, licenseId, active }) {
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    return (
        <div
            className="relative w-[300px] h-[180px]"
            style={{ perspective: "1000px" }}
            onMouseMove={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5;
                const py = (e.clientY - r.top) / r.height - 0.5;
                setTilt({ x: -py * 14, y: px * 14 });
            }}
            onMouseLeave={() => setTilt({ x: 0, y: 0 })}
            data-testid="premium-card-3d"
        >
            <div
                className="absolute inset-0 rounded-2xl transition-transform duration-300 ease-out"
                style={{
                    transformStyle: "preserve-3d",
                    transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                    background:
                        "linear-gradient(135deg, #0a0a0a 0%, #1a1a1c 30%, #0F0F11 70%, #050505 100%)",
                    boxShadow:
                        "0 30px 60px -10px rgba(0,0,0,0.85), 0 18px 36px -18px rgba(212,175,55,0.4), inset 0 1px 0 rgba(212,175,55,0.4), inset 0 -1px 0 rgba(0,0,0,0.5)",
                    border: "1px solid rgba(212,175,55,0.3)",
                    overflow: "hidden",
                }}
            >
                {/* Sheen */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            "linear-gradient(135deg, transparent 0%, rgba(212,175,55,0.18) 35%, rgba(255,255,255,0.06) 50%, transparent 70%)",
                        transform: "translateZ(1px)",
                    }}
                />
                {/* Embossed pattern */}
                <div
                    className="absolute inset-0 opacity-25 pointer-events-none"
                    style={{
                        backgroundImage:
                            "repeating-linear-gradient(45deg, rgba(212,175,55,0.12) 0px, rgba(212,175,55,0.12) 1px, transparent 1px, transparent 8px)",
                        transform: "translateZ(2px)",
                    }}
                />
                {/* Top-right gold corner */}
                <div className="absolute top-3 right-3" style={{ transform: "translateZ(15px)" }}>
                    <div className="text-[8px] uppercase tracking-[0.3em] text-[#D4AF37]/60 font-mono-tech text-right">Grand Tourer</div>
                    <div className="font-display font-black text-[#F3E5AB] text-lg leading-none mt-0.5 text-right gold-shimmer">SCOUT BLACK</div>
                </div>
                {/* Chip */}
                <div
                    className="absolute top-12 left-4 w-10 h-7 rounded-md"
                    style={{
                        background: "linear-gradient(135deg, #D4AF37 0%, #996515 50%, #D4AF37 100%)",
                        boxShadow: "0 1px 0 rgba(255,255,255,0.2) inset",
                        transform: "translateZ(12px)",
                    }}
                >
                    <div className="absolute inset-1 rounded-sm border border-black/20" />
                </div>
                {/* Holder */}
                <div className="absolute bottom-3 left-4 right-4" style={{ transform: "translateZ(10px)" }}>
                    <div className="text-[8px] uppercase tracking-[0.3em] text-[#D4AF37]/60 font-mono-tech">Pilot</div>
                    <div className="font-display font-bold text-white text-sm truncate">{userName || "—"}</div>
                    <div className="flex items-end justify-between mt-0.5">
                        <div className="text-[10px] font-mono-tech text-zinc-400 tracking-[0.2em]">{licenseId || "S-XXXX-XX"}</div>
                        <div className="text-[8px] uppercase tracking-[0.3em] text-[#D4AF37]/60 font-mono-tech">{active ? "ACTIVE" : "PREVIEW"}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
