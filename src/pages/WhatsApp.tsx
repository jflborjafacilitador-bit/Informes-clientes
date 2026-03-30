import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageCircle, Plus, Wifi, WifiOff, QrCode, Trash2, Settings,
  Bot, RefreshCw, Copy, CheckCircle, Send,
  AlertCircle, Loader2, Phone, User, X, Save,
  ToggleLeft, ToggleRight, Zap, MessageSquare, Activity
} from 'lucide-react';
import {
  whatsappService, evolutionApi,
  DEFAULT_LLMS_CONTEXT,
  type WhatsappInstance, type WhatsappMessage, type WhatsappStatus
} from '../services/whatsappService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusConfig: Record<WhatsappStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  connected:    { label: 'Conectado',     color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: <Wifi size={13}/> },
  qr_ready:     { label: 'QR Listo',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: <QrCode size={13}/> },
  disconnected: { label: 'Desconectado',  color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: <WifiOff size={13}/> },
  error:        { label: 'Error',         color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    icon: <AlertCircle size={13}/> },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return 'ahora';
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)}h`;
  return `hace ${Math.floor(diff / 86400000)}d`;
}

// ─── Modal: Crear Instancia ───────────────────────────────────────────────────
function CreateInstanceModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [label, setLabel] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!label.trim() || !name.trim()) { setError('Completa todos los campos'); return; }
    setLoading(true); setError('');
    try {
      await whatsappService.createInstance({
        instance_name: name,
        phone_label: label,
        llms_context: DEFAULT_LLMS_CONTEXT,
      });
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear instancia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(7,9,14,0.98) 0%, rgba(15,20,30,0.98) 100%)',
        border: '1px solid rgba(34,197,94,0.25)', borderRadius: '20px',
        padding: '2rem', width: '420px', maxWidth: '95vw',
        boxShadow: '0 0 60px rgba(34,197,94,0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={18} color="#22c55e" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Nueva Instancia</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
              Nombre visible *
            </label>
            <input
              value={label} onChange={e => setLabel(e.target.value)}
              placeholder="Ej: Línea de Ventas"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
              ID de instancia * <span style={{ color: 'rgba(255,255,255,0.3)' }}>(sin espacios, minúsculas)</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="Ej: ventas-quetzales"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-main)', fontSize: '0.9rem', fontFamily: 'monospace', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>
              Cancelar
            </button>
            <button onClick={handleCreate} disabled={loading} style={{
              flex: 1, padding: '11px', borderRadius: '10px',
              background: loading ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.9)',
              border: 'none', color: '#000', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }}/> Creando...</> : <><Plus size={15}/> Crear</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: QR Code ──────────────────────────────────────────────────────────
function QRModal({ instance, onClose, onConnected }: {
  instance: WhatsappInstance;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [qr, setQr] = useState<string>(instance.qr_code ?? '');
  const [loading, setLoading] = useState(!instance.qr_code);
  const [polling, setPolling] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQR = useCallback(async () => {
    try {
      const qrBase64 = await evolutionApi.getQRCode(instance.instance_name);
      if (qrBase64) {
        setQr(qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`);
        await whatsappService.updateInstance(instance.id, { qr_code: qrBase64, status: 'qr_ready' });
      }
    } catch { /* silenciar */ }
    finally { setLoading(false); }
  }, [instance.instance_name, instance.id]);

  const checkStatus = useCallback(async () => {
    const state = await evolutionApi.getConnectionState(instance.instance_name);
    if (state === 'open') {
      await whatsappService.updateInstance(instance.id, { status: 'connected', qr_code: null });
      setPolling(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      onConnected();
      onClose();
    }
  }, [instance.instance_name, instance.id, onConnected, onClose]);

  useEffect(() => {
    fetchQR();
    intervalRef.current = setInterval(checkStatus, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchQR, checkStatus]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(7,9,14,0.99) 0%, rgba(15,20,30,0.99) 100%)',
        border: '1px solid rgba(245,158,11,0.25)', borderRadius: '20px',
        padding: '2rem', width: '400px', maxWidth: '95vw', textAlign: 'center',
        boxShadow: '0 0 60px rgba(245,158,11,0.08)',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20}/>
        </button>

        <div style={{ marginBottom: '1rem' }}>
          <QrCode size={32} color="#f59e0b" style={{ marginBottom: 8 }}/>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Escanea el QR</h3>
          <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {instance.phone_label} · Verificando cada 5s...
          </p>
        </div>

        <div style={{
          width: '240px', height: '240px', margin: '0 auto',
          background: 'white', borderRadius: '12px', padding: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {loading ? (
            <Loader2 size={40} color="#22c55e" style={{ animation: 'spin 1s linear infinite' }}/>
          ) : qr ? (
            <img src={qr} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
          ) : (
            <p style={{ color: '#333', fontSize: '0.8rem' }}>No se pudo cargar el QR</p>
          )}
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={fetchQR} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={13}/> Regenerar QR
          </button>
          {polling && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }}/> Esperando...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Drawer: Monitor de Chat ─────────────────────────────────────────────────
function ChatMonitorDrawer({ instance, onClose }: {
  instance: WhatsappInstance;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const msgs = await whatsappService.getMessages(instance.id);
      setMessages(msgs);
    } catch (e) {
      console.error("Error loading chat:", e);
    } finally {
      setLoadingMsgs(false);
    }
  }, [instance.id]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds for new messages
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    // Auto scroll
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      // Por ahora simulamos o guardamos en Supabase si tuviéramos tabla separada de envíos manuales
      // alert('Esta función de envío manual puede integrarse con Evolution API.');
      setReplyText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: '450px', maxWidth: '100vw', zIndex: 900,
      background: 'linear-gradient(180deg, rgba(7,9,14,0.99) 0%, rgba(10,14,22,0.99) 100%)',
      borderLeft: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{
        padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', zIndex: 2
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
            <X size={22}/>
          </button>
          <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={18} color="#22c55e"/>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Monitor de Chat</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 5px #22c55e' }}/>
              En vivo · {instance.phone_label}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
        background: 'radial-gradient(circle at center, rgba(34,197,94,0.02) 0%, transparent 70%)'
      }}>
        {loadingMsgs ? (
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }}/>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <MessageSquare size={48} style={{ opacity: 0.1, marginBottom: 16 }}/>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>El historial de chat está vacío.</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', opacity: 0.5 }}>Los mensajes entrantes aparecerán aquí.</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              
              {/* Lead Message (Left) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '85%' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px', marginLeft: '4px' }}>
                  {msg.phone_name ?? msg.phone_from} • {timeAgo(msg.created_at)}
                </span>
                <div style={{
                  padding: '10px 14px', borderRadius: '16px', borderBottomLeftRadius: '4px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-main)', fontSize: '0.85rem', lineHeight: 1.4,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}>
                  {msg.message_in}
                </div>
              </div>

              {/* Bot/Agent Reply (Right) */}
              {msg.message_out && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: '85%', alignSelf: 'flex-end', marginTop: 4 }}>
                  <span style={{ fontSize: '0.65rem', color: msg.responded_by === 'ai' ? '#22c55e' : '#818cf8', marginBottom: '4px', marginRight: '4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {msg.responded_by === 'ai' ? <><Bot size={10}/> IA Assistant</> : <><User size={10}/> Manual</>}
                    <span style={{ color: 'var(--text-muted)' }}> • {timeAgo(msg.created_at)}</span>
                  </span>
                  <div style={{
                    padding: '10px 14px', borderRadius: '16px', borderBottomRightRadius: '4px',
                    background: msg.responded_by === 'ai' ? 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(21,128,61,0.2) 100%)' : 'rgba(99,102,241,0.15)',
                    border: msg.responded_by === 'ai' ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(99,102,241,0.3)',
                    color: 'var(--text-main)', fontSize: '0.85rem', lineHeight: 1.4,
                    boxShadow: msg.responded_by === 'ai' ? '0 4px 20px rgba(34,197,94,0.08)' : '0 4px 20px rgba(99,102,241,0.08)'
                  }}>
                    {msg.message_out}
                  </div>
                </div>
              )}

            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area (Placeholder) */}
      <div style={{
        padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: '8px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px', padding: '6px'
        }}>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Intervenir en la conversación (Próximamente)..."
            disabled
            rows={1}
            style={{
              flex: 1, background: 'transparent', border: 'none', color: 'var(--text-main)',
              fontSize: '0.85rem', padding: '8px 10px', resize: 'none', outline: 'none',
              maxHeight: '120px', minHeight: '36px',
            }}
          />
          <button onClick={handleSend} disabled={!replyText.trim() || sending} style={{
            width: 36, height: 36, borderRadius: '12px',
            background: replyText.trim() ? '#22c55e' : 'rgba(255,255,255,0.05)',
            border: 'none', color: replyText.trim() ? '#000' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: replyText.trim() ? 'pointer' : 'not-allowed', flexShrink: 0,
            transition: 'all 0.2s',
          }}>
            {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }}/> : <Send size={16}/>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Drawer: Config de Instancia ─────────────────────────────────────────────
