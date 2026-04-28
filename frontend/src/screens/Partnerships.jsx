import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import TopBar from "../components/TopBar";
import { ChevronRight, Lock, PartnerIcon, Stars } from "../components/Icons";

export default function Partnerships() {
    const { user } = useAuth();
    const [open, setOpen] = useState([]);
    const [black, setBlack] = useState([]);

    useEffect(() => {
        api.get("/partnerships?tier=open").then(({ data }) => setOpen(data));
        api.get("/partnerships?tier=black").then(({ data }) => setBlack(data));
    }, []);

    return (
        <div data-testid="partnerships-screen">
            <TopBar title="PARCERIAS" subtitle="Open + Black" />

            <div className="px-5 pt-5">
                <h2 className="font-display font-bold text-white text-lg mb-1">Parcerias Abertas</h2>
                <p className="text-zinc-500 text-xs mb-4">Disponíveis para todos os membros SCOUT.</p>
                <div className="space-y-2 mb-8">
                    {open.map((p, i) => <PartnerCard key={p.partnership_id} p={p} delay={i} />)}
                </div>

                <h2 className="font-display font-bold text-white text-lg mb-1 flex items-center gap-2">
                    Parcerias <span className="gold-shimmer">BLACK</span>
                </h2>
                <p className="text-zinc-500 text-xs mb-4">Acesso exclusivo para membros Scout Black.</p>
                <div className="space-y-2 mb-8">
                    {black.map((p, i) => <PartnerCard key={p.partnership_id} p={p} delay={i} elite locked={!user?.is_black} />)}
                </div>
            </div>
        </div>
    );
}

function PartnerCard({ p, delay = 0, elite, locked }) {
    return (
        <Link
            to={`/partnerships/${p.partnership_id}`}
            className={`flex items-center gap-3 rounded-xl border p-3.5 transition reveal ${
                elite ? "border-[#D4AF37]/20 bg-gradient-to-r from-[#D4AF37]/5 to-transparent" : "border-white/5 bg-[#0F0F11]"
            } ${locked ? "opacity-80" : "hover:border-white/15"}`}
            style={{ animationDelay: `${delay * 0.05}s` }}
            data-testid={`partner-${p.partnership_id}`}
        >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${elite ? "bg-[#D4AF37]/15 text-[#D4AF37]" : "bg-white/5 text-red-500"}`}>
                <PartnerIcon name={p.icon} size={20} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <div className="font-bold text-white text-sm">{p.name}</div>
                    {elite && <Stars size={11} className="text-[#D4AF37]" />}
                </div>
                <div className={`text-[10px] uppercase tracking-[0.2em] font-bold ${elite ? "text-[#D4AF37]" : "text-zinc-500"}`}>
                    {p.discount}
                </div>
                <div className="text-zinc-500 text-[11px] mt-0.5 truncate">{p.description}</div>
            </div>
            {locked ? (
                <Lock size={14} className="text-[#D4AF37]" />
            ) : (
                <ChevronRight size={14} className="text-zinc-600" />
            )}
        </Link>
    );
}
