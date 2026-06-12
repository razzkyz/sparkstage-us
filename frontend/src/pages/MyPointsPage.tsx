import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PageTransition } from '../components/PageTransition';
import {
  useLoyaltyPoints,
  useLoyaltyHistory,
  getLoyaltyRankByTier,
  getRankProgress,
  LOYALTY_RANKS,
} from '../hooks/useLoyaltyPoints';
import { formatCurrency } from '../utils/formatters';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(ease * target));
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

/* ─── keyframes ───────────────────────────────────────────────────────────── */
const CSS = `
@keyframes sp-float  { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-16px)} }
@keyframes sp-pulse  { 0%,100%{opacity:.7;transform:scale(1)} 50%{opacity:.15;transform:scale(1.6)} }
@keyframes sp-fadein { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:none} }
@keyframes sp-slide  { from{opacity:0;transform:translateX(-14px)} to{opacity:1;transform:none} }
@keyframes sp-bar    { from{width:0} }
@keyframes sp-shimmer{
  0%   { background-position: -200% center }
  100% { background-position:  200% center }
}
.sp-fadein { animation: sp-fadein .55s cubic-bezier(.22,1,.36,1) both }
.sp-slide  { animation: sp-slide  .45s cubic-bezier(.22,1,.36,1) both }
.sp-bar    { animation: sp-bar    1.2s cubic-bezier(.22,1,.36,1) both }
.sp-shimmer{
  background: linear-gradient(90deg,#fce7f3 25%,#fbcfe8 50%,#fce7f3 75%);
  background-size: 200% auto;
  animation: sp-shimmer 1.5s linear infinite;
}
`;

/* ─── component ──────────────────────────────────────────────────────────── */

const MyPointsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: pointsData, isLoading: pointsLoading } = useLoyaltyPoints(user?.id);
  const { data: history = [], isLoading: histLoading } = useLoyaltyHistory(user?.id);

  useEffect(() => {
    if (!user) navigate('/login', { state: { from: '/my-points' } });
  }, [user, navigate]);

  const totalPoints = pointsData?.total_points ?? 0;
  const tierLevel   = pointsData?.tier_level ?? 0;
  const rank        = getLoyaltyRankByTier(tierLevel);
  const progress    = getRankProgress(totalPoints);
  const nextRank    = LOYALTY_RANKS.find(r => r.minPoints > rank.minPoints) ?? null;
  const loading     = pointsLoading || histLoading;
  const displayPoints = useCountUp(loading ? 0 : totalPoints);

  return (
    <PageTransition>
      <style>{CSS}</style>

      <div style={{ minHeight: '100vh', background: '#fff0f5', fontFamily: 'inherit' }}>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', overflow: 'hidden', paddingBottom: 80 }}>

          {/* deep pink gradient bg */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(160deg, #ff2d72 0%, #ff4b86 40%, #ff80ab 70%, #ffc2d4 100%)',
          }} />

          {/* soft sparkle orbs */}
          {[
            { w: 320, h: 320, top: '-60px',  left: '-60px',  color: '#fff', delay: '0s',  dur: '6s' },
            { w: 240, h: 240, top: '30px',   right: '-40px', color: '#ffd6e7', delay: '2s', dur: '8s' },
            { w: 180, h: 180, bottom: '10px', left: '35%',   color: '#ffb3c6', delay: '1s', dur: '7s' },
          ].map((o, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: o.w, height: o.h,
              top: o.top, left: o.left, right: o.right, bottom: o.bottom,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${o.color}28, transparent 70%)`,
              animation: `sp-float ${o.dur} ${o.delay} ease-in-out infinite`,
              pointerEvents: 'none',
            }} />
          ))}

          {/* hearts deco */}
          {['♥', '♡', '♥'].map((h, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: `${20 + i * 28}%`,
              left: i % 2 === 0 ? `${8 + i * 4}%` : undefined,
              right: i % 2 !== 0 ? '10%' : undefined,
              fontSize: 18 + i * 6,
              color: 'rgba(255,255,255,0.18)',
              animation: `sp-float ${5 + i}s ${i * 1.2}s ease-in-out infinite`,
              pointerEvents: 'none',
              userSelect: 'none',
            }}>{h}</div>
          ))}

          {/* hero content */}
          <div style={{ position: 'relative', maxWidth: 520, margin: '0 auto', padding: '56px 20px 0', textAlign: 'center' }}>

            {/* eyebrow */}
            <p className="sp-fadein" style={{
              animationDelay: '.05s',
              fontSize: 11, fontWeight: 800, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)',
              marginBottom: 18,
            }}>
              ✦ SPARK CLUB MEMBERSHIP ✦
            </p>

            {/* rank badge */}
            <div className="sp-fadein" style={{ animationDelay: '.12s', display: 'inline-block', position: 'relative', marginBottom: 22 }}>
              {/* pulse ring */}
              <div style={{
                position: 'absolute', inset: -10, borderRadius: '50%',
                border: '2.5px solid rgba(255,255,255,0.6)',
                animation: 'sp-pulse 2.8s ease-in-out infinite',
              }} />
              <div style={{
                position: 'absolute', inset: -4, borderRadius: '50%',
                border: '1.5px solid rgba(255,255,255,0.35)',
              }} />
              <div style={{
                width: 104, height: 104, borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                border: '2.5px solid rgba(255,255,255,0.55)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 8px 32px rgba(255,45,114,0.45), 0 0 0 8px rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 46,
                animation: 'sp-float 4s ease-in-out infinite',
              }}>
                {rank.icon}
              </div>
            </div>

            {/* rank label */}
            <p className="sp-fadein" style={{
              animationDelay: '.18s',
              fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.9)',
              letterSpacing: '.06em', marginBottom: 6,
              textShadow: '0 1px 8px rgba(0,0,0,0.15)',
            }}>
              {rank.label}
            </p>

            {/* count-up */}
            <div className="sp-fadein" style={{ animationDelay: '.22s', marginBottom: 6 }}>
              {loading ? (
                <div className="sp-shimmer" style={{ height: 56, width: 160, margin: '0 auto', borderRadius: 14 }} />
              ) : (
                <p style={{
                  fontSize: 54, fontWeight: 900, lineHeight: 1,
                  color: '#fff', letterSpacing: '-0.03em',
                  textShadow: '0 4px 24px rgba(180,0,60,0.3)',
                }}>
                  {displayPoints.toLocaleString()}
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginLeft: 6 }}>Poin</span>
                </p>
              )}
            </div>

            <p className="sp-fadein" style={{
              animationDelay: '.27s',
              fontSize: 11.5, color: 'rgba(255,255,255,0.65)', marginBottom: 28,
            }}>
              1 tiket = 20 poin · 1 produk/rental = 20 poin · 1 poin = Rp 1 diskon
            </p>

            {/* progress bar */}
            {nextRank && !loading && (
              <div className="sp-fadein" style={{ animationDelay: '.33s', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 7 }}>
                  <span>{totalPoints.toLocaleString()} poin</span>
                  <span>{nextRank.icon} {nextRank.label} — {nextRank.minPoints.toLocaleString()} poin</span>
                </div>
                <div style={{ height: 9, borderRadius: 99, background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
                  <div className="sp-bar" style={{
                    height: '100%', borderRadius: 99,
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg,#fff,rgba(255,255,255,0.7))',
                    boxShadow: '0 0 12px rgba(255,255,255,0.7)',
                  }} />
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6, textAlign: 'right' }}>
                  {(nextRank.minPoints - totalPoints).toLocaleString()} poin lagi ke {nextRank.label}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── BODY ─────────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 80px', marginTop: -44 }}>

          {/* points value card */}
          {totalPoints > 0 && (
            <div className="sp-fadein" style={{
              animationDelay: '.38s',
              borderRadius: 18, padding: '16px 20px', marginBottom: 14,
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(255,75,134,0.2)',
              boxShadow: '0 8px 32px rgba(255,75,134,0.12)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                background: 'linear-gradient(135deg,#ff2d72,#ff7eb3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, boxShadow: '0 4px 14px rgba(255,75,134,0.35)',
              }}>💰</div>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: '#1f2937', margin: 0 }}>
                  Setara <span style={{ color: '#ff2d72', fontWeight: 900 }}>{formatCurrency(totalPoints)}</span> diskon
                </p>
                <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '3px 0 0' }}>
                  Gunakan saat checkout produk untuk potong harga langsung
                </p>
              </div>
            </div>
          )}

          {/* CTA buttons — premium feature cards */}
          <div className="sp-fadein" style={{ animationDelay: '.44s', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              {
                to: '/shop',
                emoji: '🛍️',
                label: 'Spark Club Shop',
                sub: 'Tukar poin & belanja produk eksklusif',
                grad: 'linear-gradient(145deg,#ff2d72 0%,#ff6fa0 60%,#ffb3c6 100%)',
                shadow: 'rgba(255,45,114,0.4)',
                badge: 'SHOP',
              },
              {
                to: '/booking',
                emoji: '🎫',
                label: 'Beli Tiket',
                sub: 'Kumpulkan poin dari setiap booking',
                grad: 'linear-gradient(145deg,#e91e8c 0%,#ff4b86 60%,#ff8fb3 100%)',
                shadow: 'rgba(233,30,140,0.38)',
                badge: 'TICKET',
              },
            ].map(btn => (
              <Link key={btn.to} to={btn.to} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                borderRadius: 18, padding: '20px 18px',
                background: btn.grad, color: '#fff',
                textDecoration: 'none',
                boxShadow: `0 8px 24px ${btn.shadow}`,
                transition: 'transform .18s, box-shadow .18s',
                position: 'relative', overflow: 'hidden',
              }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px) scale(1.01)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 14px 32px ${btn.shadow}`; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${btn.shadow}`; }}
              >
                {/* bg circle deco */}
                <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
                {/* icon */}
                <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 12, backdropFilter: 'blur(4px)' }}>
                  {btn.emoji}
                </div>
                {/* badge */}
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.22)', padding: '2px 8px', borderRadius: 99, marginBottom: 6, color: 'rgba(255,255,255,0.9)' }}>{btn.badge}</span>
                <p style={{ fontSize: 14, fontWeight: 900, margin: '0 0 4px', color: '#fff', lineHeight: 1.2 }}>{btn.label}</p>
                <p style={{ fontSize: 11, margin: 0, color: 'rgba(255,255,255,0.72)', lineHeight: 1.4 }}>{btn.sub}</p>
                {/* arrow */}
                <div style={{ position: 'absolute', bottom: 16, right: 16, width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>›</div>
              </Link>
            ))}
          </div>

          {/* ── Rank Tiers ── */}
          <div className="sp-fadein" style={{
            animationDelay: '.5s',
            borderRadius: 20, overflow: 'hidden', marginBottom: 14,
            background: 'rgba(255,255,255,0.92)',
            border: '1.5px solid rgba(255,75,134,0.15)',
            boxShadow: '0 8px 32px rgba(255,75,134,0.1)',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #ffe4ef', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#ff2d72,#ff7eb3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 4px 12px rgba(255,75,134,0.3)', flexShrink: 0 }}>🏆</div>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 800, color: '#1f2937', margin: 0 }}>Tingkatan Rank</h2>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Kumpulkan poin untuk naik level</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              {LOYALTY_RANKS.map((r, i) => {
                const isActive   = r.name === rank.name;
                const isUnlocked = totalPoints >= r.minPoints;
                return (
                  <div key={r.name} style={{
                    padding: '18px 12px', textAlign: 'center', position: 'relative',
                    borderRight:  i % 2 === 0 ? '1px solid #ffe4ef' : undefined,
                    borderBottom: i < 2        ? '1px solid #ffe4ef' : undefined,
                    background: isActive ? `${r.gradientFrom}14` : 'transparent',
                    transition: 'background .2s',
                  }}>
                    {isActive && (
                      <div style={{ position: 'absolute', inset: 0, border: `1.5px solid ${r.color}55`, borderRadius: 0, pointerEvents: 'none' }} />
                    )}
                    <span style={{
                      fontSize: 28, display: 'block', marginBottom: 5,
                      opacity: isUnlocked ? 1 : 0.25,
                      filter: isUnlocked ? `drop-shadow(0 0 6px ${r.color}99)` : 'none',
                    }}>{r.icon}</span>
                    <p style={{ fontSize: 12, fontWeight: 800, color: isUnlocked ? r.color : '#d1d5db', margin: '0 0 2px' }}>{r.label}</p>
                    <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>
                      {r.maxPoints
                        ? `${r.minPoints.toLocaleString()}–${r.maxPoints.toLocaleString()}`
                        : `${r.minPoints.toLocaleString()}+`} poin
                    </p>
                    {isActive && (
                      <span style={{
                        display: 'inline-block', marginTop: 7,
                        fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em',
                        padding: '2px 10px', borderRadius: 99,
                        background: `${r.color}18`, color: r.color, border: `1px solid ${r.color}44`,
                      }}>Level Kamu</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── History ── */}
          <div className="sp-fadein" style={{
            animationDelay: '.56s',
            borderRadius: 20, overflow: 'hidden',
            background: 'rgba(255,255,255,0.92)',
            border: '1.5px solid rgba(255,75,134,0.15)',
            boxShadow: '0 8px 32px rgba(255,75,134,0.1)',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #ffe4ef', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#ff4b86,#ffb3c6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 4px 12px rgba(255,75,134,0.25)', flexShrink: 0 }}>✨</div>
                <div>
                  <h2 style={{ fontSize: 14, fontWeight: 800, color: '#1f2937', margin: 0 }}>Riwayat Poin</h2>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Semua aktivitas poinmu</p>
                </div>
              </div>
              {!loading && (
                <span style={{ fontSize: 11, color: '#ff4b86', background: '#fff0f5', border: '1px solid #ffd6e7', padding: '3px 12px', borderRadius: 99, fontWeight: 800 }}>
                  {history.length} transaksi
                </span>
              )}
            </div>

            {loading ? (
              <div>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #fff0f5' }}>
                    <div style={{ flex: 1 }}>
                      <div className="sp-shimmer" style={{ height: 12, width: '55%', borderRadius: 6, marginBottom: 8 }} />
                      <div className="sp-shimmer" style={{ height: 10, width: '35%', borderRadius: 6 }} />
                    </div>
                    <div className="sp-shimmer" style={{ height: 28, width: 56, borderRadius: 99, marginLeft: 12 }} />
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div style={{ padding: '52px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 50, marginBottom: 14, animation: 'sp-float 3s ease-in-out infinite' }}>💖</div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: '0 0 6px' }}>Belum ada riwayat poin</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Beli tiket atau produk untuk mulai kumpulkan poin!</p>
              </div>
            ) : (
              <div>
                {history.map((item, i) => {
                  const isEarn = item.points_change > 0;
                  return (
                    <div
                      key={item.id}
                      className="sp-slide"
                      style={{
                        animationDelay: `${0.56 + i * 0.045}s`,
                        padding: '14px 20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                        borderBottom: i < history.length - 1 ? '1px solid #fff0f5' : undefined,
                        transition: 'background .15s',
                        cursor: 'default',
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = '#fff8fb')}
                      onMouseOut={e => (e.currentTarget.style.background = '')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                          background: isEarn ? '#f0fdf4' : '#fff0f5',
                          border: `1.5px solid ${isEarn ? '#bbf7d0' : '#ffd6e7'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18,
                        }}>
                          {isEarn ? '✨' : '🎁'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.reason}
                          </p>
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        fontSize: 13, fontWeight: 900, flexShrink: 0,
                        color: isEarn ? '#16a34a' : '#ff2d72',
                        background: isEarn ? '#f0fdf4' : '#fff0f5',
                        border: `1.5px solid ${isEarn ? '#bbf7d0' : '#ffd6e7'}`,
                        padding: '4px 12px', borderRadius: 99,
                        whiteSpace: 'nowrap',
                      }}>
                        {isEarn ? '+' : ''}{item.points_change.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </PageTransition>
  );
};

export default MyPointsPage;
