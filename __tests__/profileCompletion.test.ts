/// <reference types="jest" />
// Jest globals for this file only: tsconfig limits ambient types to
// NativeWind, and app code should not see describe/expect.
// __tests__/profileCompletion.test.ts
//
// Whether a resident is allowed to book a consultation.
//
// The gate is deliberate in both directions, and both directions fail quietly.
// Too strict, and a resident with no guardian or no PhilHealth number -- which
// is a large part of the people an RHU serves -- is told their profile is
// incomplete and cannot book at all, with no field on screen they can fill to
// fix it. Too loose, and a consultation arrives at the desk with no birth date
// or no barangay, which the heatmap and the patient record both depend on.
//
// The backend's own answer, when it sends one, outranks this calculation: the
// server knows things the phone does not, such as whether a PhilHealth number
// has been verified.

import {
  computeProfileCompletion,
  resolveProfileCompletion,
} from "../utils/profileCompletion";

/** A resident with every required field and nothing optional. */
const complete = {
  first_name: "Juan",
  last_name: "Dela Cruz",
  birth_date: "1990-01-15",
  sex: "male",
  civil_status: "single",
  mobile_number: "09171234567",
  barangay_id: 12,
};

describe("computeProfileCompletion", () => {
  it("lets a resident book with only the required fields", () => {
    const result = computeProfileCompletion(complete as never);

    expect(result.can_book_consultation).toBe(true);
    expect(result.percent).toBe(100);
    expect(result.missing_fields).toEqual([]);
  });

  it("does not require a guardian or a PhilHealth number", () => {
    // Many residents have neither. Requiring them would lock those people
    // out of booking entirely.
    const result = computeProfileCompletion(complete as never);

    expect(result.guardian_present).toBe(false);
    expect(result.philhealth_present).toBe(false);
    expect(result.can_book_consultation).toBe(true);
  });

  it("names exactly what is missing, so the resident knows what to fill", () => {
    const { birth_date, barangay_id, ...partial } = complete;
    const result = computeProfileCompletion(partial as never);

    expect(result.can_book_consultation).toBe(false);
    expect(result.missing_fields).toEqual(["birth_date", "barangay"]);
    expect(result.missing_labels).toEqual(["Birth Date", "Barangay / Address"]);
    expect(result.percent).toBe(71); // 5 of 7, rounded
  });

  it("accepts the field under any of the names the API has used", () => {
    // The profile endpoint and the login response spell some fields
    // differently. A resident should not be blocked by a naming difference.
    const result = computeProfileCompletion({
      first_name: "Ana",
      last_name: "Reyes",
      date_of_birth: "1985-06-30",
      gender: "female",
      civil_status: "married",
      phone: "09181234567",
      address: "Purok 3",
    } as never);

    expect(result.can_book_consultation).toBe(true);
  });

  it("treats a field of spaces as empty", () => {
    const result = computeProfileCompletion({ ...complete, last_name: "   " } as never);

    expect(result.can_book_consultation).toBe(false);
    expect(result.missing_fields).toEqual(["last_name"]);
  });

  it("is incomplete, not broken, when there is no user yet", () => {
    const result = computeProfileCompletion(null);

    expect(result.can_book_consultation).toBe(false);
    expect(result.missing_fields).toHaveLength(7);
    expect(result.percent).toBe(0);
  });
});

describe("resolveProfileCompletion", () => {
  it("trusts the server's answer over the phone's own calculation", () => {
    // Locally this profile is complete; the server says otherwise, and the
    // server is the one that will accept or refuse the booking.
    const result = resolveProfileCompletion({
      ...complete,
      profile_completion: {
        is_complete: false,
        can_book_consultation: false,
        percent: 86,
        missing_fields: ["barangay"],
        missing_labels: ["Barangay / Address"],
        message: "Choose your barangay.",
      },
    });

    expect(result.can_book_consultation).toBe(false);
    expect(result.missing_fields).toEqual(["barangay"]);
  });

  it("falls back to the local calculation when the server sends none", () => {
    expect(resolveProfileCompletion(complete).can_book_consultation).toBe(true);
  });
});
