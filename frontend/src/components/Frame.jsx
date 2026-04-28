import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

export default function Frame() {
    return (
        <div className="scout-frame" data-testid="scout-frame">
            <div className="pb-[88px] min-h-screen">
                <Outlet />
            </div>
            <BottomNav />
        </div>
    );
}
