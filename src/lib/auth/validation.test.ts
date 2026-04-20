/**
 * validation.test.ts
 *
 * Unit coverage for field-level and form-level validation helpers.
 */

import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  validateSignIn,
  validateCreateAccount,
  validateResetRequest,
  validateResetComplete,
  hasErrors,
} from "./validation";

// ---------------------------------------------------------------------------
// validateEmail
// ---------------------------------------------------------------------------

describe("validateEmail", () => {
  it("returns null for a valid email", () => {
    expect(validateEmail("user@example.com")).toBeNull();
  });

  it("returns an error for an empty string", () => {
    expect(validateEmail("")).not.toBeNull();
  });

  it("returns an error for whitespace-only input", () => {
    expect(validateEmail("   ")).not.toBeNull();
  });

  it("returns an error when @ is missing", () => {
    expect(validateEmail("notanemail")).not.toBeNull();
  });

  it("returns an error when domain is missing", () => {
    expect(validateEmail("user@")).not.toBeNull();
  });

  it("returns an error when TLD is missing", () => {
    expect(validateEmail("user@domain")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validatePassword
// ---------------------------------------------------------------------------

describe("validatePassword", () => {
  it("returns null for a password of 8+ characters", () => {
    expect(validatePassword("strongpw")).toBeNull();
  });

  it("returns an error for an empty password", () => {
    expect(validatePassword("")).not.toBeNull();
  });

  it("returns an error for a password shorter than 8 characters", () => {
    expect(validatePassword("short")).not.toBeNull();
  });

  it("returns null for a password of exactly 8 characters", () => {
    expect(validatePassword("12345678")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validatePasswordConfirm
// ---------------------------------------------------------------------------

describe("validatePasswordConfirm", () => {
  it("returns null when passwords match", () => {
    expect(validatePasswordConfirm("password123", "password123")).toBeNull();
  });

  it("returns an error when confirm is empty", () => {
    expect(validatePasswordConfirm("password123", "")).not.toBeNull();
  });

  it("returns an error when passwords do not match", () => {
    expect(validatePasswordConfirm("password123", "different")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateSignIn (form-level)
// ---------------------------------------------------------------------------

describe("validateSignIn", () => {
  it("returns no errors for valid credentials", () => {
    const errors = validateSignIn("user@example.com", "strongpw1");
    expect(errors.email).toBeUndefined();
    expect(errors.password).toBeUndefined();
  });

  it("returns email error for invalid email", () => {
    const errors = validateSignIn("bad-email", "strongpw1");
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeUndefined();
  });

  it("returns password error for short password", () => {
    const errors = validateSignIn("user@example.com", "short");
    expect(errors.email).toBeUndefined();
    expect(errors.password).toBeDefined();
  });

  it("returns both errors when both fields are invalid", () => {
    const errors = validateSignIn("", "");
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// validateCreateAccount (form-level)
// ---------------------------------------------------------------------------

describe("validateCreateAccount", () => {
  it("returns no errors for valid new-account fields", () => {
    const errors = validateCreateAccount("new@example.com", "password123");
    expect(errors.email).toBeUndefined();
    expect(errors.password).toBeUndefined();
  });

  it("returns email error for invalid email", () => {
    const errors = validateCreateAccount("notanemail", "password123");
    expect(errors.email).toBeDefined();
  });

  it("returns password error for too-short password", () => {
    const errors = validateCreateAccount("new@example.com", "abc");
    expect(errors.password).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// validateResetRequest (form-level)
// ---------------------------------------------------------------------------

describe("validateResetRequest", () => {
  it("returns no errors for a valid email", () => {
    const errors = validateResetRequest("reset@example.com");
    expect(errors.email).toBeUndefined();
  });

  it("returns email error for invalid email", () => {
    const errors = validateResetRequest("bad");
    expect(errors.email).toBeDefined();
  });

  it("returns email error for empty email", () => {
    const errors = validateResetRequest("");
    expect(errors.email).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// validateResetComplete (form-level)
// ---------------------------------------------------------------------------

describe("validateResetComplete", () => {
  it("returns no errors when new password and confirm match", () => {
    const errors = validateResetComplete("newpassword1", "newpassword1");
    expect(errors.password).toBeUndefined();
    expect(errors.confirm).toBeUndefined();
  });

  it("returns password error for too-short new password", () => {
    const errors = validateResetComplete("short", "short");
    expect(errors.password).toBeDefined();
  });

  it("returns confirm error when passwords do not match", () => {
    const errors = validateResetComplete("newpassword1", "different");
    expect(errors.confirm).toBeDefined();
  });

  it("returns confirm error when confirm is empty", () => {
    const errors = validateResetComplete("newpassword1", "");
    expect(errors.confirm).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// hasErrors utility
// ---------------------------------------------------------------------------

describe("hasErrors", () => {
  it("returns false when all values are undefined", () => {
    expect(hasErrors({ email: undefined, password: undefined })).toBe(false);
  });

  it("returns true when at least one value is a string", () => {
    expect(hasErrors({ email: "Invalid email.", password: undefined })).toBe(true);
  });

  it("returns false for an empty record", () => {
    expect(hasErrors({})).toBe(false);
  });
});
