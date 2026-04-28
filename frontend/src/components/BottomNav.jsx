import { NavLink, useLocation } from "react-router-dom";
import { Compass, Map, Calendar, User, Gauge } from "./Icons";

const tabs = [
    { to: "/dashboard", label: "Home", Icon: Gauge, testid: "nav-home" },
    { to: "/spots", label: "Spots", Icon: Compass, testid: "nav-spots" },
    { to: "/map", label: "Mapa", Icon: Map, testid: "nav-map" },
    { to: "/calendar", label: "Eventos", Icon: Calendar, testid: "nav-events" },
    { to: "/profile", label: "Perfil", Icon: User, testid: "nav-profile" },
];

export default function BottomNav() {
    const loc = useLocation();
    const hide = ["/login", "/register", "/", "/splash", "/auth/callback"].includes(loc.pathname);
    if (hide) return null;
    return (
        <nav
            className="absolute bottom-0 left-0 right-0 h-[72px] bg-black/85 backdrop-blur-xl border-t border-white/5 flex justify-around items-stretch z-40"
            data-testid="bottom-nav"
        >
            {tabs.map(({ to, label, Icon, testid }) => (
                <NavLink
                    key={to}
                    to={to}
                    data-testid={testid}
                    className={({ isActive }) =>
                        `relative flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${isActive ? "tab-active" : "text-zinc-500 hover:text-zinc-300"}`
                    }
                >
                    <Icon size={20} />
                    <span className="text-[9px] font-bold tracking-wider uppercase">{label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
