import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

const WEBHOOK_URL =
  'https://sparkland.app.n8n.cloud/webhook/e916a394-f8ea-4714-a32b-ea769da02cc2/chat';

function genId() {
  return Math.random().toString(36).substring(2) + Date.now();
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Hai Star! 👋✨\n\nAku Spark Assistant — siap membantu kamu seputar Spark Stage 55. Mau tanya soal booking, harga tiket, fasilitas, atau apa pun? Tanya aja ya! 💗',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(genId);
  const [hasUnread, setHasUnread] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setHasUnread(false);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (windowRef.current && !windowRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    // Delay to avoid closing on the same click that opened
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handler);
    };
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: Message = { id: genId(), role: 'user', text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatInput: text, sessionId }),
      });
      const data = await res.json();
      const botText =
        data?.output || data?.text || data?.message || data?.reply ||
        'Maaf Star, ada gangguan sebentar. Coba lagi ya ✨';

      const botMsg: Message = { id: genId(), role: 'bot', text: botText, timestamp: new Date() };
      setMessages((prev) => [...prev, botMsg]);
      if (!isOpen) setHasUnread(true);
    } catch {
      const errMsg: Message = {
        id: genId(),
        role: 'bot',
        text: 'Maaf Star, koneksi sedang terganggu. Silakan coba lagi sebentar ya 🙏',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, sessionId, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,300;0,6..12,400;0,6..12,600;0,6..12,700;0,6..12,800&display=swap');

        .scw-root {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          font-family: 'Nunito Sans', sans-serif;
        }

        /* ── TOGGLE BUTTON ───────────────────────────────────────── */
        .scw-toggle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff4b86 0%, #c8235e 100%);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 30px rgba(255, 75, 134, 0.45), 0 2px 8px rgba(0,0,0,0.15);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s;
          position: relative;
          overflow: hidden;
        }
        .scw-toggle:hover {
          transform: scale(1.1) translateY(-4px);
          box-shadow: 0 14px 40px rgba(255, 75, 134, 0.55), 0 2px 8px rgba(0,0,0,0.18);
        }
        .scw-toggle:active { transform: scale(0.97); }
        .scw-toggle img {
          width: 38px;
          height: 38px;
          object-fit: contain;
          border-radius: 50%;
          transition: opacity 0.2s;
        }
        .scw-toggle svg {
          color: white;
          width: 26px;
          height: 26px;
        }
        /* Pulse ring */
        .scw-toggle::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid rgba(255,75,134,0.4);
          animation: scw-pulse 2.5s ease-in-out infinite;
        }
        @keyframes scw-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.12); opacity: 0; }
        }

        /* Unread badge */
        .scw-badge {
          position: absolute;
          top: 0; right: 0;
          width: 18px; height: 18px;
          background: #ff3b30;
          border-radius: 50%;
          border: 2px solid white;
          font-size: 10px;
          font-weight: 800;
          color: white;
          display: flex; align-items: center; justify-content: center;
        }

        /* ── CHAT WINDOW ────────────────────────────────────────── */
        .scw-window {
          position: fixed;
          bottom: 100px;
          right: 24px;
          width: 400px;
          height: min(580px, calc(100dvh - 116px));
          max-height: calc(100dvh - 116px);
          background: #fff;
          border-radius: 24px;
          box-shadow:
            0 24px 80px rgba(0,0,0,0.18),
            0 4px 16px rgba(255,75,134,0.12),
            0 0 0 1px rgba(255,75,134,0.08);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: scw-pop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: bottom right;
        }
        @keyframes scw-pop {
          from { opacity: 0; transform: scale(0.88) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* ── HEADER ─────────────────────────────────────────────── */
        .scw-header {
          background: linear-gradient(135deg, #ff4b86 0%, #c8235e 100%);
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          position: relative;
        }
        .scw-header::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 1px;
          background: rgba(255,255,255,0.15);
        }
        .scw-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .scw-header-avatar {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 2.5px solid rgba(255,255,255,0.7);
          overflow: hidden;
          flex-shrink: 0;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .scw-header-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .scw-header-info { color: white; }
        .scw-header-name {
          font-weight: 800;
          font-size: 1.05rem;
          letter-spacing: 0.2px;
          text-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .scw-header-status {
          font-size: 0.78rem;
          opacity: 0.92;
          font-weight: 600;
          margin-top: 2px;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .scw-online-dot {
          width: 7px; height: 7px;
          background: #4ade80;
          border-radius: 50%;
          box-shadow: 0 0 6px #4ade80;
          display: inline-block;
        }
        .scw-close-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 34px; height: 34px;
          border-radius: 50%;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s, transform 0.2s;
          flex-shrink: 0;
        }
        .scw-close-btn:hover {
          background: rgba(255,255,255,0.35);
          transform: scale(1.1);
        }
        .scw-close-btn svg { width: 16px; height: 16px; }

        /* ── MESSAGES AREA ──────────────────────────────────────── */
        .scw-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px 16px;
          background: #fdf6f9;
          display: flex;
          flex-direction: column;
          gap: 4px;
          scroll-behavior: smooth;
        }
        .scw-messages::-webkit-scrollbar { width: 4px; }
        .scw-messages::-webkit-scrollbar-track { background: transparent; }
        .scw-messages::-webkit-scrollbar-thumb { background: rgba(255,75,134,0.2); border-radius: 4px; }

        /* Date divider */
        .scw-date-divider {
          text-align: center;
          margin: 8px 0;
          font-size: 0.72rem;
          color: #9ca3af;
          font-weight: 600;
        }

        /* Row */
        .scw-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          margin-bottom: 6px;
        }
        .scw-row-bot { justify-content: flex-start; }
        .scw-row-user { justify-content: flex-end; }

        /* Bot avatar (small) */
        .scw-bot-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1.5px solid #ffe0ed;
          object-fit: cover;
          flex-shrink: 0;
          background: white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        /* Spacer so user messages align without avatar */
        .scw-row-user .scw-bubble-wrap { align-items: flex-end; }

        .scw-bubble-wrap {
          display: flex;
          flex-direction: column;
          max-width: 75%;
          gap: 3px;
        }

        /* Bubbles */
        .scw-bubble {
          padding: 11px 15px;
          border-radius: 18px;
          font-size: 0.9rem;
          line-height: 1.55;
          word-break: break-word;
          white-space: pre-wrap;
          position: relative;
        }
        .scw-bubble-bot {
          background: #ffffff;
          color: #1f2937;
          border-radius: 4px 18px 18px 18px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07), 0 0 0 1px rgba(255,75,134,0.07);
        }
        .scw-bubble-user {
          background: linear-gradient(135deg, #ff4b86 0%, #e0306e 100%);
          color: white;
          border-radius: 18px 4px 18px 18px;
          box-shadow: 0 4px 14px rgba(255,75,134,0.35);
        }

        /* Timestamp */
        .scw-time {
          font-size: 0.68rem;
          color: #9ca3af;
          font-weight: 600;
          padding: 0 4px;
        }
        .scw-row-user .scw-time { text-align: right; }

        /* Typing indicator */
        .scw-typing-bubble {
          padding: 14px 18px;
          display: flex;
          gap: 5px;
          align-items: center;
        }
        .scw-dot {
          width: 7px; height: 7px;
          background: #d1d5db;
          border-radius: 50%;
          animation: scw-bounce 1.2s ease-in-out infinite;
        }
        .scw-dot:nth-child(2) { animation-delay: 0.18s; background: #fca5a5; }
        .scw-dot:nth-child(3) { animation-delay: 0.36s; background: #ff4b86; }
        @keyframes scw-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-7px); }
        }

        /* ── INPUT AREA ─────────────────────────────────────────── */
        .scw-input-area {
          padding: 12px 16px 16px;
          background: #ffffff;
          border-top: 1px solid #fce7f3;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .scw-input {
          flex: 1;
          padding: 12px 16px;
          border-radius: 24px;
          border: 1.5px solid #fce7f3;
          background: #fdf6f9;
          font-family: 'Nunito Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          color: #1f2937;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          resize: none;
        }
        .scw-input::placeholder { color: #c084a1; font-weight: 500; }
        .scw-input:focus {
          border-color: #ff4b86;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(255,75,134,0.1);
        }
        .scw-input:disabled { opacity: 0.6; cursor: not-allowed; }
        .scw-send-btn {
          width: 44px; height: 44px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #ff4b86 0%, #c8235e 100%);
          color: white;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(255,75,134,0.4);
          transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s, opacity 0.2s;
        }
        .scw-send-btn:hover:not(:disabled) {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(255,75,134,0.5);
        }
        .scw-send-btn:active:not(:disabled) { transform: scale(0.95); }
        .scw-send-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }
        .scw-send-btn svg { width: 20px; height: 20px; }

        /* ── POWERED BY ─────────────────────────────────────────── */
        .scw-powered {
          text-align: center;
          font-size: 0.65rem;
          color: #d1b4c0;
          padding: 4px 0 8px;
          font-weight: 600;
          letter-spacing: 0.3px;
          background: white;
          flex-shrink: 0;
        }

        /* ── RESPONSIVE ─────────────────────────────────────────── */
        /* Mobile & small tablet: compact card, NOT full screen */
        @media (max-width: 768px) {
          .scw-root { bottom: 16px; right: 16px; }
          .scw-window {
            width: calc(100vw - 32px);
            max-width: 380px;
            height: min(500px, calc(100dvh - 110px));
            max-height: calc(100dvh - 110px);
            bottom: 90px;
            right: 16px;
            border-radius: 20px;
          }
          .scw-toggle { width: 56px; height: 56px; }
          .scw-toggle img { width: 32px; height: 32px; }
        }
      `}</style>

      <div className="scw-root" ref={windowRef}>
        {/* ── Chat Window ── */}
        {isOpen && (
          <div className="scw-window">
            {/* Header */}
            <div className="scw-header">
              <div className="scw-header-left">
                <div className="scw-header-avatar">
                  <img src="/images/icon.png" alt="Spark Stage 55" />
                </div>
                <div className="scw-header-info">
                  <div className="scw-header-name">Spark Stage 55 ✨</div>
                  <div className="scw-header-status">
                    <span className="scw-online-dot" />
                    Online — siap membantu Star!
                  </div>
                </div>
              </div>
              <button
                className="scw-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup chat"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="scw-messages">
              <div className="scw-date-divider">Hari ini</div>

              {messages.map((msg) => (
                <div key={msg.id} className={`scw-row scw-row-${msg.role}`}>
                  {/* Bot avatar only for bot messages */}
                  {msg.role === 'bot' && (
                    <img
                      src="/images/icon.png"
                      alt="Spark Bot"
                      className="scw-bot-avatar"
                    />
                  )}
                  <div className="scw-bubble-wrap">
                    <div className={`scw-bubble scw-bubble-${msg.role}`}>
                      {msg.text}
                    </div>
                    <span className="scw-time">{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="scw-row scw-row-bot">
                  <img src="/images/icon.png" alt="Bot" className="scw-bot-avatar" />
                  <div className="scw-bubble-wrap">
                    <div className="scw-bubble scw-bubble-bot scw-typing-bubble">
                      <span className="scw-dot" />
                      <span className="scw-dot" />
                      <span className="scw-dot" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="scw-input-area">
              <input
                ref={inputRef}
                className="scw-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tulis pertanyaanmu, Star... ✨"
                disabled={isTyping}
                autoComplete="off"
              />
              <button
                className="scw-send-btn"
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                aria-label="Kirim pesan"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>

            {/* Powered by */}
            <div className="scw-powered">Powered by Spark Stage 55 AI ✨</div>
          </div>
        )}

        {/* ── Toggle Button ── */}
        <button
          className="scw-toggle"
          onClick={() => setIsOpen((o) => !o)}
          aria-label={isOpen ? 'Tutup chat' : 'Buka chat'}
        >
          {isOpen ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          ) : (
            <>
              <img src="/images/icon.png" alt="Spark Chat" />
              {hasUnread && <span className="scw-badge">!</span>}
            </>
          )}
        </button>
      </div>
    </>
  );
}
