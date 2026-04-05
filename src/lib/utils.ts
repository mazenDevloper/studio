import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes keyboard event keys to support special remote control buttons
 * that often return 'Unidentified' or vary by vendor (e.g., Red, Green, Yellow, Blue).
 */
export function normalizeKey(e: KeyboardEvent): string {
  // Common Smart TV / Car Infotainment key code mapping
  const codeMap: Record<number, string> = {
    403: 'Red',
    404: 'Green',
    405: 'Yellow',
    406: 'Blue',
    461: 'Back',
    10009: 'Back',
    10182: 'Exit',
    10252: 'MediaPlayPause',
    19: 'Pause',
    415: 'Play',
    413: 'Stop',
    417: 'NextTrack',
    412: 'PrevTrack',
    37: 'ArrowLeft',
    38: 'ArrowUp',
    39: 'ArrowRight',
    40: 'ArrowDown',
    13: 'Enter',
    48: '0', 49: '1', 50: '2', 51: '3', 52: '4', 53: '5', 54: '6', 55: '7', 56: '8', 57: '9'
  };

  // 1. Check keyCode map for hardware-specific buttons (highest priority for 'Unidentified' cases)
  if (codeMap[e.keyCode]) return codeMap[e.keyCode];

  // 2. Use e.key if it is descriptive and standard
  if (e.key && e.key !== 'Unidentified' && e.key !== 'Process') {
    return e.key;
  }

  // 3. Fallback to e.code (Physical location, e.g., 'KeyM', 'Digit1')
  if (e.code && e.code !== '') {
    return e.code;
  }

  // 4. Final predictable fallback using the numeric keyCode
  return `KEY_${e.keyCode}`;
}
