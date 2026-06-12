import { useState } from 'react'
import { useReferralCode, useApplyReferralCode } from '@/hooks/useReferralCode'
import { Copy, Check, Gift, Users, TrendingUp, AlertCircle } from 'lucide-react'

export function LoyaltyDashboard() {
  const [copiedCode, setCopiedCode] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [showReferralInput, setShowReferralInput] = useState(false)
  const [applyError, setApplyError] = useState('')

  const { stats, referredUsers, createCode } = useReferralCode()
  const { applyCode } = useApplyReferralCode()

  const handleCopyCode = () => {
    if (stats?.code) {
      navigator.clipboard.writeText(stats.code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const handleApplyReferral = async () => {
    try {
      setApplyError('')
      await applyCode.mutateAsync(referralCode)
      setReferralCode('')
      setShowReferralInput(false)
    } catch (error) {
      setApplyError((error as Error).message)
    }
  }

  const tierColors: Record<number, { bg: string; text: string; name: string }> = {
    0: { bg: '#fef3c7', text: '#92400e', name: 'Stargazer' },
    1: { bg: '#e0e7ff', text: '#3730a3', name: 'Moonwalker' },
    2: { bg: '#ccfbf1', text: '#134e4a', name: 'Galaxian' },
    3: { bg: '#ddd6fe', text: '#5b21b6', name: 'Supernova' },
  }

  const tierBenefits: Record<number, string[]> = {
    0: ['Earn 1pt per Rp 1', 'Monthly newsletter', 'Birthday bonus'],
    1: ['Earn 1.25pt per Rp 1', 'Priority support', 'Exclusive sales'],
    2: ['Earn 1.5pt per Rp 1', 'Free shipping', 'Special events'],
    3: ['Earn 2pt per Rp 1', 'VIP concierge', 'Lifetime benefits'],
  }

  return (
    <div className="loyalty-dashboard">
      <div className="ld-header">
        <h1>SPARK Club</h1>
        <p className="text-gray-600">Your loyalty rewards program</p>
      </div>

      {/* Points Summary Card */}
      <div className="summary-card">
        <div className="points-display">
          <div className="points-number">{stats?.total_bonus_points || 0}</div>
          <div className="points-label">Total Points</div>
        </div>

        {stats && (
          <div className="tier-info">
            <div
              className="tier-badge"
              style={{
                backgroundColor: tierColors[3]?.bg,
                color: tierColors[3]?.text,
              }}
            >
              {tierColors[3]?.name}
            </div>
            <div className="tier-progress">
              <p>Next milestone: 5,000 points</p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(((stats.total_bonus_points || 0) / 5000) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="ld-grid">
        {/* Referral Section */}
        <div className="section-card">
          <div className="section-header">
            <Users size={24} />
            <h2>Refer Friends</h2>
          </div>

          {stats?.code ? (
            <div className="referral-active">
              <div className="code-display">
                <input type="text" value={stats.code} readOnly className="code-input" />
                <button onClick={handleCopyCode} className="copy-btn" title="Copy code">
                  {copiedCode ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>

              <div className="referral-stats">
                <div className="stat-item">
                  <span className="stat-label">People Referred</span>
                  <span className="stat-value">{stats.total_referrals}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Bonus Points Earned</span>
                  <span className="stat-value">{stats.total_bonus_points}</span>
                </div>
              </div>

              <p className="hint">Share your code with friends. Both of you get 100 bonus points!</p>
            </div>
          ) : (
            <div className="empty-state">
              <p>No active referral code yet</p>
              <button onClick={() => createCode.mutate()} className="create-btn" disabled={createCode.isPending}>
                {createCode.isPending ? 'Creating...' : 'Generate Code'}
              </button>
            </div>
          )}
        </div>

        {/* Apply Referral Code Section */}
        <div className="section-card">
          <div className="section-header">
            <Gift size={24} />
            <h2>Use Referral Code</h2>
          </div>

          <div className="referral-input-section">
            {!showReferralInput ? (
              <button onClick={() => setShowReferralInput(true)} className="input-toggle-btn">
                Have a referral code? Apply it here
              </button>
            ) : (
              <div className="referral-form">
                {applyError && (
                  <div className="error-banner">
                    <AlertCircle size={18} />
                    <span>{applyError}</span>
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Enter referral code..."
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="code-input-field"
                />

                <div className="form-buttons">
                  <button onClick={handleApplyReferral} className="apply-btn" disabled={applyCode.isPending || !referralCode}>
                    {applyCode.isPending ? 'Applying...' : 'Apply Code'}
                  </button>
                  <button
                    onClick={() => {
                      setShowReferralInput(false)
                      setReferralCode('')
                      setApplyError('')
                    }}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Referred Users List */}
      {referredUsers.length > 0 && (
        <div className="referred-section">
          <div className="section-header">
            <TrendingUp size={24} />
            <h2>Your Referrals</h2>
          </div>

          <div className="referred-list">
            {referredUsers.map((ru) => (
              <div key={ru.referred_user_id} className="referred-item">
                <div className="referred-info">
                  <p className="referred-email">{ru.referred_user_email}</p>
                  <p className="referred-date">Referred on {new Date(ru.referred_at).toLocaleDateString()}</p>
                </div>
                <div className="referred-points">
                  <span className="points-badge">+{ru.points_awarded} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier Benefits */}
      <div className="benefits-section">
        <h2>Member Tier Benefits</h2>

        <div className="benefits-grid">
          {Object.entries(tierColors).map(([tier, colors]) => (
            <div key={tier} className="benefit-card" style={{ borderColor: colors.text }}>
              <div className="benefit-header" style={{ backgroundColor: colors.bg, color: colors.text }}>
                <TrendingUp size={20} />
                <span>{colors.name}</span>
              </div>
              <ul className="benefit-list">
                {tierBenefits[Number(tier)].map((benefit, idx) => (
                  <li key={idx}>✓ {benefit}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .loyalty-dashboard {
          padding: 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        .ld-header {
          margin-bottom: 2rem;
        }

        .ld-header h1 {
          font-size: 2.5rem;
          font-weight: 900;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
        }

        .summary-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 1rem;
          padding: 2rem;
          margin-bottom: 2rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .points-display {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .points-number {
          font-size: 3.5rem;
          font-weight: 900;
          line-height: 1;
          margin-bottom: 0.5rem;
        }

        .points-label {
          font-size: 1rem;
          opacity: 0.9;
        }

        .tier-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .tier-badge {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          border-radius: 9999px;
          font-weight: 700;
          font-size: 1rem;
          margin-bottom: 1rem;
          width: fit-content;
        }

        .tier-progress p {
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
          opacity: 0.9;
        }

        .progress-bar {
          background: rgba(255, 255, 255, 0.3);
          height: 0.5rem;
          border-radius: 9999px;
          overflow: hidden;
        }

        .progress-fill {
          background: white;
          height: 100%;
          transition: width 0.3s ease;
        }

        .ld-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .section-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1.5rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          color: #667eea;
        }

        .section-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .referral-active {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .code-display {
          display: flex;
          gap: 0.75rem;
          background: #f3f4f6;
          padding: 0.75rem;
          border-radius: 0.5rem;
        }

        .code-input {
          flex: 1;
          border: none;
          background: none;
          font-size: 1.25rem;
          font-weight: 700;
          color: #667eea;
          font-family: 'Monaco', 'Menlo', monospace;
        }

        .copy-btn {
          background: #667eea;
          color: white;
          border: none;
          border-radius: 0.375rem;
          padding: 0.5rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .copy-btn:hover {
          background: #764ba2;
        }

        .referral-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.5rem;
        }

        .stat-label {
          font-size: 0.8rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #667eea;
        }

        .hint {
          font-size: 0.9rem;
          color: #6b7280;
          margin: 0;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem 0;
        }

        .empty-state p {
          color: #9ca3af;
          margin: 0;
        }

        .create-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.375rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .create-btn:hover:not(:disabled) {
          background: #764ba2;
        }

        .create-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .referral-input-section {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
        }

        .input-toggle-btn {
          width: 100%;
          background: white;
          border: 2px dashed #d1d5db;
          padding: 1rem;
          border-radius: 0.375rem;
          color: #667eea;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .input-toggle-btn:hover {
          border-color: #667eea;
          background: #f3f4f6;
        }

        .referral-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #fee2e2;
          color: #991b1b;
          padding: 0.75rem;
          border-radius: 0.375rem;
          font-size: 0.9rem;
        }

        .code-input-field {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .code-input-field:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-buttons {
          display: flex;
          gap: 0.75rem;
        }

        .apply-btn,
        .cancel-btn {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: 0.375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .apply-btn {
          background: #667eea;
          color: white;
        }

        .apply-btn:hover:not(:disabled) {
          background: #764ba2;
        }

        .apply-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cancel-btn {
          background: #e5e7eb;
          color: #374151;
        }

        .cancel-btn:hover {
          background: #d1d5db;
        }

        .referred-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .referred-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .referred-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          border-left: 4px solid #667eea;
        }

        .referred-info {
          flex: 1;
        }

        .referred-email {
          font-weight: 600;
          color: #374151;
          margin: 0;
        }

        .referred-date {
          font-size: 0.85rem;
          color: #9ca3af;
          margin: 0.25rem 0 0 0;
        }

        .points-badge {
          background: #dbeafe;
          color: #1e40af;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-weight: 700;
          font-size: 0.9rem;
        }

        .benefits-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1.5rem;
        }

        .benefits-section h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 1.5rem 0;
        }

        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }

        .benefit-card {
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          overflow: hidden;
        }

        .benefit-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          font-weight: 700;
          font-size: 1rem;
        }

        .benefit-list {
          list-style: none;
          padding: 1rem;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .benefit-list li {
          font-size: 0.9rem;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .ld-grid {
            grid-template-columns: 1fr;
          }

          .summary-card {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .benefits-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default LoyaltyDashboard
