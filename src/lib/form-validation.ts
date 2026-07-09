/**
 * Form validation utilities for TrustBridge Dashboard.
 * Provides reusable validators for user inputs with detailed error messages.
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate a GitHub username.
 */
export function validateGithubUsername(username: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!username || !username.trim()) {
    errors.push({
      field: 'username',
      message: 'GitHub username is required',
      code: 'REQUIRED',
    });
    return { valid: false, errors };
  }

  const trimmed = username.trim();

  if (trimmed.length < 1) {
    errors.push({
      field: 'username',
      message: 'Username must be at least 1 character',
      code: 'MIN_LENGTH',
    });
  }

  if (trimmed.length > 39) {
    errors.push({
      field: 'username',
      message: 'Username must be at most 39 characters',
      code: 'MAX_LENGTH',
    });
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(trimmed)) {
    errors.push({
      field: 'username',
      message: 'Username can only contain alphanumeric characters and hyphens, and cannot start or end with a hyphen',
      code: 'INVALID_FORMAT',
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a Stellar address.
 */
export function validateStellarAddress(address: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!address || !address.trim()) {
    errors.push({
      field: 'stellar_address',
      message: 'Stellar address is required',
      code: 'REQUIRED',
    });
    return { valid: false, errors };
  }

  const trimmed = address.trim();

  if (!trimmed.startsWith('G')) {
    errors.push({
      field: 'stellar_address',
      message: 'Stellar address must start with "G"',
      code: 'INVALID_PREFIX',
    });
  }

  if (trimmed.length !== 56) {
    errors.push({
      field: 'stellar_address',
      message: 'Stellar address must be exactly 56 characters',
      code: 'INVALID_LENGTH',
    });
  }

  if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
    errors.push({
      field: 'stellar_address',
      message: 'Stellar address must be alphanumeric',
      code: 'INVALID_FORMAT',
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate email address.
 */
export function validateEmail(email: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!email || !email.trim()) {
    errors.push({
      field: 'email',
      message: 'Email is required',
      code: 'REQUIRED',
    });
    return { valid: false, errors };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    errors.push({
      field: 'email',
      message: 'Email address is invalid',
      code: 'INVALID_FORMAT',
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a number within bounds.
 */
export function validateNumberRange(
  value: unknown,
  fieldName: string,
  options: { min?: number; max?: number },
): ValidationResult {
  const errors: ValidationError[] = [];

  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num)) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be a valid number`,
      code: 'INVALID_TYPE',
    });
    return { valid: false, errors };
  }

  if (options.min !== undefined && num < options.min) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be at least ${options.min}`,
      code: 'MIN_VALUE',
    });
  }

  if (options.max !== undefined && num > options.max) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be at most ${options.max}`,
      code: 'MAX_VALUE',
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Combine multiple validation results.
 */
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const errors = results.flatMap((r) => r.errors);
  return { valid: errors.length === 0, errors };
}

/**
 * Validate registration form data.
 */
export function validateRegistrationForm(data: {
  username?: string;
  stellar_address?: string;
}): ValidationResult {
  const usernameResult = validateGithubUsername(data.username || '');
  const addressResult = validateStellarAddress(data.stellar_address || '');

  return combineValidationResults(usernameResult, addressResult);
}

/**
 * Get first error message for a field.
 */
export function getFirstErrorMessage(
  errors: ValidationError[],
  fieldName: string,
): string | null {
  const error = errors.find((e) => e.field === fieldName);
  return error?.message || null;
}
