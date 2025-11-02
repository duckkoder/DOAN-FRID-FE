/**
 * Password validation utilities
 * Matches backend requirements in app/utils/validators.py
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PasswordRequirement {
  regex: RegExp;
  message: string;
  check: (password: string) => boolean;
}

/**
 * Password requirements matching backend validation
 */
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    regex: /.{8,}/,
    message: "Ít nhất 8 ký tự",
    check: (password: string) => password.length >= 8,
  },
  {
    regex: /[A-Z]/,
    message: "Ít nhất 1 chữ hoa (A-Z)",
    check: (password: string) => /[A-Z]/.test(password),
  },
  {
    regex: /[a-z]/,
    message: "Ít nhất 1 chữ thường (a-z)",
    check: (password: string) => /[a-z]/.test(password),
  },
  {
    regex: /\d/,
    message: "Ít nhất 1 chữ số (0-9)",
    check: (password: string) => /\d/.test(password),
  },
];

/**
 * Combined regex pattern for password validation
 */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Validate password strength
 * @param password - Password string to validate
 * @returns Validation result with errors array
 */
export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];

  PASSWORD_REQUIREMENTS.forEach((requirement) => {
    if (!requirement.check(password)) {
      errors.push(requirement.message);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Check if a single requirement is met
 * @param password - Password string
 * @param index - Index of requirement to check
 * @returns true if requirement is met
 */
export const checkRequirement = (password: string, index: number): boolean => {
  if (index < 0 || index >= PASSWORD_REQUIREMENTS.length) {
    return false;
  }
  return PASSWORD_REQUIREMENTS[index].check(password);
};

/**
 * Get validation status for Ant Design Form
 * @param password - Password string
 * @returns Validation status and help text
 */
export const getPasswordFormValidation = (password: string) => {
  if (!password) {
    return {
      validateStatus: undefined,
      help: undefined,
    };
  }

  const validation = validatePassword(password);

  if (validation.isValid) {
    return {
      validateStatus: "success" as const,
      help: "Mật khẩu hợp lệ",
    };
  }

  return {
    validateStatus: "error" as const,
    help: validation.errors.join(", "),
  };
};

/**
 * Examples of valid passwords
 */
export const VALID_PASSWORD_EXAMPLES = [
  "Password123",
  "Test1234",
  "MyPass99",
  "Student2024",
];

/**
 * Examples of invalid passwords with reasons
 */
export const INVALID_PASSWORD_EXAMPLES = [
  { password: "pass1234", reason: "Thiếu chữ hoa" },
  { password: "PASS1234", reason: "Thiếu chữ thường" },
  { password: "Password", reason: "Thiếu chữ số" },
  { password: "Pass12", reason: "Ít hơn 8 ký tự" },
];
