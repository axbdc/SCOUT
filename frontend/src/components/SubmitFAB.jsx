import { Link, useLocation } from "react-router-dom";
import { Plus } from "./Icons";

/** Floating action button to submit an event - hidden on certain routes */
export default function SubmitFAB() {
    const loc = useLocation();
    const hide =
        ["/login", "/register", "/", "/splash", "/auth/callback", "/submit-event", "/checkout"].includes(loc.pathname) ||
        loc.pathname.startsWith("/admin") ||
        loc.pathname.startsWith("/events/");
    if (hide) return null;
    return (
        <Link
            to="/submit-event"
            data-testid="fab-submit-event"
            className="absolute bottom-[88px] right-4 z-30 h-14 px-5 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white font-display font-bold uppercase tracking-widest text-xs flex items-center gap-2 shadow-[0_0_30px_rgba(229,57,53,0.5)]"
        >
            <Plus size={18} strokeWidth={2.4} />
            Submeter
        </Link>
    );
}
