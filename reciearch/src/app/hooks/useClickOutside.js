import { useEffect, useRef } from 'react';

/**
 * Custom hook that triggers a callback when a click occurs outside the referenced element.
 * @param {Function} callback - The function to call when a click outside occurs.
 * @returns {React.RefObject} - A ref object to attach to the element to monitor.
 */
export function useClickOutside(callback) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    // Add event listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside); // Also handle touch events

    // Cleanup function to remove event listeners
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [callback]); // Re-run effect if callback changes

  return ref;
}
