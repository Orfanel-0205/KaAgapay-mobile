// types/auth.ts

export interface LoginPayload {
  mobile_number: string;
  password: string;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email?: string;
  mobile_number: string;
  password: string;
  password_confirmation: string;

  // Current RegisterScreen sends barangay name.
  barangay: string;

  // Optional, backend now supports this too.
  barangay_id?: number;

  birthday?: string;
  birth_date?: string;
  sex?: "male" | "female" | "other";
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}