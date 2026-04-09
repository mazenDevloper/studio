
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes keyboard event keys to support special remote control buttons
 * including Vidaa OS, Smart TVs, and standard keyboard layouts.
 */
export function normalizeKey(e: KeyboardEvent): string {
  const codeMap: Record<number, string> = {
    // Standard and Smart TV keys
    403: 'Red', 404: 'Green', 405: 'Yellow', 406: 'Blue',
    461: 'Back', 10009: 'Back', 10182: 'Exit',
    10252: 'MediaPlayPause', 19: 'Pause', 415: 'Play', 413: 'Stop',
    417: 'NextTrack', 412: 'PrevTrack', 33: 'PageUp', 34: 'PageDown',
    
    // Directional and Navigation
    37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown',
    13: 'Enter', 8: 'Backspace', 27: 'Escape',
    
    // Numeric Pad
    48: '0', 49: '1', 50: '2', 51: '3', 52: '4', 53: '5', 54: '6', 55: '7', 56: '8', 57: '9'
  };

  // 1. High-priority mapping for Smart TV Hardware Keys
  if (codeMap[e.keyCode]) return codeMap[e.keyCode];

  // 2. Use e.key if standard and descriptive
  if (e.key && e.key !== 'Unidentified' && e.key !== 'Process') return e.key;

  // 3. Fallback to physical code or numeric ID
  return e.code || `KEY_${e.keyCode}`;
}
