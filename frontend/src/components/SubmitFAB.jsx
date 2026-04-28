import { Link, useLocation } from "react-router-dom";
import { Plus } from "./Icons";

/** FAB visible ONLY on the events calendar screen. */
export default function SubmitFAB() {
    const loc = useLocation();
    if (loc.pathname !== "/calendar") return null;
    return (
        <Link
            to="/submit-event"
            data-testid="fab-submit-event"
            className="absolute bottom-[88px] right-4 z-40 h-14 px-5 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 text-white font-display font-bold uppercase tracking-widest text-xs flex items-center gap-2 shadow-[0_0_30px_rgba(229,57,53,0.5)]"
        >
            <Plus size={18} strokeWidth={2.4} />
            Submeter
        </Link>
    );
}
