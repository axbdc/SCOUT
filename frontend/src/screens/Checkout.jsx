import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import TopBar from "../components/TopBar";
import { Stars, Apple, Phone, Bank, CardPay, Check, Speed } from "../components/Icons";

const PLANS = [
    { id: "monthly", label: "Mensal", price: "€29,99", per: "/mês", desc: "Access all exclusive features" },
    { id: "quarterly", label: "Trimestral", price: "€79,99", per: "/quarter", desc: "Save 10%", badge: null },
    { id: "annual", label: "Anual", price: "€290,00", per: "/ano", desc: "Save 2 Months", badge: "BEST VALUE" },
];

const METHODS = [
    { id: "apple_pay", label: "Apple Pay", Icon: Apple },
    { id: "mbway", label: "MBWAY", Icon: Phone },
    { id: "multibanco", label: "Multibanco", Icon: Bank },
    { id: "paypal", label: "PayPal", Icon: CardPay },
    { id: "card", label: "Cartão (Visa/Mastercard)", Icon: CardPay },
];

export default function Checkout() {
    const navigate = useNavigate();
    const { refresh } = useAuth();
    const [plan, setPlan] = useState("annual");
    const [method, setMethod] = useState("card");
    const [cardName, setCardName] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [exp, setExp] = useState("");
    const [cvc, setCvc] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    const submit = async () => {
        setError("");
        setLoading(true);
        try {
            await api.post("/subscription/checkout", { plan, method });
            await refresh();
            setDone(true);
            setTimeout(() => navigate("/scout-black", { replace: true }), 1800);
        } catch (e) {
            setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center" data-testid="checkout-success">
                <div className="w-20 h-20 rounded-full gold-bg flex items-center justify-center mb-5">
                    <Check size={32} className="text-black" strokeWidth={3} />
                </div>
                <div className="text-[10px] uppercase tracking-[0.3em] gold-shimmer font-bold mb-1">Bem-vindo ao</div>
                <h2 className="font-display font-black text-3xl text-white tracking-tighter">SCOUT BLACK</h2>
                <p className="text-zinc-400 mt-3 text-sm">A tua subscrição está ativa. Aproveita os benefícios exclusivos.</p>
            </div>
        );
    }

    const selectedPlan = PLANS.find((p) => p.id === plan);

    return (
        <div data-testid="checkout-screen">
            <TopBar title="SCOUT BLACK" subtitle="Payment" />
            <div className="px-5 pt-5">
                {/* Plan summary */}
                <div className="bg-gradient-to-br from-[#D4AF37]/15 to-transparent border border-[#D4AF37]/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
                    <Stars size={20} className="text-[#D4AF37]" />
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] gold-shimmer font-bold">Plan Selected</div>
                        <div className="font-display font-bold text-white">{selectedPlan.label} · {selectedPlan.price}</div>
                    </div>
                </div>

                <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-mono-tech mb-2">Step 1 of 2</div>
                <h3 className="font-display font-bold text-white text-lg mb-3">Plan Selection</h3>
                <div className="space-y-2 mb-7">
                    {PLANS.map((p) => (
                        <label
                            key={p.id}
                            className={`relative flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition ${
                                plan === p.id ? "border-[#D4AF37]/60 bg-[#D4AF37]/10" : "border-white/5 bg-[#0F0F11]"
                            }`}
                            data-testid={`plan-${p.id}`}
                        >
                            <input type="radio" className="scout-radio" checked={plan === p.id} onChange={() => setPlan(p.id)} />
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-white">{p.label}</div>
                                <div className="text-zinc-500 text-xs">{p.desc}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-display font-bold text-white">{p.price}<span className="text-zinc-500 text-xs font-normal">{p.per}</span></div>
                            </div>
                            {p.badge && (
                                <span className="absolute -top-2 right-4 px-2 py-0.5 rounded-full gold-bg text-black text-[9px] font-black uppercase tracking-widest">
                                    {p.badge}
                                </span>
                            )}
                        </label>
                    ))}
                </div>

                <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-mono-tech mb-2">Step 2 of 2</div>
                <h3 className="font-display font-bold text-white text-lg mb-3">Payment Method</h3>
                <div className="space-y-2">
                    {METHODS.map(({ id, label, Icon }) => (
                        <label
                            key={id}
                            className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition ${
                                method === id ? "border-red-500/50 bg-red-600/5" : "border-white/5 bg-[#0F0F11]"
                            }`}
                            data-testid={`method-${id}`}
                        >
                            <input type="radio" className="scout-radio" checked={method === id} onChange={() => setMethod(id)} />
                            <Icon size={18} className="text-zinc-300" />
                            <span className="flex-1 font-bold text-white text-sm">{label}</span>
                        </label>
                    ))}
                </div>

                {method === "card" && (
                    <div className="mt-5 bg-[#0F0F11] border border-white/5 rounded-2xl p-4 space-y-3" data-testid="card-fields">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono-tech">Card Information</div>
                        <input
                            placeholder="Cardholder Name"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-md h-11 px-3 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-red-500"
                        />
                        <input
                            placeholder="Card Number"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-md h-11 px-3 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-red-500"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                placeholder="MM/AA"
                                value={exp}
                                onChange={(e) => setExp(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-md h-11 px-3 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-red-500"
                            />
                            <input
                                placeholder="CVC"
                                value={cvc}
                                onChange={(e) => setCvc(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-md h-11 px-3 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-red-500"
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-4 text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded">{error}</div>
                )}

                <p className="text-[11px] text-zinc-500 mt-5 leading-relaxed">
                    Ao confirmar, aceita os termos de serviço e política de privacidade. As subscrições renovam automaticamente até serem canceladas.
                </p>

                <button
                    onClick={submit}
                    disabled={loading}
                    data-testid="confirm-payment"
                    className="w-full h-14 mt-4 mb-8 rounded-md gold-bg text-black font-display font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-[0_0_40px_rgba(212,175,55,0.3)] disabled:opacity-60"
                >
                    <Speed size={16} /> {loading ? "A processar..." : "Confirmar Pagamento"}
                </button>
            </div>
        </div>
    );
}
