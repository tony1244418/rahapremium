'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface LiveTimerProps {
  endDate: string | Date;
  className?: string;
  showFullTimestamp?: boolean;
  onExpired?: () => void;
  variant?: 'default' | 'compact' | 'detailed';
}

export default function LiveTimer({ 
  endDate, 
  className = '', 
  showFullTimestamp = true,
  onExpired,
  variant = 'default'
}: LiveTimerProps) {
  const { t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0
  });

  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const difference = end - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({
          days,
          hours,
          minutes,
          seconds,
          total: difference
        });
        setIsExpired(false);
      } else {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0
        });
        setIsExpired(true);
        if (onExpired) {
          onExpired();
        }
      }
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate, onExpired]);

  const formatTime = (value: number, unit: string) => {
    return `${value} ${unit}${value !== 1 ? 's' : ''}`;
  };

  const getSwahiliUnit = (unit: string) => {
    switch (unit) {
      case 'day': return 'siku';
      case 'hour': return 'saa';
      case 'minute': return 'dakika';
      case 'second': return 'sekunde';
      default: return unit;
    }
  };

  const getExpiredText = () => {
    return t('expired') || 'Expired';
  };

  const getTimeRemainingText = () => {
    return t('timeRemaining') || 'Time Remaining';
  };

  if (isExpired) {
    return (
      <div className={`text-red-400 font-medium ${className}`}>
        {getExpiredText()}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`text-sm ${className}`}>
        {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="text-xs text-dark-400">{getTimeRemainingText()}</div>
        <div className="flex items-center space-x-2 text-sm">
          <div className="flex items-center space-x-1">
            <span className="font-mono">{timeLeft.days}</span>
            <span className="text-xs text-dark-400">
              {timeLeft.days === 1 ? 'siku' : 'siku'}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="font-mono">{timeLeft.hours.toString().padStart(2, '0')}</span>
            <span className="text-xs text-dark-400">saa</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="font-mono">{timeLeft.minutes.toString().padStart(2, '0')}</span>
            <span className="text-xs text-dark-400">dakika</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="font-mono">{timeLeft.seconds.toString().padStart(2, '0')}</span>
            <span className="text-xs text-dark-400">sekunde</span>
          </div>
        </div>
        {showFullTimestamp && (
          <div className="text-xs text-dark-500">
            {t('expiresOn')}: {new Date(endDate).toLocaleString('sw-TZ', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="text-xs text-dark-400">{getTimeRemainingText()}</div>
      <div className="flex items-center space-x-3 text-sm">
        {timeLeft.days > 0 && (
          <div className="flex items-center space-x-1">
            <span className="font-mono font-semibold">{timeLeft.days}</span>
            <span className="text-xs text-dark-400">
              {timeLeft.days === 1 ? 'siku' : 'siku'}
            </span>
          </div>
        )}
        <div className="flex items-center space-x-1">
          <span className="font-mono font-semibold">{timeLeft.hours.toString().padStart(2, '0')}</span>
          <span className="text-xs text-dark-400">saa</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="font-mono font-semibold">{timeLeft.minutes.toString().padStart(2, '0')}</span>
          <span className="text-xs text-dark-400">dakika</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="font-mono font-semibold">{timeLeft.seconds.toString().padStart(2, '0')}</span>
          <span className="text-xs text-dark-400">sekunde</span>
        </div>
      </div>
      {showFullTimestamp && (
        <div className="text-xs text-dark-500">
          {t('expiresOn')}: {new Date(endDate).toLocaleString('sw-TZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
      )}
    </div>
  );
}
