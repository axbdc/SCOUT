import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import TopBar from "../components/TopBar";
import { CardPay, Apple, Phone, Bank, Speed, Check, Pin, Calendar, Plus, Info } from "../components/Icons";

const TYPES = ["Track Day", "Concours", "Rally", "Meet"];
const CATS = ["Clássicos", "Desportivos", "JDM", "Americanos"];
const METHODS = [
    { id: "card", label: "Cartão (Visa/Mastercard)", Icon: CardPay },
    { id: "apple_pay", label: "Apple Pay", Icon: Apple },
    { id: "mbway", label: "MBWAY", Icon: Phone },
    { id: "multibanco", label: "Multibanco", Icon: Bank },
    { id: "paypal", label: "PayPal", Icon: CardPay },
];

const FEE = 10;

export default function SubmitEvent() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1=form, 2=payment, 3=submitting, 4=done
    const [error, setError] = useState("");
    const [paymentToken, setPaymentToken] = useState(null);
    const [method, setMethod] = useState("card");

    const [form, setForm] = useState({
        title: "",
        type: "Meet",
        date: "",
        time_start: "10:00",
        time_end: "14:00",
        price: "0",
        location_name: "",
        lat: "",
        lng: "",
        spots_total: "30",
        description: "",
        organizer: "",
        categories: [],
        image: "",
    });

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const toggleCat = (c) =>
        setForm((f) => ({
            ...f,
            categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c],
        }));

    const validateStep1 = () => {
        const required = ["title", "date", "time_start", "time_end", "location_name", "lat", "lng", "spots_total", "description", "organizer"];
        for (const k of required) if (!String(form[k]).trim()) return `Campo "${k}" é obrigatório`;
        if (form.categories.length === 0) return "Escolhe pelo menos uma categoria de carros";
        if (isNaN(parseFloat(form.lat)) || isNaN(parseFloat(form.lng))) return "Coordenadas inválidas";
        return null;
    };

    const goToPayment = () => {
        const v = validateStep1();
        if (v) return setError(v);
        setError("");
        setStep(2);
    };

    const payAndSubmit = async () => {
        setError("");
        setStep(3);
        try {
            const { data: pay } = await api.post("/events/submission-fee");
            setPaymentToken(pay.payment_token);
            await api.post("/events/submit", {
                ...form,
                price: parseFloat(form.price) || 0,
                spots_total: parseInt(form.spots_total),
                lat: parseFloat(form.lat),
                lng: parseFloat(form.lng),
                payment_token: pay.payment_token,
            });
            setStep(4);
        } catch (e) {
            setError(formatApiErrorDetail(e.response?.data?.detail) || e.message);
            setStep(2);
        }
    };

    if (step === 4) {
        return (
            <div data-testid="submit-success">
                <TopBar title="SUBMETIDO" />
                <div className="flex flex-col items-center justify-center px-8 text-center pt-12">
                    <div className="w-20 h-20 rounded-full bg-green-600/20 border border-green-500/40 flex items-center justify-center mb-5">
                        <Check size={32} className="text-green-400" strokeWidth={3} />
                    </div>
                    <h2 className="font-display font-black text-2xl text-white tracking-tighter">Submissão recebida</h2>
                    <p className="text-zinc-400 text-sm mt-3 max-w-[300px]">
                        O teu evento entrou na fila de aprovação. Vais receber notificação assim que for revisto pela equipa SCOUT.
                    </p>
                    <button
                        onClick={() => navigate("/profile")}
                        className="mt-7 h-12 px-6 rounded-md bg-red-600 hover:bg-red-500 text-white font-display font-bold uppercase tracking-widest text-sm"
                        data-testid="submit-success-cta"
                    >
                        Ver Meus Eventos
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div data-testid="submit-event-screen">
            <TopBar title="SUBMETER EVENTO" subtitle={`Passo ${step} de 2`} />

            {step === 1 && (
                <div className="px-5 pt-5 space-y-4 pb-10">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3">
                        <Info size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="text-amber-200/80 text-xs leading-relaxed">
                            A submissão tem uma <b className="text-amber-300">taxa única de €{FEE}</b>. Após pagamento, o evento entra em revisão e aparece na app quando aprovado.
                        </div>
                    </div>

                    <Field label="Título *">
                        <input data-testid="se-title" value={form.title} onChange={set("title")} placeholder="Ex: Track Day Estoril" className={inputCls} />
                    </Field>

                    <Field label="Tipo de Evento *">
                        <div className="flex flex-wrap gap-2">
                            {TYPES.map((t) => (
                                <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, type: t }))}
                                    data-testid={`se-type-${t}`}
                                    className={chipCls(form.type === t)}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </Field>

                    <Field label="Categoria de Carros *">
                        <div className="flex flex-wrap gap-2">
                            {CATS.map((c) => (
                                <button key={c} type="button" onClick={() => toggleCat(c)}
                                    data-testid={`se-cat-${c}`}
                                    className={chipCls(form.categories.includes(c))}>
                                    {c}
                                </button>
                            ))}
                        </div>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Data *"><input data-testid="se-date" type="date" value={form.date} onChange={set("date")} className={inputCls} /></Field>
                        <Field label="Preço (€)"><input data-testid="se-price" type="number" min="0" value={form.price} onChange={set("price")} className={inputCls} /></Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Início *"><input data-testid="se-start" type="time" value={form.time_start} onChange={set("time_start")} className={inputCls} /></Field>
                        <Field label="Fim *"><input data-testid="se-end" type="time" value={form.time_end} onChange={set("time_end")} className={inputCls} /></Field>
                    </div>

                    <Field label="Local *">
                        <input data-testid="se-location" value={form.location_name} onChange={set("location_name")} placeholder="Ex: Autódromo do Estoril, Cascais" className={inputCls} />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Latitude *"><input data-testid="se-lat" value={form.lat} onChange={set("lat")} placeholder="38.7506" className={inputCls} /></Field>
                        <Field label="Longitude *"><input data-testid="se-lng" value={form.lng} onChange={set("lng")} placeholder="-9.3937" className={inputCls} /></Field>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition((pos) => {
                                    setForm((f) => ({ ...f, lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) }));
                                });
                            }
                        }}
                        data-testid="se-use-location"
                        className="text-xs text-blue-400 font-bold uppercase tracking-widest flex items-center gap-1"
                    >
                        <Pin size={11} /> Usar localização atual
                    </button>

                    <Field label="Vagas *">
                        <input data-testid="se-spots" type="number" min="1" value={form.spots_total} onChange={set("spots_total")} className={inputCls} />
                    </Field>

                    <Field label="Organizador *">
                        <input data-testid="se-organizer" value={form.organizer} onChange={set("organizer")} placeholder="Ex: Estoril Experience" className={inputCls} />
                    </Field>

                    <Field label="URL Imagem">
                        <input data-testid="se-image" value={form.image} onChange={set("image")} placeholder="https://..." className={inputCls} />
                    </Field>

                    <Field label="Descrição *">
                        <textarea data-testid="se-description" value={form.description} onChange={set("description")} rows={4} className={inputCls + " py-2 resize-none"} />
                    </Field>

                    {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded" data-testid="se-error">{error}</div>}

                    <button onClick={goToPayment} data-testid="se-continue"
                        className="w-full h-12 mt-3 rounded-md bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-display font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                        <Plus size={16} /> Continuar para Pagamento
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="px-5 pt-5 space-y-4 pb-10">
                    <div className="bg-[#0F0F11] border border-white/5 rounded-2xl p-5">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono-tech">Taxa de Submissão</div>
                        <div className="font-display font-black text-3xl text-white">€{FEE},00</div>
                        <div className="text-zinc-500 text-xs mt-1">Cobrado uma vez · não reembolsável após aprovação</div>
                    </div>

                    <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-mono-tech mt-2 mb-1">Método de Pagamento</div>
                    <div className="space-y-2">
                        {METHODS.map(({ id, label, Icon }) => (
                            <label key={id} className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition ${
                                method === id ? "border-red-500/50 bg-red-600/5" : "border-white/5 bg-[#0F0F11]"
                            }`} data-testid={`se-method-${id}`}>
                                <input type="radio" className="scout-radio" checked={method === id} onChange={() => setMethod(id)} />
                                <Icon size={18} className="text-zinc-300" />
                                <span className="flex-1 font-bold text-white text-sm">{label}</span>
                            </label>
                        ))}
                    </div>

                    {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded">{error}</div>}

                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Ao confirmar, aceitas os termos. O evento ficará em revisão pela equipa SCOUT até 48h.
                    </p>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                        <button onClick={() => setStep(1)} className="h-12 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold uppercase tracking-widest text-xs" data-testid="se-back">
                            Voltar
                        </button>
                        <button onClick={payAndSubmit} data-testid="se-pay"
                            className="h-12 rounded-md bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-display font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(229,57,53,0.4)]">
                            <Speed size={14} /> Pagar €{FEE} & Submeter
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="flex flex-col items-center justify-center min-h-[60vh]" data-testid="se-loading">
                    <div className="text-zinc-400 text-xs uppercase tracking-[0.3em] font-mono-tech animate-pulse">A processar pagamento...</div>
                </div>
            )}
        </div>
    );
}

const inputCls = "w-full bg-[#0F0F11] border border-white/10 rounded-md h-11 px-3 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-red-500";
const chipCls = (active) =>
    `px-4 h-10 rounded-full text-xs font-bold transition ${active ? "bg-red-600 text-white" : "bg-white/5 text-zinc-300 border border-white/5"}`;

function Field({ label, children }) {
    return (
        <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-2">{label}</label>
            {children}
        </div>
    );
}
