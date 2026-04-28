import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { api } from "../lib/api";
import TopBar from "../components/TopBar";
import { Crosshair, Speed } from "../components/Icons";

// Fix Leaflet default marker icons (avoid 404)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const redIcon = L.divIcon({
    className: "scout-marker",
    html: `<div style="width:30px;height:30px;border-radius:50%;background:#E53935;border:2px solid #fff;box-shadow:0 0 18px rgba(229,57,53,0.8);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">●</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
});

const goldIcon = L.divIcon({
    className: "scout-marker-gold",
    html: `<div style="width:30px;height:30px;border-radius:50%;background:#D4AF37;border:2px solid #fff;box-shadow:0 0 18px rgba(212,175,55,0.8);"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
});

const FILTERS = ["All", "Track Day", "Concours", "Rally", "Meet"];

function Recenter({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, 12, { duration: 0.8 });
    }, [center, map]);
    return null;
}

export default function MapScreen() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [spots, setSpots] = useState([]);
    const [filter, setFilter] = useState("All");
    const [center, setCenter] = useState([38.7223, -9.1393]); // Lisbon

    useEffect(() => {
        api.get("/events").then(({ data }) => setEvents(data));
        api.get("/spots").then(({ data }) => setSpots(data));
    }, []);

    useEffect(() => {
        const lat = parseFloat(params.get("lat"));
        const lng = parseFloat(params.get("lng"));
        if (!isNaN(lat) && !isNaN(lng)) setCenter([lat, lng]);
    }, [params]);

    const visibleEvents = events.filter((e) => filter === "All" || e.type === filter);

    return (
        <div className="relative" data-testid="map-screen">
            <TopBar title="EVENT MAP" subtitle="SCOUT · Lisbon" onBack={false} />

            <div className="px-4 pt-3 pb-2">
                <div className="flex gap-2 overflow-x-auto scout-scroll">
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            data-testid={`map-filter-${f}`}
                            onClick={() => setFilter(f)}
                            className={`px-4 h-9 rounded-full text-xs font-bold whitespace-nowrap transition flex-shrink-0 ${
                                filter === f
                                    ? "bg-red-600 text-white shadow-[0_0_20px_rgba(229,57,53,0.4)]"
                                    : "bg-white/5 text-zinc-300 border border-white/5"
                            }`}
                        >
                            {f === "All" ? "Todos" : f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative">
                <MapContainer
                    center={center}
                    zoom={11}
                    scrollWheelZoom={true}
                    style={{ height: "calc(100vh - 230px)", minHeight: 460, width: "100%" }}
                    data-testid="map-container"
                >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Recenter center={center} />
                    {visibleEvents.map((e) => (
                        <Marker
                            key={e.event_id}
                            position={[e.lat, e.lng]}
                            icon={e.exclusive ? goldIcon : redIcon}
                            eventHandlers={{ click: () => setCenter([e.lat, e.lng]) }}
                        >
                            <Popup>
                                <div style={{ minWidth: 180 }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{e.title}</div>
                                    <div style={{ fontSize: 11, color: "#52525b" }}>{e.location_name}</div>
                                    <button
                                        onClick={() => navigate(`/events/${e.event_id}`)}
                                        style={{
                                            marginTop: 8,
                                            background: "#E53935",
                                            color: "white",
                                            border: "none",
                                            padding: "6px 12px",
                                            borderRadius: 6,
                                            fontWeight: 700,
                                            fontSize: 11,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Ver evento
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                    {spots.map((s) => (
                        <Marker
                            key={s.spot_id}
                            position={[s.lat, s.lng]}
                            icon={L.divIcon({
                                className: "scout-spot-marker",
                                html: `<div style="width:20px;height:20px;border-radius:50%;background:rgba(229,57,53,0.4);border:1.5px solid #E53935;"></div>`,
                                iconSize: [20, 20],
                                iconAnchor: [10, 10],
                            })}
                        >
                            <Popup>
                                <div style={{ minWidth: 140 }}>
                                    <div style={{ fontWeight: 700, fontSize: 12 }}>{s.title}</div>
                                    <div style={{ fontSize: 10, color: "#52525b" }}>{s.category} · {s.region}</div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                <button
                    onClick={() => setCenter([38.7223, -9.1393])}
                    className="absolute bottom-4 right-4 z-[400] w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(229,57,53,0.5)]"
                    data-testid="recenter-btn"
                    aria-label="recenter"
                >
                    <Crosshair size={20} />
                </button>
            </div>

            <div className="absolute top-[120px] right-4 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur border border-white/10 text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5 z-[400]">
                <Speed size={12} className="text-red-500" /> {visibleEvents.length} {visibleEvents.length === 1 ? "evento" : "eventos"}
            </div>
        </div>
    );
}