function InstanceDrawer({ instance, onClose, onUpdate }: {
  instance: WhatsappInstance;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [tab, setTab] = useState<'general' | 'context'>('general');
  const [context, setContext] = useState(instance.llms_context ?? DEFAULT_LLMS_CONTEXT);
  const [savingCtx, setSavingCtx] = useState(false);
  const [ctxSaved, setCtxSaved] = useState(false);

  useEffect(() => {
    setContext(instance.llms_context ?? DEFAULT_LLMS_CONTEXT);
  }, [instance.llms_context]);

  const saveContext = async () => {
    setSavingCtx(true);
    try {
      await whatsappService.saveContext(instance.id, context);
      setCtxSaved(true);
      setTimeout(() => setCtxSaved(false), 2500);
      onUpdate();
    } finally { setSavingCtx(false); }
  };

  const tabs = [
    { key: 'general', label: 'General', icon: <Settings size={13}/> },
    { key: 'context', label: 'Contexto IA', icon: <Bot size={13}/> },
  ] as const;

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: '520px', maxWidth: '95vw', zIndex: 900,
      background: 'linear-gradient(180deg, rgba(7,9,14,0.99) 0%, rgba(10,14,22,0.99) 100%)',
      borderLeft: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={18} color="#22c55e"/>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{instance.phone_label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{instance.instance_name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
            <X size={20}/>
          </button>
        </div>

        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: '20px', background: sc.bg, border: `1px solid ${sc.color}33`, color: sc.color, fontSize: '0.78rem', fontWeight: 500 }}>
            {sc.icon} {sc.label}
          </span>
          {instance.phone_number && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Phone size={11}/> {instance.phone_number}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 1.5rem' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 14px', background: 'transparent',
            border: 'none', borderBottom: tab === t.key ? '2px solid #22c55e' : '2px solid transparent',
            color: tab === t.key ? '#22c55e' : 'var(--text-muted)',
            cursor: 'pointer', fontSize: '0.82rem', fontWeight: tab === t.key ? 600 : 400,
            display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>

        {/* General */}
        {tab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <InfoRow label="ID Instancia" value={instance.instance_name} mono/>
            <InfoRow label="Número" value={instance.phone_number ?? 'No conectado'}/>
            <InfoRow label="Webhook" value={instance.webhook_url ?? 'No configurado'} mono small/>
            <InfoRow label="Modelo IA" value={instance.ai_model}/>
            <InfoRow label="Creado" value={timeAgo(instance.created_at)}/>

            <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Webhook URL para Evolution API</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code style={{ flex: 1, fontSize: '0.7rem', color: '#22c55e', wordBreak: 'break-all' }}>
                  {instance.webhook_url}
                </code>
                <button onClick={() => navigator.clipboard.writeText(instance.webhook_url ?? '')}
                  style={{ padding: '5px 8px', borderRadius: '6px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', cursor: 'pointer', flexShrink: 0 }}>
                  <Copy size={13}/>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contexto IA */}
        {tab === 'context' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Instrucciones del Agente IA</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Este contexto guía las respuestas de DeepSeek
                </div>
              </div>
              <button onClick={saveContext} disabled={savingCtx} style={{
                padding: '8px 14px', borderRadius: '8px',
                background: ctxSaved ? 'rgba(34,197,94,0.9)' : 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.3)',
                color: ctxSaved ? '#000' : '#22c55e',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all 0.3s',
              }}>
                {savingCtx ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }}/> :
                 ctxSaved ? <><CheckCircle size={13}/> Guardado</> :
                 <><Save size={13}/> Guardar</>}
              </button>
            </div>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              style={{
                flex: 1, minHeight: '60vh', padding: '14px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-main)', fontSize: '0.78rem', resize: 'vertical',
                outline: 'none', fontFamily: 'monospace', lineHeight: 1.6,
              }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>{context.length} caracteres</span>
              <button onClick={() => setContext(DEFAULT_LLMS_CONTEXT)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline' }}>
                Restaurar default
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── InfoRow helper ───────────────────────────────────────────────────────────
function InfoRow({ label, value, mono = false, small = false }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{
        fontSize: small ? '0.72rem' : '0.85rem',
        color: 'var(--text-main)',
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: 'break-all',
      }}>{value}</span>
    </div>
  );
}

// ─── Card de Instancia ────────────────────────────────────────────────────────
function InstanceCard({ instance, onRefresh, onConfig, onChat, onShowQR, onDelete: _onDelete }: {
  instance: WhatsappInstance;
  onRefresh: () => void;
  onConfig: () => void;
  onChat: () => void;
  onShowQR: () => void;
  onDelete: () => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const sc = statusConfig[instance.status];

  const handleToggleAI = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setToggling(true);
    try {
      await whatsappService.toggleAI(instance.id, !instance.ai_enabled);
      onRefresh();
    } finally { setToggling(false); }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${instance.phone_label}"? Esta acción es irreversible.`)) return;
    setDeleting(true);
    try {
      await whatsappService.deleteInstance(instance.id, instance.instance_name);
      onRefresh();
    } finally { setDeleting(false); }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15,20,30,0.8) 0%, rgba(7,9,14,0.8) 100%)',
      border: instance.status === 'connected'
        ? '1px solid rgba(34,197,94,0.2)'
        : '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px', padding: '1.25rem',
      display: 'flex', flexDirection: 'column', gap: '0.9rem',
      backdropFilter: 'blur(10px)',
      boxShadow: instance.status === 'connected' ? '0 0 20px rgba(34,197,94,0.04)' : 'none',
      transition: 'all 0.3s ease',
      cursor: 'default',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '11px',
            background: instance.status === 'connected' ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${instance.status === 'connected' ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageCircle size={20} color={instance.status === 'connected' ? '#22c55e' : '#6b7280'}/>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{instance.phone_label}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 1 }}>
              {instance.instance_name}
            </div>
          </div>
        </div>

        {/* Status badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 9px', borderRadius: '20px',
          background: sc.bg, border: `1px solid ${sc.color}33`,
          color: sc.color, fontSize: '0.72rem', fontWeight: 500, flexShrink: 0,
        }}>
          {sc.icon} {sc.label}
        </span>
      </div>

      {/* Phone */}
      {instance.phone_number && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Phone size={12}/> {instance.phone_number}
        </div>
      )}

      {/* AI Toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderRadius: '10px',
        background: instance.ai_enabled ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${instance.ai_enabled ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)'}`,
        transition: 'all 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Bot size={15} color={instance.ai_enabled ? '#22c55e' : '#6b7280'}/>
          <span style={{ fontSize: '0.82rem', color: instance.ai_enabled ? '#22c55e' : 'var(--text-muted)', fontWeight: instance.ai_enabled ? 600 : 400 }}>
            {instance.ai_enabled ? 'Agente IA Activo' : 'IA Desactivada'}
          </span>
        </div>
        <button onClick={handleToggleAI} disabled={toggling} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: instance.ai_enabled ? '#22c55e' : '#6b7280', padding: 2 }}>
          {toggling ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }}/> :
           instance.ai_enabled ? <ToggleRight size={22}/> : <ToggleLeft size={22}/>}
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onChat} style={{
          flex: 1.5, padding: '8px', borderRadius: '9px',
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
          color: '#22c55e', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.15)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.1)'; }}>
          <MessageSquare size={14}/> Mensajes
        </button>

        <button onClick={onConfig} style={{
          flex: 1, padding: '8px', borderRadius: '9px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-main)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
          <Settings size={13}/> Config
        </button>

        {instance.status !== 'connected' && (
          <button onClick={onShowQR} style={{
            flex: 1, padding: '8px', borderRadius: '9px',
            background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)',
            color: '#f59e0b', cursor: 'pointer', fontSize: '0.78rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            <QrCode size={13}/> {instance.status === 'disconnected' ? 'Conectar' : 'Ver QR'}
          </button>
        )}

        {instance.status === 'connected' && (
          <button onClick={() => evolutionApi.logoutInstance(instance.instance_name).then(onRefresh)}
            style={{
              flex: 1, padding: '8px', borderRadius: '9px',
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)',
              color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
            <WifiOff size={13}/> Desconectar
          </button>
        )}

        <button onClick={handleDelete} disabled={deleting} style={{
          padding: '8px 10px', borderRadius: '9px',
          background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)',
          color: '#ef4444', cursor: 'pointer',
        }}>
          {deleting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }}/> : <Trash2 size={13}/>}
        </button>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function WhatsApp() {
  const [instances, setInstances] = useState<WhatsappInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showQR, setShowQR] = useState<WhatsappInstance | null>(null);
  const [activeConfig, setActiveConfig] = useState<WhatsappInstance | null>(null);
  const [activeChat, setActiveChat] = useState<WhatsappInstance | null>(null);

  const loadInstances = useCallback(async () => {
    try {
      const data = await whatsappService.getInstances();

      // Sincronizar estado real desde Evolution API en paralelo
      const synced = await Promise.all(data.map(async (inst) => {
        try {
          const realState = await evolutionApi.getConnectionState(inst.instance_name);
          const newStatus: WhatsappStatus =
            realState === 'open'       ? 'connected'    :
            realState === 'connecting' ? 'qr_ready'     : 'disconnected';

          if (newStatus !== inst.status) {
            await whatsappService.updateInstance(inst.id, { status: newStatus });
            return { ...inst, status: newStatus };
          }
        } catch { /* si falla Evolution API, mantener estado actual */ }
        return inst;
      }));

      setInstances(synced);
    } catch { /* silenciar */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadInstances();
    const unsub = whatsappService.subscribeToInstances(setInstances);
    return () => { unsub(); };
  }, [loadInstances]);


  // Stats
  const connected = instances.filter(i => i.status === 'connected').length;
  const aiActive = instances.filter(i => i.ai_enabled).length;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '13px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={24} color="#22c55e"/>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>WhatsApp AI Agent</h1>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Gestiona tus instancias de WhatsApp y agente de IA
              </p>
            </div>
          </div>
        </div>

        <button onClick={() => setShowCreate(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px', borderRadius: '12px',
          background: 'rgba(34,197,94,0.9)', border: 'none',
          color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem',
          boxShadow: '0 4px 20px rgba(34,197,94,0.25)',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Plus size={16}/> Nueva Instancia
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { icon: <Activity size={18} color="#22c55e"/>, label: 'Total instancias', value: instances.length, color: '#22c55e' },
          { icon: <Wifi size={18} color="#22c55e"/>, label: 'Conectadas', value: connected, color: '#22c55e' },
          { icon: <Bot size={18} color="#6366f1"/>, label: 'IA Activa', value: aiActive, color: '#6366f1' },
          { icon: <Zap size={18} color="#f59e0b"/>, label: 'Webhook n8n', value: 'Activo', color: '#f59e0b', isText: true },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '1rem 1.2rem', borderRadius: '14px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <div style={{ width: 38, height: 38, borderRadius: '10px', background: `${s.color}12`, border: `1px solid ${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Webhook info bar ────────────────────────────────────────────────── */}
      <div style={{
        marginBottom: '1.5rem', padding: '12px 16px', borderRadius: '12px',
        background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)',
        display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
      }}>
        <Zap size={14} color="#22c55e"/>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Webhook n8n:</span>
        <code style={{ fontSize: '0.75rem', color: '#22c55e', flex: 1 }}>
          {`${import.meta.env.VITE_N8N_BASE_URL}/webhook/whatsapp-agent`}
        </code>
        <button onClick={() => navigator.clipboard.writeText(`${import.meta.env.VITE_N8N_BASE_URL}/webhook/whatsapp-agent`)}
          style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', cursor: 'pointer' }}>
          <Copy size={12}/>
        </button>
      </div>

      {/* ── Grid de instancias ──────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }}/>
          <p>Cargando instancias...</p>
        </div>
      ) : instances.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', borderRadius: '20px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <MessageCircle size={56} style={{ opacity: 0.12, marginBottom: 16, color: '#22c55e' }}/>
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontWeight: 400 }}>Sin instancias</h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.25)' }}>
            Crea tu primera instancia de WhatsApp para comenzar
          </p>
          <button onClick={() => setShowCreate(true)} style={{
            padding: '10px 20px', borderRadius: '10px',
            background: 'rgba(34,197,94,0.9)', border: 'none',
            color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem',
            display: 'inline-flex', alignItems: 'center', gap: 7,
          }}>
            <Plus size={15}/> Crear Primera Instancia
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {instances.map(instance => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onRefresh={loadInstances}
              onConfig={() => setActiveConfig(instance)}
              onChat={() => setActiveChat(instance)}
              onShowQR={() => setShowQR(instance)}
              onDelete={loadInstances}
            />
          ))}
        </div>
      )}

      {/* ── Modales y Drawer ─────────────────────────────────────────────────── */}
      {showCreate && (
        <CreateInstanceModal onClose={() => setShowCreate(false)} onCreated={loadInstances}/>
      )}

      {showQR && (
        <QRModal instance={showQR} onClose={() => setShowQR(null)} onConnected={loadInstances}/>
      )}

      {activeConfig && (
        <>
          <div onClick={() => setActiveConfig(null)} style={{ position: 'fixed', inset: 0, zIndex: 850, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}/>
          <InstanceDrawer
            instance={activeConfig}
            onClose={() => setActiveConfig(null)}
            onUpdate={() => {
              loadInstances();
              whatsappService.getInstance(activeConfig.id).then(i => i && setActiveConfig(i));
            }}
          />
        </>
      )}

      {activeChat && (
        <>
          <div onClick={() => setActiveChat(null)} style={{ position: 'fixed', inset: 0, zIndex: 850, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}/>
          <ChatMonitorDrawer
            instance={activeChat}
            onClose={() => setActiveChat(null)}
          />
        </>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
