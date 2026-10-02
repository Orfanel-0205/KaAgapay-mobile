/// <reference types="jest" />
// Jest globals for this file only: tsconfig limits ambient types to
// NativeWind, and app code should not see describe/expect.
// __tests__/signInCode.test.ts
//
// Signing in after a wrong password.
//
// The server answers the right password on such an account with HTTP 403 and
// code_required, and texts a code to the resident's phone. The login screen
// has to recognise that as "ask for the code" and not as "login failed" --
// otherwise a resident who mistyped once sees an error, never reaches the code
// screen, and is locked out of their own account by a security feature.
//
// Equally, a real refusal (a suspended or pending account) must stay a
// refusal, not open a code screen for a code that was never sent.

jest.mock("../services/api/client", () => ({ __esModule: true, default: {} }));

// The auth store persists with AsyncStorage, a native module that does not
// exist under Jest; the library ships this mock for exactly that.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

import { readSignInChallenge } from "../hooks/useAuth";

function httpError(status: number, data: unknown) {
  return { isAxiosError: true, response: { status, data } };
}

describe("readSignInChallenge", () => {
  it("recognises the code step and keeps what the screen needs", () => {
    expect(
      readSignInChallenge(
        httpError(403, {
          code_required: true,
          challenge: "abc123",
          masked_mobile: "615",
          expires_in: 300,
          resend_after: 60,
          message: "For your security, enter the 6-digit code…",
        })
      )
    ).toEqual({ challenge: "abc123", maskedMobile: "615", expiresIn: 300, resendAfter: 60 });
  });

  it("leaves a real refusal alone", () => {
    // Pending or suspended accounts are also 403, without code_required.
    expect(
      readSignInChallenge(httpError(403, { message: "Your account has been suspended. Contact the RHU." }))
    ).toBeNull();
  });

  it("does not treat a wrong password as a code step", () => {
    expect(readSignInChallenge(httpError(401, { message: "Invalid credentials." }))).toBeNull();
  });

  it("needs a challenge to be a code step at all", () => {
    expect(readSignInChallenge(httpError(403, { code_required: true }))).toBeNull();
  });

  it("is null for a network failure with no response", () => {
    expect(readSignInChallenge(new Error("Network Error"))).toBeNull();
    expect(readSignInChallenge(undefined)).toBeNull();
  });
});
