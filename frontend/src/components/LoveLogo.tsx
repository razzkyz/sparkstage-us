import { useEffect, useState } from 'react';

interface LoveLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}

const LoveLogo = ({ 
  size = 'md', 
  animated = true,
  className = "" 
}: LoveLogoProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setIsAnimating(true), 100);
      return () => clearTimeout(timer);
    }
  }, [animated]);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const svgSize = {
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <svg
        width={svgSize[size]}
        height={svgSize[size]}
        viewBox="0 0 100 100"
        className={`${sizeClasses[size]} ${animated && isAnimating ? 'animate-heartbeat' : ''} transition-all duration-300`}
      >
        {/* Main heart shape with gradient */}
        <defs>
          <linearGradient id="loveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff4b86" />
            <stop offset="50%" stopColor="#ff6a9a" />
            <stop offset="100%" stopColor="#ff94b8" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Heart path */}
        <path
          d="M50,25 C40,10 20,10 20,30 C20,45 35,60 50,80 C65,60 80,45 80,30 C80,10 60,10 50,25 Z"
          fill="url(#loveGradient)"
          filter="url(#glow)"
          className="drop-shadow-lg"
        />
        
        {/* Inner highlight for depth */}
        <path
          d="M45,30 C42,25 35,25 35,32 C35,37 40,42 45,48 C50,42 55,37 55,32 C55,25 48,25 45,30 Z"
          fill="rgba(255,255,255,0.3)"
          className="opacity-70"
        />
        
        {/* Spark accent */}
        <circle
          cx="65"
          cy="20"
          r="3"
          fill="#ff94b8"
          className={animated && isAnimating ? 'animate-sparkle' : ''}
        />
        <circle
          cx="25"
          cy="35"
          r="2"
          fill="#ff6a9a"
          className={animated && isAnimating ? 'animate-sparkle-delay-1' : ''}
        />
      </svg>
      
      {/* Floating hearts when animated */}
      {animated && (
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-0 right-0 w-2 h-2 bg-[#ff4b86] rounded-full opacity-0 ${
            isAnimating ? 'animate-float-heart-1' : ''
          }`}></div>
          <div className={`absolute bottom-0 left-0 w-1.5 h-1.5 bg-[#ff6a9a] rounded-full opacity-0 ${
            isAnimating ? 'animate-float-heart-2' : ''
          }`}></div>
        </div>
      )}
    </div>
  );
};

export default LoveLogo;
