import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Barcode from "react-barcode";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import TopBar from "../components/TopBar";
import { PartnerIcon, Stars, Lock, Check } from "../components/Icons";

export default function PartnershipDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [partner, setPartner] = useState(null);

    useEffect(() => {
        // Try open first, then black
        (async () => {
            const [{ data: open }, { data: black }] = await Promise.all([
                api.get("/partnerships?tier=open"),
                api.get("/partnerships?tier=black"),
            ]);
            const all = [...open, ...black];
            const p = all.find((x) => x.partnership_id === id);
            if (!p) navigate("/partnerships", { replace: true });
            else setPartner(p);
        })();
    }, [id, navigate]);

    if (!partner) return <div className="text-zinc-500 text-center py-20 font-mono-tech text-xs uppercase tracking-widest">A carregar...</div>;

    const isLocked = partner.tier === "black" && !user?.is_black;
    const code = `SCOUT-${(user?.user_id || "GUEST").toUpperCase().slice(-6)}-${partner.partnership_id.toUpperCase()}`;
    const isElite = partner.tier === "black";

    return (
        <div data-testid="partnership-detail">
            <TopBar title={partner.name.toUpperCase()} subtitle={isElite ? "BLACK PARTNER" : "OPEN PARTNER"} />

            <div className="px-5 pt-6">
                <div className={`relative overflow-hidden rounded-2xl p-6 mb-6 ${
                    isElite
                        ? "bg-gradient-to-br from-[#1a1207] to-[#0a0a0a] border border-[#D4AF37]/40 premium-glow"
                        : "bg-[#0F0F11] border border-white/5"
                }`}>
                    <div className="flex items-start gap-4 mb-4">
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isElite ? "bg-[#D4AF37]/15 text-[#D4AF37]" : "bg-red-500/15 text-red-500"
                        }`}>
                            <PartnerIcon name={partner.icon} size={32} />
                        </div>
                        <div className="flex-1 min-w-0">
                            {isElite && (
                                <div className="inline-flex items-center gap-1 mb-1">
                                    <Stars size={10} className="text-[#D4AF37]" />
                                    <span className="text-[9px] uppercase tracking-[0.2em] gold-shimmer font-bold">Scout Black</span>
                                </div>
                            )}
                            <h2 className="font-display font-black text-white text-xl tracking-tight">{partner.name}</h2>
                            <div className={`mt-1 text-[11px] uppercase tracking-[0.2em] font-bold ${
                                isElite ? "text-[#D4AF37]" : "text-red-500"
                            }`}>
                                {partner.discount}
                            </div>
                        </div>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">{partner.description || "Parceria oficial SCOUT."}</p>
                </div>

                {isLocked ? (
                    <div className="bg-gradient-to-br from-[#D4AF37]/15 to-transparent border border-[#D4AF37]/30 rounded-2xl p-6 text-center" data-testid="partnership-locked">
                        <Lock size={28} className="mx-auto text-[#D4AF37] mb-3" />
                        <div className="font-display font-bold text-white text-base">Parceria BLACK</div>
                        <p className="text-zinc-400 text-xs mt-2 leading-relaxed mb-4">
                            Acede a esta parceria com a subscrição Scout Black.
                        </p>
                        <button
                            onClick={() => navigate("/scout-black")}
                            className="h-11 px-5 rounded-md gold-bg text-black font-display font-black uppercase tracking-widest text-xs"
                            data-testid="goto-black"
                        >
                            Ver Scout Black
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="bg-white rounded-2xl p-5 mb-4" data-testid="partnership-barcode">
                            <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-mono-tech text-center mb-3">
                                Apresenta no Estabelecimento
                            </div>
                            <div className="flex items-center justify-center mb-3">
                                <Barcode
                                    value={code}
                                    height={80}
                                    width={1.6}
                                    fontSize={11}
                                    margin={0}
                                    background="#ffffff"
                                    lineColor="#000000"
                                />
                            </div>
                            <div className="text-center text-zinc-700 text-[10px] font-mono-tech tracking-widest">{code}</div>
                        </div>

                        <div className="bg-[#0F0F11] border border-white/5 rounded-xl p-4">
                            <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-mono-tech mb-2">Como Usar</div>
                            <ol className="text-zinc-400 text-sm space-y-2">
                                <li className="flex gap-2">
                                    <span className="text-red-500 font-bold">1.</span>
                                    <span>Mostra este código de barras no estabelecimento parceiro.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-red-500 font-bold">2.</span>
                                    <span>O parceiro valida e aplica o desconto: <b className="text-white">{partner.discount}</b></span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-red-500 font-bold">3.</span>
                                    <span>Aproveita e partilha a experiência com a comunidade SCOUT.</span>
                                </li>
                            </ol>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-zinc-500 text-[11px]">
                            <Check size={12} className="text-green-500" />
                            <span>Código único associado à tua conta</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
