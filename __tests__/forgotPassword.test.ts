/// <reference types="jest" />
/// <reference types="node" />
// Jest globals for this file only: tsconfig limits ambient types to
// NativeWind, and app code should not see describe/expect.
// __tests__/forgotPassword.test.ts
//
// "Nakalimutan ang password?" on the resident app.
//
// The resident endpoints, never the staff ones; the field error the server
// gives for a weak password, not its generic summary; and a screen that never
// shows where a code went -- only a real account has that, so showing it
// would tell anyone whether a number is registered at the RHU.

import fs from "node:fs";
import path from "node:path";

const mockPost = jest.fn();

jest.mock("../services/api/client", () => ({
  __esModule: true,
  default: { post: (...args: unknown[]) => mockPost(...args) },
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import {
  requestPasswordReset,
  resendResetCode,
  resetErrorMessage,
  resetPassword,
} from "../hooks/useAuth";

beforeEach(() => mockPost.mockReset());

describe("the reset requests", () => {
  it("asks the resident endpoint and keeps the challenge", async () => {
    mockPost.mockResolvedValueOnce({ data: { challenge: "c-1", message: "If an account...", resend_after: 60 } });

    const sent = await requestPasswordReset("09171234567");

    expect(mockPost).toHaveBeenCalledWith("/forgot-password", { login: "09171234567" });
    expect(sent).toEqual({ challenge: "c-1", message: "If an account...", resendAfter: 60 });
  });

  it("sends the code with both passwords, and resends on the resident endpoint", async () => {
    mockPost.mockResolvedValueOnce({ data: { message: "Changed." } });
    mockPost.mockResolvedValueOnce({ data: { message: "New code.", resend_after: 60 } });

    await resetPassword({ challenge: "c-1", code: "123456", password: "A-b-123!x", password_confirmation: "A-b-123!x" });
    await resendResetCode("c-1");

    expect(mockPost.mock.calls[0][0]).toBe("/reset-password");
    expect(mockPost.mock.calls[1][0]).toBe("/forgot-password/resend");
  });

  it("shows what is wrong with the password, not the generic summary", () => {
    const refused = {
      response: {
        status: 422,
        data: {
          message: "The given data was invalid.",
          errors: { password: ["The password field must contain at least one symbol."] },
        },
      },
    };

    expect(resetErrorMessage(refused, "fallback")).toBe("The password field must contain at least one symbol.");
    expect(resetErrorMessage({ response: { data: { message: "Incorrect code. 4 attempts left." } } }, "fallback")).toBe(
      "Incorrect code. 4 attempts left."
    );
    expect(resetErrorMessage(new Error("Network Error"), "fallback")).toBe("fallback");
  });
});

describe("the screens", () => {
  const read = (file: string) => fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");

  it("is reachable from the sign-in screen", () => {
    expect(read("screens/auth/LoginScreen.tsx")).toContain('pathname: "/(auth)/forgot-password"');
    expect(fs.existsSync(path.resolve(__dirname, "../app/(auth)/forgot-password.tsx"))).toBe(true);
  });

  it("never shows where a code went", () => {
    expect(read("screens/auth/ForgotPasswordScreen.tsx")).not.toMatch(/masked_?[Mm]obile|masked_?[Ee]mail/);
  });

  it("keeps the fields above the keyboard", () => {
    expect(read("screens/auth/ForgotPasswordScreen.tsx")).toContain("<KeyboardSafeView");
  });
});
