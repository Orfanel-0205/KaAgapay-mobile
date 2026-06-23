// hooks/usePasswordStrength.ts
// Client-side password validation that mirrors PasswordPolicyService.php exactly.
// Gives real-time feedback in the RegisterScreen before the API call.

export interface PasswordStrength {
  score:    number;        // 0–5
  label:    "Weak" | "Fair" | "Good" | "Strong" | "Very Strong";
  color:    string;        // Tailwind color class
  errors:   string[];      // rule violations (empty = all rules met)
  allMet:   boolean;
}

const RULES = [
  {
    key:   "length",
    label: "At least 8 characters",
    test:  (p: string) => p.length >= 8,
  },
  {
    key:   "uppercase",
    label: "At least one uppercase letter (A–Z)",
    test:  (p: string) => /[A-Z]/.test(p),
  },
  {
    key:   "lowercase",
    label: "At least one lowercase letter (a–z)",
    test:  (p: string) => /[a-z]/.test(p),
  },
  {
    key:   "number",
    label: "At least one number (0–9)",
    test:  (p: string) => /[0-9]/.test(p),
  },
  {
    key:   "symbol",
    label: "At least one special character (e.g. @, !, #)",
    test:  (p: string) => /[\W_]/.test(p),
  },
];

const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "Password1", "Password1!",
  "12345678", "123456789", "qwerty123", "iloveyou", "welcome1",
  "admin123", "letmein1", "sunshine1", "monkey123", "passw0rd",
]);

const LABELS: PasswordStrength["label"][] = [
  "Weak", "Weak", "Fair", "Good", "Strong", "Very Strong",
];
const COLORS = [
  "text-red-500", "text-red-500", "text-orange-400",
  "text-yellow-500", "text-teal-500", "text-green-600",
];
const BAR_COLORS = [
  "bg-red-400", "bg-red-400", "bg-orange-400",
  "bg-yellow-400", "bg-teal-500", "bg-green-500",
];

/**
 * Pure function — usable inside or outside React components.
 */
export function checkPassword(
  password:  string,
  firstName?: string,
  lastName?:  string,
  mobile?:    string
): PasswordStrength {
  const passed  = RULES.filter((r) => r.test(password));
  let   score   = passed.length;

  const errors: string[] = RULES
    .filter((r) => !r.test(password))
    .map((r) => r.label);

  // Common password penalty
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push("Password is too common — choose something more unique.");
    score = Math.max(0, score - 2);
  }

  // Personal info penalty
  const personal = [firstName, lastName, mobile].filter(Boolean) as string[];
  for (const info of personal) {
    if (info && password.toLowerCase().includes(info.toLowerCase())) {
      errors.push("Password must not contain your name or mobile number.");
      score = Math.max(0, score - 1);
      break;
    }
  }

  const clamped = Math.min(score, 5) as 0 | 1 | 2 | 3 | 4 | 5;

  return {
    score:   clamped,
    label:   LABELS[clamped],
    color:   COLORS[clamped],
    errors,
    allMet:  errors.length === 0 && clamped >= 4,
  };
}

// ── React hook ────────────────────────────────────────────────────────────────

import { useMemo } from "react";

export function usePasswordStrength(
  password:  string,
  firstName?: string,
  lastName?:  string,
  mobile?:    string
): PasswordStrength & { barColor: string; rules: typeof RULES } {
  return useMemo(() => ({
    ...checkPassword(password, firstName, lastName, mobile),
    barColor: BAR_COLORS[Math.min(checkPassword(password).score, 5)],
    rules:    RULES,
  }), [password, firstName, lastName, mobile]);
}

export { RULES, BAR_COLORS };