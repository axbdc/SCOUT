import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import TopBar from "../components/TopBar";
import { Search, Filter, Pin, X, Speed, Car, Bolt, Compass } from "../components/Icons";

const REGIONS = ["Todos", "Norte", "Centro", "Sul", "Ilhas"];
const PRICES = ["Todos", "Gratuito", "Pago"];
const CATEGORIES = [
    { v: "Todos", Icon: Compass },
    { v: "Clássicos", Icon: Speed },
    { v: "Desportivos", Icon: Bolt },
    { v: "JDM", Icon: Car },
    { v: "Americanos", Icon: Car },
];

export default function SpotsFeed() {
    const [spots, setSpots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [region, setRegion] = useState("Todos");
    const [price, setPrice] = useState("Todos");
    const [category, setCategory] = useState("Todos");

    const fetchSpots = async () => {
        setLoading(true);
        const params = {};
        if (region !== "Todos") params.region = region;
        if (price !== "Todos") params.price_type = price;
        if (category !== "Todos") params.category = category;
        if (q) params.q = q;
        const { data } = await api.get("/spots", { params });
        setSpots(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchSpots();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [region, price, category]);

    useEffect(() => {
        const t = setTimeout(fetchSpots, 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    const activeFilters = useMemo(
        () => [region !== "Todos" && region, price !== "Todos" && price, category !== "Todos" && category].filter(Boolean),
        [region, price, category]
    );

    return (
        <div data-testid="spots-screen">
            <TopBar title="SPOTS" subtitle="Automotive Intelligence" onBack={false} right={
                <button
                    onClick={() => setShowFilters(true)}
                    data-testid="open-filters"
                    className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
                >
                    <Filter size={16} />
                </button>
            } />

            <div className="px-4 pt-3">
                <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        data-testid="spots-search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Buscar viatura ou modelo..."
                        className="w-full bg-[#0F0F11] border border-white/5 rounded-full h-11 pl-11 pr-4 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
                    />
                </div>

                {activeFilters.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3" data-testid="active-filters">
                        {activeFilters.map((f) => (
                            <span key={f} className="px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-[11px] font-bold text-red-400 uppercase tracking-wider">
                                {f}
                            </span>
                        ))}
                        <button
                            onClick={() => { setRegion("Todos"); setPrice("Todos"); setCategory("Todos"); }}
                            className="px-3 py-1 rounded-full bg-white/5 text-[11px] font-bold text-zinc-400 hover:text-white"
                            data-testid="clear-filters"
                        >
                            Limpar
                        </button>
                    </div>
                )}
            </div>

            <div className="px-4 pt-5 space-y-4 pb-4">
                {loading && <div className="text-zinc-600 text-center py-12 text-xs uppercase tracking-widest">A carregar...</div>}
                {!loading && spots.length === 0 && (
                    <div className="text-zinc-600 text-center py-16 text-xs uppercase tracking-widest" data-testid="spots-empty">
                        Nenhum spot encontrado
                    </div>
                )}
                {spots.map((s, i) => (
                    <SpotCard key={s.spot_id} s={s} delay={i} />
                ))}
            </div>

            {showFilters && <FilterSheet
                {...{ region, price, category, setRegion, setPrice, setCategory, onClose: () => setShowFilters(false) }}
            />}
        </div>
    );
}

function SpotCard({ s, delay }) {
    return (
        <Link
            to={`/map?lat=${s.lat}&lng=${s.lng}&id=${s.spot_id}`}
            data-testid={`spot-${s.spot_id}`}
            className="block relative rounded-2xl overflow-hidden border border-white/5 bg-[#0F0F11] hover:border-white/15 transition reveal"
            style={{ animationDelay: `${delay * 0.05}s` }}
        >
            <div className="aspect-[5/3] relative overflow-hidden">
                <img src={s.image} alt={s.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="absolute top-3 left-3 flex gap-2">
                    {s.live && (
                        <span className="px-2.5 py-1 rounded-full bg-red-500/90 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white live-dot" /> LIVE
                        </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur border border-white/10 text-white text-[10px] font-bold uppercase tracking-wider">
                        {s.category}
                    </span>
                </div>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-white">
                    {s.price_type}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-400 font-mono-tech">{s.region}</div>
                    <h3 className="font-display font-bold text-white text-lg leading-tight">{s.title}</h3>
                    <div className="flex items-center gap-1.5 text-zinc-400 text-xs mt-1">
                        <Pin size={12} /> {s.location_name}
                    </div>
                </div>
            </div>
        </Link>
    );
}

function FilterSheet({ region, price, category, setRegion, setPrice, setCategory, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose} data-testid="filter-sheet">
            <div
                className="w-full max-w-[430px] bg-[#0a0a0a] rounded-t-3xl border-t border-white/10 max-h-[85vh] overflow-y-auto scout-scroll"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-[#0a0a0a] z-10 flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center" data-testid="close-filters">
                        <X size={18} />
                    </button>
                    <div className="font-display font-bold text-white">Refine search</div>
                    <div className="w-9" />
                </div>
                <div className="px-5 py-5 space-y-7">
                    <FilterGroup label="Região" subtitle="Select Location">
                        {REGIONS.map((r) => (
                            <Chip key={r} active={region === r} onClick={() => setRegion(r)} testid={`region-${r}`}>{r}</Chip>
                        ))}
                    </FilterGroup>
                    <FilterGroup label="Preço" subtitle="Access Type">
                        {PRICES.map((p) => (
                            <Chip key={p} active={price === p} onClick={() => setPrice(p)} testid={`price-${p}`}>{p}</Chip>
                        ))}
                    </FilterGroup>
                    <FilterGroup label="Categoria de Carro" subtitle="Automotive Type">
                        {CATEGORIES.map(({ v, Icon }) => (
                            <Chip key={v} active={category === v} onClick={() => setCategory(v)} testid={`category-${v}`}>
                                <Icon size={13} /> {v}
                            </Chip>
                        ))}
                    </FilterGroup>
                    <button
                        onClick={onClose}
                        className="w-full h-12 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-display font-bold uppercase tracking-widest text-sm rounded-md transition shadow-[0_0_30px_rgba(229,57,53,0.3)]"
                        data-testid="apply-filters"
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </div>
    );
}

function FilterGroup({ label, subtitle, children }) {
    return (
        <div>
            <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-display font-bold text-white text-base">{label}</h3>
                <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono-tech">{subtitle}</span>
            </div>
            <div className="flex flex-wrap gap-2">{children}</div>
        </div>
    );
}

function Chip({ active, onClick, children, testid }) {
    return (
        <button
            onClick={onClick}
            data-testid={testid}
            className={`px-4 h-10 rounded-full text-sm font-bold flex items-center gap-1.5 transition ${
                active
                    ? "bg-red-600 text-white shadow-[0_0_20px_rgba(229,57,53,0.4)]"
                    : "bg-white/5 text-zinc-300 border border-white/5 hover:bg-white/10"
            }`}
        >
            {children}
        </button>
    );
}
