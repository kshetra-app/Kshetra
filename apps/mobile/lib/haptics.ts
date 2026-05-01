/**
 * Haptic Feedback Utility
 *
 * Wraps expo-haptics with graceful fallback when unavailable.
 * Provides semantic haptic patterns for consistent UX.
 */

let Haptics: any = null;

try {
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics not available
}

/** Light tap — for UI selections, toggles, chip taps */
export function tapLight(): void {
  try {
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

/** Medium tap — for button presses, card taps */
export function tapMedium(): void {
  try {
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
}

/** Heavy tap — for important actions (submit, share, delete) */
export function tapHeavy(): void {
  try {
    Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {}
}

/** Success notification — for confirmations, saves */
export function notifySuccess(): void {
  try {
    Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

/** Warning notification — for alerts, destructive previews */
export function notifyWarning(): void {
  try {
    Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {}
}

/** Error notification — for failures */
export function notifyError(): void {
  try {
    Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {}
}

/** Selection changed — for picker/slider value changes */
export function selectionChanged(): void {
  try {
    Haptics?.selectionAsync();
  } catch {}
}
