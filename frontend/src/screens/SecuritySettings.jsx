import { useEffect, useState, useCallback } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import TopBar from "../components/TopBar";
import {
    Lock, Verified, Fingerprint, RotateKey, Smartphone, ChevronRight, X, Check, Trash, Eye, EyeOff, Bolt
} from "../components/Icons";

export default function SecuritySettings() {
    const { user, refresh } = useAuth();
    const [status, setStatus] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [modal, setModal] = useState(null); // 'change-password' | '2fa-setup' | '2fa-disable' | 'biometric-info'
    const [biometricSupported, setBiometricSupported] = useState(false);

    const load = useCallback(async () => {
        const [{ data: s }, { data: sess }] = await Promise.all([
            api.get("/auth/security/status"),
            api.get("/auth/sessions"),
        ]);
        setStatus(s);
        setSessions(sess);
    }, []);

    useEffect(() => {
        load();
        if (window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) {
            window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
                .then(setBiometricSupported)
                .catch(() => setBiometricSupported(false));
        }
    }, [load]);

    const enableBiometric = async () => {
        try {
            const { data: options } = await api.post("/auth/biometric/register/options");
            const opts = decodeOptions(options);
            const cred = await navigator.credentials.create({ publicKey: opts });
            const credForServer = encodeCredentialForServer(cred);
            await api.post("/auth/biometric/register/verify", credForServer);
            await load();
            await refresh();
            alert("Biometria ativada com sucesso!");
        } catch (e) {
            alert("Erro ao ativar biometria: " + (e.message || e.response?.data?.detail || "cancelado"));
        }
    };

    const disableBiometric = async () => {
        if (!confirm("Desativar login biométrico?")) return;
        await api.post("/auth/biometric/disable");
        await load();
    };

    const revokeSession = async (deviceId, isCurrent) => {
        if (!confirm(isCurrent ? "Esta é a sessão atual. Vais ter de fazer login outra vez. Continuar?" : "Remover este dispositivo?")) return;
        try {
            await api.delete(`/auth/sessions/${deviceId}`);
            if (isCurrent) {
                window.location.href = "/login";
                return;
            }
            await load();
        } catch (e) {
            alert(formatApiErrorDetail(e.response?.data?.detail));
        }
    };

    if (!status) return <div className="text-zinc-500 text-center py-20 font-mono-tech text-xs uppercase tracking-widest">A carregar...</div>;

    const isSocial = status.auth_provider === "google";

    return (
        <div data-testid="security-settings">
            <TopBar title="SEGURANÇA" subtitle="Status & Devices" />
            <div className="px-5 pt-5">
                <div className={`rounded-2xl p-5 mb-6 text-center ${
                    status.two_factor_enabled || status.biometric_enabled
                        ? "bg-gradient-to-br from-green-600/15 to-transparent border border-green-500/30"
                        : "bg-gradient-to-br from-amber-600/10 to-transparent border border-amber-500/30"
                }`}>
                    <Verified size={32} className={`mx-auto mb-2 ${status.two_factor_enabled || status.biometric_enabled ? "text-green-500" : "text-amber-400"}`} />
                    <div className={`text-[10px] uppercase tracking-[0.3em] font-bold ${status.two_factor_enabled || status.biometric_enabled ? "text-green-500" : "text-amber-400"}`}>
                        {status.two_factor_enabled || status.biometric_enabled ? "Active Shield" : "Reforça a tua segurança"}
                    </div>
                    <div className="font-display font-black text-2xl text-white mt-1">
                        {status.two_factor_enabled || status.biometric_enabled ? "PROTECTED" : "BÁSICO"}
                    </div>
                </div>

                <div className="space-y-3 mb-7">
                    <SecurityRow
                        Icon={RotateKey}
                        title="Alterar Password"
                        subtitle={isSocial ? "Não disponível para login social" : "Atualiza a tua password"}
                        onClick={() => !isSocial && setModal("change-password")}
                        disabled={isSocial}
                        testid="sec-change-password"
                    />
                    <SecurityRow
                        Icon={Verified}
                        title="Autenticação 2FA"
                        subtitle={status.two_factor_enabled ? "Ativada · Google Authenticator" : "Adiciona um código de 6 dígitos no login"}
                        onClick={() => setModal(status.two_factor_enabled ? "2fa-disable" : "2fa-setup")}
                        active={status.two_factor_enabled}
                        testid="sec-2fa"
                    />
                    <SecurityRow
                        Icon={Fingerprint}
                        title="Login Biométrico"
                        subtitle={
                            !biometricSupported
                                ? "Não suportado neste dispositivo"
                                : status.biometric_enabled
                                  ? "Ativada · Face/Touch ID"
                                  : "Ativa Face ID / Touch ID / Windows Hello"
                        }
                        onClick={() => biometricSupported && (status.biometric_enabled ? disableBiometric() : enableBiometric())}
                        active={status.biometric_enabled}
                        disabled={!biometricSupported}
                        testid="sec-bio"
                    />
                </div>

                <h3 className="font-display font-bold text-white text-base mb-3">
                    Dispositivos Confiáveis
                    <span className="ml-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono-tech font-normal">{sessions.length} ativos</span>
                </h3>
                <div className="space-y-2 mb-6">
                    {sessions.map((s) => (
                        <div key={s.device_id} className="bg-[#0F0F11] border border-white/5 rounded-xl p-3 flex items-center gap-3" data-testid={`session-${s.device_id}`}>
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center"><Smartphone size={18} /></div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-white text-sm flex items-center gap-2">
                                    {s.label}
                                    {s.current && <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[9px] font-bold uppercase tracking-wider">Atual</span>}
                                </div>
                                <div className="text-zinc-500 text-[11px]">{new Date(s.last_seen).toLocaleString("pt-PT")} · {s.ip}</div>
                            </div>
                            <button onClick={() => revokeSession(s.device_id, s.current)} className="w-9 h-9 rounded-full bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400 flex items-center justify-center" data-testid={`revoke-${s.device_id}`}>
                                <Trash size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="text-zinc-500 text-[11px] leading-relaxed text-center mb-6">
                    Os teus dados são encriptados com AES-256. As credenciais biométricas nunca saem do teu dispositivo.
                </div>
            </div>

            {modal === "change-password" && <ChangePasswordModal onClose={() => setModal(null)} onDone={load} />}
            {modal === "2fa-setup" && <Setup2FAModal onClose={() => setModal(null)} onDone={load} />}
            {modal === "2fa-disable" && <Disable2FAModal onClose={() => setModal(null)} onDone={load} />}
        </div>
    );
}

function SecurityRow({ Icon, title, subtitle, onClick, active, disabled, testid }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            data-testid={testid}
            className={`w-full flex items-center gap-3 bg-[#0F0F11] border rounded-xl px-4 py-4 hover:border-white/15 transition text-left ${
                active ? "border-green-500/30" : "border-white/5"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${active ? "bg-green-500/15 text-green-400" : "bg-white/5 text-zinc-300"}`}>
                <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm">{title}</div>
                <div className="text-zinc-500 text-[11px] mt-0.5">{subtitle}</div>
            </div>
            {active ? <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[9px] font-bold uppercase tracking-wider">ON</span> : <ChevronRight size={14} className="text-zinc-600" />}
        </button>
    );
}

function Modal({ children, onClose, testid }) {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={onClose} data-testid={testid}>
            <div className="w-full max-w-[430px] bg-[#0a0a0a] rounded-t-3xl border-t border-white/10 max-h-[85vh] overflow-y-auto scout-scroll" onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
}

function ModalHeader({ title, onClose }) {
    return (
        <div className="sticky top-0 z-10 bg-[#0a0a0a] flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="font-display font-bold text-white">{title}</div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center" data-testid="modal-close">
                <X size={14} />
            </button>
        </div>
    );
}

function ChangePasswordModal({ onClose, onDone }) {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        setError("");
        if (next.length < 6) return setError("A nova password tem de ter pelo menos 6 caracteres");
        if (next !== confirm) return setError("As passwords não coincidem");
        setLoading(true);
        try {
            await api.post("/auth/change-password", { current_password: current, new_password: next });
            await onDone();
            alert("Password alterada com sucesso");
            onClose();
        } catch (e) {
            setError(formatApiErrorDetail(e.response?.data?.detail));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal onClose={onClose} testid="change-password-modal">
            <ModalHeader title="Alterar Password" onClose={onClose} />
            <div className="p-5 space-y-3">
                <Field>
                    <input data-testid="cp-current" type={show ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Password atual" className={inputCls} />
                </Field>
                <Field>
                    <input data-testid="cp-new" type={show ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} placeholder="Nova password (mín. 6)" className={inputCls} />
                </Field>
                <Field>
                    <input data-testid="cp-confirm" type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmar nova password" className={inputCls} />
                </Field>
                <button onClick={() => setShow(!show)} className="text-[11px] text-zinc-400 flex items-center gap-1 font-bold uppercase tracking-widest" data-testid="cp-show">
                    {show ? <><EyeOff size={12} /> Ocultar</> : <><Eye size={12} /> Mostrar</>}
                </button>
                {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded">{error}</div>}
                <button onClick={submit} disabled={loading} className="w-full h-12 rounded-md bg-red-600 hover:bg-red-500 text-white font-display font-bold uppercase tracking-widest text-sm disabled:opacity-60 mt-2" data-testid="cp-submit">
                    <Lock size={14} className="inline mr-1.5" /> {loading ? "A guardar..." : "Atualizar Password"}
                </button>
            </div>
        </Modal>
    );
}

function Setup2FAModal({ onClose, onDone }) {
    const [stage, setStage] = useState("loading"); // loading → qr → confirmed
    const [qr, setQr] = useState(null);
    const [secret, setSecret] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        api.post("/auth/2fa/setup").then(({ data }) => {
            setQr(data.qr_png_base64);
            setSecret(data.secret);
            setStage("qr");
        }).catch((e) => {
            alert(formatApiErrorDetail(e.response?.data?.detail));
            onClose();
        });
    }, [onClose]);

    const verify = async () => {
        setError("");
        try {
            await api.post("/auth/2fa/verify", { code });
            setStage("confirmed");
            await onDone();
        } catch (e) {
            setError(formatApiErrorDetail(e.response?.data?.detail));
        }
    };

    return (
        <Modal onClose={onClose} testid="setup-2fa-modal">
            <ModalHeader title="Ativar 2FA" onClose={onClose} />
            <div className="p-5">
                {stage === "loading" && <div className="text-center text-zinc-500 py-12 text-xs uppercase tracking-widest">A gerar...</div>}
                {stage === "qr" && (
                    <>
                        <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                            1. Instala <b className="text-white">Google Authenticator</b> ou <b className="text-white">Authy</b> no telemóvel.
                            <br />2. Digitaliza o QR code abaixo.
                            <br />3. Insere o código de 6 dígitos para confirmar.
                        </p>
                        <div className="bg-white rounded-xl p-4 flex items-center justify-center mb-3">
                            {qr && <img src={`data:image/png;base64,${qr}`} alt="QR" className="w-44 h-44" data-testid="qr-image" />}
                        </div>
                        <div className="text-center mb-4">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono-tech">Código manual:</div>
                            <div className="text-zinc-300 font-mono-tech text-xs break-all px-3" data-testid="2fa-secret">{secret}</div>
                        </div>
                        <input
                            data-testid="2fa-code"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="123456"
                            maxLength={6}
                            inputMode="numeric"
                            className={inputCls + " text-center font-mono-tech text-2xl tracking-[0.3em]"}
                        />
                        {error && <div className="mt-3 text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded">{error}</div>}
                        <button onClick={verify} disabled={code.length !== 6} className="w-full h-12 rounded-md bg-red-600 hover:bg-red-500 text-white font-display font-bold uppercase tracking-widest text-sm mt-4 disabled:opacity-50" data-testid="2fa-verify">
                            <Bolt size={14} className="inline mr-1.5" /> Confirmar e Ativar
                        </button>
                    </>
                )}
                {stage === "confirmed" && (
                    <div className="text-center py-8">
                        <div className="w-20 h-20 mx-auto rounded-full bg-green-500/15 border border-green-500/40 flex items-center justify-center mb-4">
                            <Check size={32} className="text-green-400" strokeWidth={3} />
                        </div>
                        <div className="font-display font-black text-white text-xl">2FA Ativada</div>
                        <p className="text-zinc-400 text-sm mt-2">A próxima vez que entrares vai pedir o código.</p>
                        <button onClick={onClose} className="mt-5 h-11 px-6 rounded-md bg-white/5 text-white text-xs font-bold uppercase tracking-widest" data-testid="2fa-done">Concluir</button>
                    </div>
                )}
            </div>
        </Modal>
    );
}

function Disable2FAModal({ onClose, onDone }) {
    const [code, setCode] = useState("");
    const [error, setError] = useState("");

    const submit = async () => {
        setError("");
        try {
            await api.post("/auth/2fa/disable", { code });
            await onDone();
            alert("2FA desativada");
            onClose();
        } catch (e) {
            setError(formatApiErrorDetail(e.response?.data?.detail));
        }
    };

    return (
        <Modal onClose={onClose} testid="disable-2fa-modal">
            <ModalHeader title="Desativar 2FA" onClose={onClose} />
            <div className="p-5">
                <p className="text-zinc-400 text-sm mb-4">Confirma com o teu código atual do Google Authenticator.</p>
                <input
                    data-testid="d2fa-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    inputMode="numeric"
                    className={inputCls + " text-center font-mono-tech text-2xl tracking-[0.3em]"}
                />
                {error && <div className="mt-3 text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2 rounded">{error}</div>}
                <button onClick={submit} disabled={code.length !== 6} className="w-full h-12 rounded-md bg-red-600 hover:bg-red-500 text-white font-display font-bold uppercase tracking-widest text-sm mt-4 disabled:opacity-50" data-testid="d2fa-submit">
                    Desativar
                </button>
            </div>
        </Modal>
    );
}

const inputCls = "w-full bg-[#0F0F11] border border-white/10 rounded-md h-12 px-4 text-white placeholder:text-zinc-600 text-sm focus:outline-none focus:border-red-500";

function Field({ children }) {
    return <div>{children}</div>;
}

// ----------------- WebAuthn helpers -----------------
function b64urlToBuf(b64url) {
    const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
    const base64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr.buffer;
}

function bufToB64url(buf) {
    const bytes = new Uint8Array(buf);
    let str = "";
    for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeOptions(opts) {
    return {
        ...opts,
        challenge: b64urlToBuf(opts.challenge),
        user: { ...opts.user, id: b64urlToBuf(opts.user.id) },
        excludeCredentials: (opts.excludeCredentials || []).map((c) => ({ ...c, id: b64urlToBuf(c.id) })),
    };
}

function encodeCredentialForServer(cred) {
    return {
        id: cred.id,
        rawId: bufToB64url(cred.rawId),
        type: cred.type,
        response: {
            clientDataJSON: bufToB64url(cred.response.clientDataJSON),
            attestationObject: bufToB64url(cred.response.attestationObject),
        },
    };
}
