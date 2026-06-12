import { useEffect, useState } from 'react';

interface FallingLoveLogoProps {
  count?: number;
  className?: string;
}

const FallingLoveLogo = ({ 
  count = 6, 
  className = "" 
}: FallingLoveLogoProps) => {
  const [hearts, setHearts] = useState<Array<{
    id: number;
    left: number;
    animationDuration: number;
    size: number;
    delay: number;
    rotationSpeed: number;
  }>>([]);

  useEffect(() => {
    const newHearts = Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 4 + Math.random() * 5, // 4-9 seconds
      size: 12 + Math.random() * 16, // 12-28px (smaller for mobile)
      delay: Math.random() * 2, // 0-2 seconds delay (reduced from 0-8)
      rotationSpeed: 1 + Math.random() * 2, // 1-3 rotation speed
    }));
    setHearts(newHearts);
  }, [count]);

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden z-10 ${className}`}>
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute animate-falling-love"
          style={{
            left: `${heart.left}%`,
            width: `${heart.size}px`,
            height: `${heart.size}px`,
            animationDuration: `${heart.animationDuration}s`,
            animationDelay: `${heart.delay}s`,
            animation: `fallingLove ${heart.animationDuration}s linear ${heart.delay}s infinite`,
          }}
        >
          <div
            className="w-full h-full"
            style={{
              animation: `rotating ${heart.rotationSpeed}s linear ${heart.delay}s infinite`,
            }}
          >
            <svg
              width={heart.size}
              height={heart.size}
              viewBox="0 0 100 100"
              className="w-full h-full"
            >
              <defs>
                <linearGradient id={`loveGradient-${heart.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff4b86" />
                  <stop offset="50%" stopColor="#ff6a9a" />
                  <stop offset="100%" stopColor="#ff94b8" />
                </linearGradient>
                <filter id={`glow-${heart.id}`}>
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              <path
                d="M50,25 C40,10 20,10 20,30 C20,45 35,60 50,80 C65,60 80,45 80,30 C80,10 60,10 50,25 Z"
                fill={`url(#loveGradient-${heart.id})`}
                filter={`url(#glow-${heart.id})`}
              />
              
              <path
                d="M45,30 C42,25 35,25 35,32 C35,37 40,42 45,48 C50,42 55,37 55,32 C55,25 48,25 45,30 Z"
                fill="rgba(255,255,255,0.4)"
                className="opacity-70"
              />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FallingLoveLogo;
