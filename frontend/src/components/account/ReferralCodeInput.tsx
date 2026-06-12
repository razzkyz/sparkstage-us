import { useState } from 'react'
import { useApplyReferralCode } from '@/hooks/useReferralCode'
import { Gift, AlertCircle, CheckCircle } from 'lucide-react'

interface ReferralCodeInputProps {
  onSuccess?: (pointsAwarded: number) => void
}

export function ReferralCodeInput({ onSuccess }: ReferralCodeInputProps) {
  const [code, setCode] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { applyCode } = useApplyReferralCode()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const result = await applyCode.mutateAsync(code)
      setMessage({
        type: 'success',
        text: `Success! You earned ${result.points_awarded} bonus points`,
      })
      setCode('')
      setShowInput(false)
      onSuccess?.(result.points_awarded)
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({
        type: 'error',
        text: (error as Error).message,
      })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  return (
    <div className="referral-input-wrapper">
      {message && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {!showInput ? (
        <button onClick={() => setShowInput(true)} className="input-trigger">
          <Gift size={18} />
          <span>Have a referral code?</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="input-form">
          <input
            type="text"
            placeholder="Enter referral code..."
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="code-input"
            autoFocus
          />
          <button type="submit" className="submit-btn" disabled={applyCode.isPending || !code}>
            {applyCode.isPending ? 'Applying...' : 'Apply'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowInput(false)
              setCode('')
            }}
            className="cancel-btn"
          >
            Cancel
          </button>
        </form>
      )}

      <style>{`
        .referral-input-wrapper {
          width: 100%;
        }

        .message {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .message.success {
          background: #dcfce7;
          color: #166534;
        }

        .message.error {
          background: #fee2e2;
          color: #991b1b;
        }

        .input-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          color: #667eea;
          border: 2px dashed #bfdbfe;
          border-radius: 0.375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .input-trigger:hover {
          border-color: #667eea;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
        }

        .input-form {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .code-input {
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          transition: border-color 0.2s;
        }

        .code-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .submit-btn,
        .cancel-btn {
          padding: 0.75rem;
          border: none;
          border-radius: 0.375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-btn {
          background: #667eea;
          color: white;
        }

        .submit-btn:hover:not(:disabled) {
          background: #764ba2;
        }

        .submit-btn:disabled {
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
      `}</style>
    </div>
  )
}
