'use client';

import { CheckCircle } from 'lucide-react';

const LABELS = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
const COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-green-500',
];

export function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return strength;
}

const REQUIREMENTS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function PasswordStrength({ password }: { password: string }) {
  const strength = getPasswordStrength(password);

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all duration-300 ${COLORS[strength - 1] ?? 'bg-muted'}`}
            style={{ width: `${(strength / 5) * 100}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={5}
            aria-valuenow={strength}
            aria-label="Password strength"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Strength: {LABELS[strength - 1] ?? 'Very Weak'}
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        {REQUIREMENTS.map((requirement) => {
          const passed = requirement.test(password);
          return (
            <li
              key={requirement.label}
              className={`flex items-center gap-1 ${passed ? 'text-green-600 dark:text-green-400' : ''}`}
            >
              {passed ? (
                <CheckCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
              ) : (
                <span className="h-3 w-3 shrink-0" aria-hidden="true" />
              )}
              {requirement.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}