/**
 * Mini icon set (filled / line) - lightweight inline SVGs avoiding emoji.
 * Sized 1em and inherits color via currentColor.
 */
const I = ({ d, size = 18, fill = "none", stroke = "currentColor", strokeWidth = 1.8, viewBox = "0 0 24 24", children, ...rest }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={viewBox}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...rest}
    >
        {d ? <path d={d} /> : children}
    </svg>
);

export const ArrowLeft = (p) => <I {...p} d="M19 12H5M12 19l-7-7 7-7" />;
export const ArrowRight = (p) => <I {...p} d="M5 12h14M12 5l7 7-7 7" />;
export const ChevronRight = (p) => <I {...p} d="M9 18l6-6-6-6" />;
export const ChevronLeft = (p) => <I {...p} d="M15 18l-6-6 6-6" />;
export const ChevronDown = (p) => <I {...p} d="M6 9l6 6 6-6" />;
export const Eye = (p) => <I {...p} d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 15a3 3 0 100-6 3 3 0 000 6z" />;
export const EyeOff = (p) => <I {...p} d="M17.94 17.94A10.94 10.94 0 0112 19C5.5 19 2 12 2 12a18.45 18.45 0 015.06-5.94M9.9 4.24A10.94 10.94 0 0112 4c6.5 0 10 7 10 7a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />;
export const Mail = (p) => <I {...p} d="M4 4h16v16H4zM4 4l8 8 8-8" />;
export const Lock = (p) => <I {...p} d="M5 11h14v10H5zM7 11V7a5 5 0 0110 0v4" />;
export const User = (p) => <I {...p} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z" />;
export const Bell = (p) => <I {...p} d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 01-3.4 0" />;
export const Shield = (p) => <I {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
export const Map = (p) => <I {...p} d="M9 3l-7 3v15l7-3 6 3 7-3V3l-7 3-6-3z M9 3v15M15 6v15" />;
export const Pin = (p) => <I {...p} d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 13a3 3 0 100-6 3 3 0 000 6z" />;
export const Calendar = (p) => <I {...p} d="M3 6h18v15H3z M3 10h18 M8 3v4 M16 3v4" />;
export const Search = (p) => <I {...p} d="M21 21l-5-5 M11 18a7 7 0 110-14 7 7 0 010 14z" />;
export const Filter = (p) => <I {...p} d="M3 5h18 M6 12h12 M10 19h4" />;
export const Star = (p) => <I {...p} d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />;
export const Stars = (p) => <I {...p} d="M12 2l2 5 5 1-4 4 1 5-4-2-4 2 1-5-4-4 5-1z" />;
export const Settings = (p) => <I {...p} d="M12 8a4 4 0 100 8 4 4 0 000-8z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15 1.65 1.65 0 003.09 14H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9 1.65 1.65 0 004.27 7.18L4.21 7.12a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 008.91 4.6 1.65 1.65 0 0010 3.09V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.31.74.92 1.31 1.69 1.51H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />;
export const Compass = (p) => <I {...p} d="M12 22a10 10 0 100-20 10 10 0 000 20z M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />;
export const Camera = (p) => <I {...p} d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z M12 17a4 4 0 100-8 4 4 0 000 8z" />;
export const Speed = (p) => <I {...p} d="M12 22a10 10 0 110-20 10 10 0 010 20z M12 12L8 8" />;
export const Logout = (p) => <I {...p} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9" />;
export const Bolt = (p) => <I {...p} d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor" stroke="none" />;
export const Check = (p) => <I {...p} d="M20 6L9 17l-5-5" />;
export const X = (p) => <I {...p} d="M18 6L6 18M6 6l12 12" />;
export const Plus = (p) => <I {...p} d="M12 5v14M5 12h14" />;
export const Share = (p) => <I {...p} d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8 M16 6l-4-4-4 4 M12 2v13" />;
export const Heart = (p) => <I {...p} d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />;
export const Phone = (p) => <I {...p} d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />;
export const Sparkles = (p) => <I {...p} d="M12 3l1.9 5.6 5.6 1.9-5.6 1.9L12 18l-1.9-5.6-5.6-1.9 5.6-1.9L12 3z M19 14l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1z" />;
export const Trophy = (p) => <I {...p} d="M8 21h8 M12 17v4 M7 4h10v5a5 5 0 01-10 0V4z M17 5h2a2 2 0 012 2v1a3 3 0 01-3 3 M7 5H5a2 2 0 00-2 2v1a3 3 0 003 3" />;
export const Gauge = (p) => <I {...p} d="M12 14a2 2 0 100-4 2 2 0 000 4z M12 12l4-4 M21 12a9 9 0 10-18 0" />;
export const Crosshair = (p) => <I {...p} d="M12 2v4M12 18v4M2 12h4M18 12h4 M12 22a10 10 0 100-20 10 10 0 000 20z" />;
export const Coffee = (p) => <I {...p} d="M3 8h14a4 4 0 010 8H3V8z M17 12h2a3 3 0 010 6h-2 M3 4v2 M7 4v2 M11 4v2" />;
export const Wrench = (p) => <I {...p} d="M14.7 6.3a4 4 0 005.4 5.4l-9.4 9.4a2.83 2.83 0 11-4-4l9.4-9.4-1.4 1.4 1.4-1.4z" />;
export const Car = (p) => <I {...p} d="M14 16H9 M3 10l2-6h14l2 6 M5 10h14a2 2 0 012 2v5h-2a2 2 0 11-4 0H9a2 2 0 11-4 0H3v-5a2 2 0 012-2z" />;
export const ParkingSquare = (p) => <I {...p} d="M3 3h18v18H3z M9 17V7h4a3 3 0 010 6H9" />;
export const Truck = (p) => <I {...p} d="M1 7h13v10H1z M14 11h4l3 3v3h-7v-6z M5.5 19a2.5 2.5 0 100-5 2.5 2.5 0 000 5z M17.5 19a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />;
export const Tire = (p) => <I {...p} d="M12 22a10 10 0 100-20 10 10 0 000 20z M12 18a6 6 0 100-12 6 6 0 000 12z M12 14a2 2 0 100-4 2 2 0 000 4z" />;
export const Apple = (p) => <I {...p} d="M16.4 6.5c-.4-.5-1.4-1.5-2.9-1.5-1.5 0-2 .9-3.5.9-1.4 0-2.1-.9-3.5-.9-1.5 0-3.4 1.2-4.4 3-1.4 2.3-1 6.7 1.5 9.6 1 1.1 2 2.3 3.4 2.3 1.4 0 1.7-.9 3.5-.9 1.7 0 2 .9 3.5.9 1.4 0 2.4-1.3 3.4-2.4.7-.8 1.2-1.7 1.5-2.6-3.5-1.4-3.6-6.5-.5-7.5z M12.4 4c.3-.7 0-1.5-.5-2-.5-.5-1.4-.7-2.1-.4.1.7.4 1.4.9 1.9.5.5 1.1.6 1.7.5z" fill="currentColor" stroke="none" />;
export const Google = (p) => <I {...p} viewBox="0 0 48 48" stroke="none" fill="currentColor"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C33.5 6.1 28.9 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 8 3l5.7-5.7C33.5 6.1 28.9 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c4.8 0 9.2-1.8 12.6-4.8l-5.8-4.9c-2 1.4-4.5 2.2-7.4 2.2-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C8.6 39.5 15.7 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l5.8 4.9c-.4.4 6.1-4.5 6.1-13.7 0-1.3-.1-2.4-.4-3.5z"/></I>;
export const Verified = (p) => <I {...p} d="M9 12l2 2 4-4 M12 22a10 10 0 100-20 10 10 0 000 20z" />;
export const Fingerprint = (p) => <I {...p} d="M12 2a10 10 0 100 20M6 12a6 6 0 0112 0c0 5-2 7-2 7M9 21s2-2 2-9a3 3 0 016 0M3 12a9 9 0 016-8" />;
export const RotateKey = (p) => <I {...p} d="M21 2v6h-6 M3 12a9 9 0 0115-6.7L21 8" />;
export const Info = (p) => <I {...p} d="M12 22a10 10 0 100-20 10 10 0 000 20z M12 16v-4 M12 8h.01" />;
export const Globe = (p) => <I {...p} d="M12 22a10 10 0 100-20 10 10 0 000 20z M2 12h20 M12 2a15 15 0 010 20 15 15 0 010-20z" />;
export const FileText = (p) => <I {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />;
export const Privacy = (p) => <I {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4" />;
export const CardPay = (p) => <I {...p} d="M2 7h20v12H2z M2 11h20" />;
export const Bank = (p) => <I {...p} d="M3 21h18 M3 10h18 M5 21V10 M9 21V10 M15 21V10 M19 21V10 M2 7l10-5 10 5" />;
export const Smartphone = (p) => <I {...p} d="M5 2h14v20H5z M12 18h.01" />;
export const Trash = (p) => <I {...p} d="M3 6h18 M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />;
export const Plus2 = Plus;
export const NavigateTo = (p) => <I {...p} d="M3 11l18-8-8 18-2-7-8-3z" />;

export const PartnerIcon = ({ name, ...rest }) => {
    const map = {
        "car-wash": Car,
        sparkles: Sparkles,
        coffee: Coffee,
        tire: Tire,
        parking: ParkingSquare,
        wrench: Wrench,
        shield: Shield,
        truck: Truck,
    };
    const Cmp = map[name] || Car;
    return <Cmp {...rest} />;
};
