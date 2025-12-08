import { useEffect, useRef } from 'react';

/**
 * Custom hook to handle timeouts.
 * @param {function} callback - The function to call when the timeout completes.
 * @param {number|null} delay - The delay in milliseconds. If null, the timeout is cleared.
 */
export function useTimeout(callback, delay) {
  const savedCallback = useRef();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the timeout.
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }
    if (delay !== null) {
      const id = setTimeout(tick, delay);
      return () => clearTimeout(id);
    }
  }, [delay]);
}
