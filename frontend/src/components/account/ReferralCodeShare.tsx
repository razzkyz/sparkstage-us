import { useReferralCode } from '@/hooks/useReferralCode'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface ReferralCodeShareProps {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function ReferralCodeShare({ size = 'md', showLabel = true }: ReferralCodeShareProps) {
  const [copied, setCopied] = useState(false)
  const { stats, createCode } = useReferralCode()

  const handleCopy = () => {
    if (stats?.code) {
      navigator.clipboard.writeText(stats.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!stats?.code) {
    return (
      <div className={`referral-share ${size}`}>
        <button onClick={() => createCode.mutate()} disabled={createCode.isPending} className="create-code-btn">
          {createCode.isPending ? 'Generating...' : 'Generate Referral Code'}
        </button>
      </div>
    )
  }

  return (
    <div className={`referral-share ${size}`}>
      {showLabel && <span className="code-label">Your Code: </span>}
      <code className="referral-code">{stats.code}</code>
      <button onClick={handleCopy} className="copy-icon-btn" title="Copy to clipboard">
        {copied ? <Check size={20} className="check-icon" /> : <Copy size={20} />}
      </button>

      <style>{`
        .referral-share {
          display: inline-flex;
          align-items: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          gap: 0.75rem;
          font-weight: 600;
        }

        .referral-share.sm {
          font-size: 0.85rem;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
        }

        .referral-share.lg {
          font-size: 1.1rem;
          gap: 1rem;
          padding: 1rem 1.5rem;
        }

        .code-label {
          opacity: 0.9;
        }

        .referral-code {
          background: rgba(255, 255, 255, 0.2);
          padding: 0.25rem 0.75rem;
          border-radius: 0.375rem;
          font-family: 'Monaco', 'Menlo', monospace;
          letter-spacing: 0.05em;
          font-weight: 700;
        }

        .copy-icon-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 0.25rem;
          border-radius: 0.25rem;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .copy-icon-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .check-icon {
          animation: checkPulse 0.3s ease;
        }

        @keyframes checkPulse {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .create-code-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .create-code-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .create-code-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
