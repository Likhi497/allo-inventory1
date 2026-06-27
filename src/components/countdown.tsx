"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface CountdownProps {
  expiresAt: string;
  onExpired: () => void;
}

export function Countdown({ expiresAt, onExpired }: CountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpired();
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isUrgent = secondsLeft < 60;
  const isVeryUrgent = secondsLeft < 30;
  const totalSeconds = 10 * 60;
  const progress = Math.min(100, ((totalSeconds - secondsLeft) / totalSeconds) * 100);

  return (
    <div
      className={`rounded-xl border p-4 ${
        isVeryUrgent
          ? "bg-red-50 border-red-300"
          : isUrgent
          ? "bg-amber-50 border-amber-300"
          : "bg-indigo-50 border-indigo-200"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isUrgent ? (
            <AlertTriangle
              className={`h-5 w-5 ${isVeryUrgent ? "text-red-500 animate-pulse" : "text-amber-500"}`}
            />
          ) : (
            <Clock className="h-5 w-5 text-indigo-500" />
          )}
          <span
            className={`text-sm font-medium ${
              isVeryUrgent ? "text-red-700" : isUrgent ? "text-amber-700" : "text-indigo-700"
            }`}
          >
            {isVeryUrgent
              ? "Expiring very soon!"
              : isUrgent
              ? "Less than 1 minute left"
              : "Reservation held for you"}
          </span>
        </div>

        <span
          className={`font-mono text-2xl font-bold tabular-nums ${
            isVeryUrgent ? "text-red-600" : isUrgent ? "text-amber-600" : "text-indigo-600"
          }`}
        >
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>

      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isVeryUrgent ? "bg-red-500" : isUrgent ? "bg-amber-500" : "bg-indigo-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className={`text-xs mt-2 ${
        isVeryUrgent ? "text-red-600" : isUrgent ? "text-amber-600" : "text-indigo-500"
      }`}>
        Complete your purchase before the timer runs out or the units will be released back to stock.
      </p>
    </div>
  );
}
