'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * A custom hook to detect user inactivity and trigger a callback.
 *
 * @param onIdle - The function to call when the user is detected as idle.
 * @param idleTimeout - The duration in milliseconds to wait before considering the user idle. Defaults to 1 hour.
 */
export const useIdleTimer = (onIdle: () => void, idleTimeout: number = 60 * 60 * 1000) => {
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    timeoutIdRef.current = setTimeout(onIdle, idleTimeout);
  }, [onIdle, idleTimeout]);

  const handleEvent = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    // List of events to listen for to detect user activity
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];

    // Set the initial timer
    resetTimer();

    // Add event listeners
    events.forEach(event => window.addEventListener(event, handleEvent));

    // Cleanup function to remove event listeners and clear the timer
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      events.forEach(event => window.removeEventListener(event, handleEvent));
    };
  }, [handleEvent, resetTimer]);
};
