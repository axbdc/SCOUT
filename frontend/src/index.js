import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));
// Note: React.StrictMode intentionally omitted — react-leaflet 4.2.1 throws
// "Map container is already initialized" under StrictMode's double-mount in dev.
root.render(<App />);
