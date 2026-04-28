import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "./Icons";

export default function TopBar({ title, subtitle, onBack, right, sticky = true, testid = "top-bar" }) {
    const navigate = useNavigate();
    return (
        <header
            className={`${sticky ? "sticky top-0 z-30" : ""} bg-[#050505]/85 backdrop-blur-xl border-b border-white/5 px-4 h-14 flex items-center justify-between`}
            data-testid={testid}
        >
            <div className="flex items-center gap-3 min-w-0">
                {onBack !== false && (
                    <button
                        onClick={() => (typeof onBack === "function" ? onBack() : navigate(-1))}
                        className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white"
                        data-testid="back-btn"
                        aria-label="back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                )}
                <div className="min-w-0">
                    {title && <div className="font-display font-bold text-[15px] text-white truncate">{title}</div>}
                    {subtitle && <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{subtitle}</div>}
                </div>
            </div>
            {right}
        </header>
    );
}
