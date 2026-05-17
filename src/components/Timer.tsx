'use client';

import { Clock, Eye } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { palette } from '@/lib/palette';

interface TimerProps {
  timeLeft: number;
  totalTime: number;
  label: string;
  variant?: 'thinking' | 'answering';
  className?: string;
}

export default function Timer({
  timeLeft,
  totalTime,
  label,
  variant = 'answering',
  className = '',
}: TimerProps) {
  const Icon = variant === 'thinking' ? Eye : Clock;
  const progressColor = variant === 'thinking' ? palette.accent.bg : palette.timer.answering;
  const iconColor = 'text-black';
  const labelColor = variant === 'thinking' ? 'text-black' : 'text-gray-600';

  // Smooth single-transition bar: 100% → 0% over totalTime, restart whenever totalTime changes.
  const [width, setWidth] = useState('100%');
  const raf = useRef<number | null>(null);
  useEffect(() => {
    setWidth('100%');
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      raf.current = requestAnimationFrame(() => setWidth('0%'));
    });
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [totalTime, variant]);

  return (
    <div className={`text-center mb-8 ${className}`}>
      <div className="flex items-center justify-center gap-2 mb-4">
        <Icon className={`w-8 h-8 ${iconColor}`} />
      </div>
      <p className={`${labelColor} text-lg`}>{label}</p>
      <div className={`w-full ${palette.timer.progress} rounded-full h-3 mt-4 overflow-hidden`}>
        <div
          className={`${progressColor} h-3 rounded-full`}
          style={{ width, transition: `width ${totalTime}s linear` }}
        />
      </div>
      <span className="sr-only">{timeLeft} seconds remaining</span>
    </div>
  );
}
