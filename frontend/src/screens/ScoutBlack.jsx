import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import TopBar from "../components/TopBar";
import { Stars, Trophy, Camera, Speed, Sparkles, Check, ArrowRight, ChevronRight, PartnerIcon } from "../components/Icons";

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

            <div className="relative h-[180px] overflow-hidden">
                <div className="absolute inset-0 gold-bg opacity-15" />
                <img
                    src="https://images.unsplash.com/photo-1639133694967-640f255f10fc"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                    <div className="text-[10px] uppercase tracking-[0.4em] gold-shimmer font-bold mb-2">Exclusive Tier</div>
                    <h1 className="font-display font-black text-4xl text-white tracking-tighter">
                        SCOUT <span className="gold-shimmer">BLACK</span>
                    </h1>
                    <p className="text-zinc-300 text-xs mt-2 max-w-[280px]">
                        O círculo restrito da cultura automóvel em Portugal.
                    </p>
                </div>
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
                        <button
                            onClick={() => navigate("/checkout")}
                            data-testid="subscribe-btn"
                            className="w-full h-14 mt-4 rounded-md gold-bg text-black font-display font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition shadow-[0_0_40px_rgba(212,175,55,0.3)]"
                        >
                            <Speed size={16} /> Subscrever Agora
                        </button>
                        <div className="text-center text-zinc-500 text-[11px] mt-3">
                            Cancelamento imediato sem fidelização
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
