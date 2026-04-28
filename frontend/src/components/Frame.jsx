import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import SubmitFAB from "./SubmitFAB";

export default function Frame() {
    return (
        <div className="scout-frame" data-testid="scout-frame">
            <div className="pb-[88px] min-h-screen">
                <Outlet />
            </div>
            <SubmitFAB />
            <BottomNav />
        </div>
    );
}
