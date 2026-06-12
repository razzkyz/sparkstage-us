import { useEffect, useState } from 'react';

interface FallingSparkProps {
  text?: string;
  count?: number;
  className?: string;
}

const FallingJoinSpark = ({ 
  text = "Join Spark", 
  count = 8, 
  className = "" 
}: FallingSparkProps) => {
  const [sparks, setSparks] = useState<Array<{
    id: number;
    left: number;
    animationDuration: number;
    fontSize: number;
    delay: number;
  }>>([]);

  useEffect(() => {
    const newSparks = Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      animationDuration: 3 + Math.random() * 4, // 3-7 seconds
      fontSize: 14 + Math.random() * 8, // 14-22px
      delay: Math.random() * 5, // 0-5 seconds delay
    }));
    setSparks(newSparks);
  }, [count]);

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      {sparks.map((spark) => (
        <div
          key={spark.id}
          className="absolute text-[#ff4b86] font-bold opacity-60 animate-falling-spark"
          style={{
            left: `${spark.left}%`,
            fontSize: `${spark.fontSize}px`,
            animationDuration: `${spark.animationDuration}s`,
            animationDelay: `${spark.delay}s`,
          }}
        >
          {text}
        </div>
      ))}
    </div>
  );
};

export default FallingJoinSpark;
