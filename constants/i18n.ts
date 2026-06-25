// constants/i18n.ts
// Global multilingual dictionary for Ka-Agapay.
// Language choices:
//   tl  = Tagalog / Filipino
//   pag = Pangasinense
//   en  = English
//
// All screens should use:
//   const lang = useLang();
//   tr("key_name", lang);
//
// Changing language from one screen updates the whole app because this reads
// from the shared Zustand useLanguageStore.

import { useLanguageStore } from "../store/useLanguageStore";

export type Lang = "tl" | "pag" | "en";

type Dict = Record<string, Record<Lang, string>>;

export const LANGUAGE_OPTIONS: Array<{
  code: Lang;
  shortLabel: string;
  label: string;
  nativeLabel: string;
}> = [
  {
    code: "tl",
    shortLabel: "TAG",
    label: "Tagalog",
    nativeLabel: "Tagalog",
  },
  {
    code: "pag",
    shortLabel: "PAG",
    label: "Pangasinense",
    nativeLabel: "Pangasinan",
  },
  {
    code: "en",
    shortLabel: "EN",
    label: "English",
    nativeLabel: "English",
  },
];

export function getSafeLang(value?: string | null): Lang {
  if (value === "tl" || value === "pag" || value === "en") {
    return value;
  }

  return "tl";
}

export function langToLocale(lang: Lang): string {
  if (lang === "tl") return "tl-PH";
  if (lang === "pag") return "en-PH";
  return "en-PH";
}

export const STRINGS: Dict = {
  // Common
  app_name: {
    tl: "Ka-Agapay",
    pag: "Ka-Agapay",
    en: "Ka-Agapay",
  },
  loading: {
    tl: "Naglo-load...",
    pag: "Onlolod...",
    en: "Loading...",
  },
  retry: {
    tl: "Subukan ulit",
    pag: "Pawilen lamet",
    en: "Retry",
  },
  cancel: {
    tl: "Kanselahin",
    pag: "Kanselaen",
    en: "Cancel",
  },
  save: {
    tl: "I-save",
    pag: "I-save",
    en: "Save",
  },
  close: {
    tl: "Isara",
    pag: "Iserra",
    en: "Close",
  },
  confirm: {
    tl: "Kumpirmahin",
    pag: "Kompirmaen",
    en: "Confirm",
  },
  view_all: {
    tl: "Tingnan lahat",
    pag: "Nengnengen amin",
    en: "View all",
  },
  status: {
    tl: "Status",
    pag: "Status",
    en: "Status",
  },
  active: {
    tl: "aktibo",
    pag: "aktibo",
    en: "active",
  },
  pending: {
    tl: "Nakabinbin",
    pag: "Pending",
    en: "Pending",
  },
  registered: {
    tl: "Rehistrado",
    pag: "Rehistrado",
    en: "Registered",
  },
  no_date: {
    tl: "Walang petsa",
    pag: "Anggapo petsa",
    en: "No date",
  },
  no_time: {
    tl: "Walang oras",
    pag: "Anggapo oras",
    en: "No time",
  },
  no_data: {
    tl: "Walang data",
    pag: "Anggapo data",
    en: "No data",
  },
  language_title: {
    tl: "Wika",
    pag: "Salita",
    en: "Language",
  },
  choose_language: {
    tl: "Pumili ng wika",
    pag: "Pilien so salita",
    en: "Choose language",
  },
  language_applies_all: {
    tl: "Gagamitin ito sa buong app.",
    pag: "Usaren iya ed interon app.",
    en: "This applies to the whole app.",
  },

  // Dashboard
  greeting_morning: {
    tl: "Magandang umaga",
    pag: "Maung kabwasan",
    en: "Good morning",
  },
  greeting_afternoon: {
    tl: "Magandang hapon",
    pag: "Maung hapon",
    en: "Good afternoon",
  },
  greeting_evening: {
    tl: "Magandang gabi",
    pag: "Maung labi",
    en: "Good evening",
  },
  dashboard_companion: {
    tl: "Ang iyong RHU health companion",
    pag: "Say RHU health companion mo",
    en: "Your RHU health companion",
  },
  queue_status: {
    tl: "Estado ng Pila",
    pag: "Estado na Pila",
    en: "Queue Status",
  },
  no_queue: {
    tl: "Walang aktibong tiket",
    pag: "Anggapo aktibo a tiket",
    en: "No active queue ticket",
  },
  position: {
    tl: "Posisyon",
    pag: "Posisyon",
    en: "Position",
  },
  wait_min: {
    tl: "min na hintay",
    pag: "min a abtasan",
    en: "min wait",
  },
  my_event_tickets: {
    tl: "Aking Event Tickets",
    pag: "Saray Event Tickets Ko",
    en: "My Event Tickets",
  },
  event_queue_no: {
    tl: "Queue No.",
    pag: "Queue No.",
    en: "Queue No.",
  },
  next_appt: {
    tl: "Susunod na Appointment",
    pag: "Onsublay a Appointment",
    en: "Next Appointment",
  },
  quick_actions: {
    tl: "Mabilis na Aksyon",
    pag: "Mabilis a Gawa",
    en: "Quick Actions",
  },
  book: {
    tl: "Mag-book",
    pag: "Ireserba",
    en: "Book",
  },
  book_sub: {
    tl: "Mag-iskedyul",
    pag: "Mangiiskedyul",
    en: "Schedule",
  },
  records: {
    tl: "Rekord",
    pag: "Rekord",
    en: "Records",
  },
  records_sub: {
    tl: "Medikal na kasaysayan",
    pag: "Medikal a kasalayan",
    en: "Medical history",
  },
  notif: {
    tl: "Abiso",
    pag: "Impormasyon",
    en: "Notifications",
  },
  notif_new: {
    tl: "bago",
    pag: "balo",
    en: "new",
  },
  notif_none: {
    tl: "Walang bago",
    pag: "Anggapo balo",
    en: "Nothing new",
  },
  events: {
    tl: "Events",
    pag: "Aktibidad",
    en: "Events",
  },
  events_sub: {
    tl: "Mga aktibidad",
    pag: "Saray aktibidad",
    en: "Activities",
  },
  announcements: {
    tl: "Mga Anunsyo",
    pag: "Saray Anunsyo",
    en: "Announcements",
  },
  no_announcements: {
    tl: "Walang anunsyo ngayon.",
    pag: "Anggapo anunsyo natan.",
    en: "No announcements today.",
  },
  ai_summary: {
    tl: "Huling Konsultasyon",
    pag: "Sampot a Konsultasyon",
    en: "Last Consultation",
  },
  cat_health: {
    tl: "Health Alert",
    pag: "Alerto ed Salud",
    en: "Health Alert",
  },
  cat_program: {
    tl: "Programa",
    pag: "Programa",
    en: "Program",
  },
  cat_general: {
    tl: "Pangkalahatan",
    pag: "Lohaan",
    en: "General",
  },
  doctor_prefix: {
    tl: "Dr.",
    pag: "Dr.",
    en: "Dr.",
  },
  events_ai_summary: {
    tl: "Buod ng Events",
    pag: "Buod na Aktibidad",
    en: "Events Summary",
  },
  events_ai_tap: {
    tl: "I-tap para makita ang buod ng mga events",
    pag: "I-tap pian nanengneng so buod na aktibidad",
    en: "Tap to see a summary of upcoming events",
  },
  events_ai_no_events: {
    tl: "Walang events para sa buod.",
    pag: "Anggapo aktibidad para ed buod.",
    en: "No events to summarize.",
  },

  // Login
  login_title: {
    tl: "Mag-sign in",
    pag: "Man-sign in",
    en: "Sign in",
  },
  login_subtitle: {
    tl: "Ang iyong kaagapay sa kalusugan",
    pag: "Say kaagapay mo ed salud",
    en: "Your health companion",
  },
  mobile_number: {
    tl: "Mobile Number",
    pag: "Mobile Number",
    en: "Mobile Number",
  },
  password: {
    tl: "Password",
    pag: "Password",
    en: "Password",
  },
  sign_in: {
    tl: "Sign In",
    pag: "Sign In",
    en: "Sign In",
  },
  login_with_face_id: {
    tl: "Login gamit ang Face ID",
    pag: "Login gamit so Face ID",
    en: "Login with Face ID",
  },
  login_with_fingerprint: {
    tl: "Login gamit ang Fingerprint",
    pag: "Login gamit so Fingerprint",
    en: "Login with Fingerprint",
  },
  no_account_register: {
    tl: "Wala pang account?",
    pag: "Anggapo ni account?",
    en: "No account yet?",
  },
  register: {
    tl: "Mag-register",
    pag: "Man-register",
    en: "Register",
  },

  // Register / Profile
  profile: {
    tl: "Profile",
    pag: "Profile",
    en: "Profile",
  },
  id_verified: {
    tl: "ID Verified",
    pag: "ID Verified",
    en: "ID Verified",
  },
  id_not_verified: {
    tl: "ID Not Verified",
    pag: "ID Not Verified",
    en: "ID Not Verified",
  },
  edit: {
    tl: "I-edit",
    pag: "I-edit",
    en: "Edit",
  },
  logout: {
    tl: "Mag-logout",
    pag: "Man-logout",
    en: "Logout",
  },
  biometric_login: {
    tl: "Biometric Login",
    pag: "Biometric Login",
    en: "Biometric Login",
  },
  upload_profile_photo: {
    tl: "Mag-upload ng profile picture",
    pag: "Man-upload na profile picture",
    en: "Upload profile picture",
  },
  id_verification: {
    tl: "ID Verification",
    pag: "ID Verification",
    en: "ID Verification",
  },

  // Announcements / Events
  announcements_subtitle: {
    tl: "Pinakabagong abiso at health advisories ng RHU.",
    pag: "Saray balon abiso tan health advisories na RHU.",
    en: "Latest RHU notices and health advisories.",
  },
  no_announcements_yet: {
    tl: "Wala pang anunsyo",
    pag: "Anggapo ni anunsyo",
    en: "No announcements yet",
  },
  check_again_later: {
    tl: "Pakisuri muli mamaya.",
    pag: "Nengnengen lamet kayari.",
    en: "Please check again later.",
  },
  rhu_posts: {
    tl: "RHU Posts",
    pag: "RHU Posts",
    en: "RHU Posts",
  },
  rhu_posts_subtitle: {
    tl: "Events, programa, at anunsyo mula sa RHU staff.",
    pag: "Events, programa, tan anunsyo manlapud RHU staff.",
    en: "Published events, programs, and announcements from RHU staff.",
  },
  search_posts: {
    tl: "Maghanap ng posts...",
    pag: "Mananap na posts...",
    en: "Search posts...",
  },
  no_posts_yet: {
    tl: "Wala pang published posts",
    pag: "Anggapo ni published posts",
    en: "No published posts yet",
  },
  event_details: {
    tl: "Event Details",
    pag: "Detalye na Event",
    en: "Event Details",
  },
  loading_events: {
    tl: "Naglo-load ng events...",
    pag: "Onlolod na events...",
    en: "Loading events...",
  },
  loading_details: {
    tl: "Naglo-load ng detalye...",
    pag: "Onlolod na detalye...",
    en: "Loading details...",
  },
  failed_load_events: {
    tl: "Hindi ma-load ang events",
    pag: "Ag naload so events",
    en: "Failed to load events",
  },
  event_not_found: {
    tl: "Hindi makita ang event",
    pag: "Ag nanengneng so event",
    en: "Event not found",
  },

  // Appointments
  appts_title: {
    tl: "Mga Appointment",
    pag: "Saray Appointment",
    en: "Appointments",
  },
  appts_subtitle: {
    tl: "Mag-book at subaybayan ang iyong online o onsite consultation.",
    pag: "Man-book tan bantayan so online o onsite a konsultasyon mo.",
    en: "Book and track your online or onsite consultation.",
  },
  book_new_appt: {
    tl: "+ Mag-book ng Bagong Appointment",
    pag: "+ Man-book na Balon Appointment",
    en: "+ Book New Appointment",
  },
  book_new_appt_sub: {
    tl: "Pumili ng online o onsite consultation",
    pag: "Mamili na online o onsite a konsultasyon",
    en: "Choose online or onsite consultation",
  },
  empty_appts_title: {
    tl: "Wala pang appointment",
    pag: "Anggapo ni appointment",
    en: "No appointments yet",
  },
  empty_appts_body: {
    tl: "Pindutin ang Mag-book para humiling ng consultation.",
    pag: "Pindoten so Man-book pian mikerew na konsultasyon.",
    en: "Tap Book to request a consultation.",
  },
  create_appt_title: {
    tl: "Mag-book ng Appointment",
    pag: "Man-book na Appointment",
    en: "Book Appointment",
  },
  create_appt_subtitle: {
    tl: "Pumili ng online o onsite consultation.",
    pag: "Mamili na online o onsite a konsultasyon.",
    en: "Choose online or onsite consultation.",
  },
  consultation_type: {
    tl: "Uri ng Consultation",
    pag: "Klase na Konsultasyon",
    en: "Consultation Type",
  },
  onsite: {
    tl: "Onsite",
    pag: "Onsite",
    en: "Onsite",
  },
  onsite_sub: {
    tl: "Pumunta sa RHU clinic",
    pag: "Onla ed RHU clinic",
    en: "Visit the RHU clinic",
  },
  online: {
    tl: "Online",
    pag: "Online",
    en: "Online",
  },
  online_sub: {
    tl: "Video/chat consultation",
    pag: "Video/chat a konsultasyon",
    en: "Video/chat consultation",
  },
  reason_label: {
    tl: "Dahilan",
    pag: "Rason",
    en: "Reason",
  },
  reason_ph: {
    tl: "Halimbawa: Lagnat at ubo",
    pag: "Alimbawa: Petang tan sebeg",
    en: "Example: Fever and cough",
  },
  symptoms_label: {
    tl: "Mga Sintomas",
    pag: "Saray Sintomas",
    en: "Symptoms",
  },
  symptoms_ph: {
    tl: "Halimbawa: Nahihilo, sumasakit ang ulo...",
    pag: "Alimbawa: Onlilingo, ot-ot so ulo...",
    en: "Example: Dizzy, headache...",
  },
  preferred_date: {
    tl: "Nais na Petsa",
    pag: "Pilien ya Petsa",
    en: "Preferred Date",
  },
  preferred_time: {
    tl: "Nais na Oras",
    pag: "Pilien ya Oras",
    en: "Preferred Time",
  },
  submit_appt: {
    tl: "Isumite ang Appointment",
    pag: "Ipawit so Appointment",
    en: "Submit Appointment",
  },
  appointment_details: {
    tl: "Detalye ng Appointment",
    pag: "Detalye na Appointment",
    en: "Appointment Details",
  },

  // Records / Consultations
  records_title: {
    tl: "Mga Medikal na Rekord",
    pag: "Saray Medikal a Rekord",
    en: "Medical Records",
  },
  records_subtitle: {
    tl: "Mga reseta, lab request, consultation, at tala ng paggamot.",
    pag: "Saray reseta, lab request, konsultasyon, tan tala na panangtambal.",
    en: "Prescriptions, lab requests, consultations, and treatment notes.",
  },
  tab_prescriptions: {
    tl: "Reseta / Lab Request",
    pag: "Reseta / Lab Request",
    en: "Prescription / Lab Request",
  },
  tab_consultations: {
    tl: "Mga Consultation",
    pag: "Saray Konsultasyon",
    en: "Consultations",
  },
  loading_records: {
    tl: "Kinukuha ang mga rekord...",
    pag: "Aala-la so saray rekord...",
    en: "Loading records...",
  },
  empty_prescriptions_title: {
    tl: "Wala pang reseta o lab request",
    pag: "Anggapo ni reseta odino lab request",
    en: "No prescriptions or lab requests yet",
  },
  empty_prescriptions_body: {
    tl: "Lalabas dito ang reseta at lab request pagkatapos ng consultation.",
    pag: "Ompaway dia so reseta tan lab request kayari na konsultasyon.",
    en: "Your prescriptions and lab requests will appear here after consultation.",
  },
  empty_consultations_title: {
    tl: "Wala pang consultation",
    pag: "Anggapo ni konsultasyon",
    en: "No consultations yet",
  },
  empty_consultations_body: {
    tl: "Lalabas dito ang natapos na consultations at SOAP summaries.",
    pag: "Ompaway dia so asumpal a konsultasyon tan buod na SOAP.",
    en: "Completed consultations and SOAP summaries will appear here.",
  },
  label_diagnosis: {
    tl: "Diyagnosis",
    pag: "Diyagnosis",
    en: "Diagnosis",
  },
  label_medications: {
    tl: "Mga Gamot",
    pag: "Saray Tambal",
    en: "Medications",
  },
  no_medicines: {
    tl: "Walang nakalistang gamot.",
    pag: "Anggapo nilista a tambal.",
    en: "No medicines listed.",
  },
  valid_until: {
    tl: "Wasto hanggang",
    pag: "Balido anggad",
    en: "Valid until",
  },
  consults_title: {
    tl: "Mga Consultation",
    pag: "Saray Konsultasyon",
    en: "Consultations",
  },
  consults_subtitle: {
    tl: "Tingnan ang consultation history at SOAP summaries.",
    pag: "Nengnengen so awaran na konsultasyon tan buod na SOAP.",
    en: "View your consultation history and SOAP summaries.",
  },

  // Notifications
  notif_title: {
    tl: "Mga Abiso",
    pag: "Saray Abiso",
    en: "Notifications",
  },
  notif_filter_all: {
    tl: "Lahat",
    pag: "Amin",
    en: "All",
  },
  notif_filter_unread: {
    tl: "Hindi pa nabasa",
    pag: "Agni nabasa",
    en: "Unread",
  },
  notif_read_all: {
    tl: "Basahin lahat",
    pag: "Basaen amin",
    en: "Read all",
  },
  loading_notif: {
    tl: "Kinukuha ang mga abiso...",
    pag: "Aala-la so saray abiso...",
    en: "Loading notifications...",
  },
  empty_notif: {
    tl: "Wala pang abiso.",
    pag: "Anggapo ni abiso.",
    en: "No notifications yet.",
  },

  // Telemedicine
  telemedicine_title: {
    tl: "Telemedicine",
    pag: "Telemedicine",
    en: "Telemedicine",
  },
  telemedicine_subtitle: {
    tl: "Video consultation sa inyong doktor",
    pag: "Video consultation ed doktor yo",
    en: "Video consultation with your doctor",
  },
  telemedicine_empty_title: {
    tl: "Walang naka-schedule na telemedicine",
    pag: "Anggapo naka-schedule a telemedicine",
    en: "No scheduled telemedicine",
  },
  telemedicine_empty_body: {
    tl: "Mag-book ng appointment para ma-access ang video consultation.",
    pag: "Man-book na appointment pian ma-access so video consultation.",
    en: "Book an appointment to access video consultation.",
  },

  // OCR
  ocr_title: {
    tl: "ID Verification",
    pag: "ID Verification",
    en: "ID Verification",
  },
  ocr_subtitle: {
    tl: "Mag-upload ng malinaw na larawan ng valid ID.",
    pag: "Man-upload na malinew ya litrato na valid ID.",
    en: "Upload a clear photo of a valid ID.",
  },
  upload_verify: {
    tl: "Upload & Verify",
    pag: "Upload & Verify",
    en: "Upload & Verify",
  },

  // Emergency
  emergency_contacts: {
    tl: "Emergency Contacts",
    pag: "Emergency Contacts",
    en: "Emergency Contacts",
  },
  emergency_subtitle: {
    tl: "Piliin ang naaangkop na emergency contact.",
    pag: "Pilien so manepeg a emergency contact.",
    en: "Choose the appropriate emergency contact.",
  },
  call_now: {
    tl: "Tumawag ngayon",
    pag: "Tumawag natan",
    en: "Call now",
  },
  auto_call: {
    tl: "Auto-call",
    pag: "Auto-call",
    en: "Auto-call",
  },

  // Chatbot
  chatbot_title: {
    tl: "Chat",
    pag: "Chat",
    en: "Chat",
  },
  chatbot_typing: {
    tl: "Nagta-type si Dr. Quack-quack...",
    pag: "On-type si Dr. Quack-quack...",
    en: "Dr. Quack-quack is typing...",
  },
  chatbot_placeholder: {
    tl: "I-type ang tanong mo...",
    pag: "I-type so tepet mo...",
    en: "Type your question...",
  },
};

export const tr = (key: string, lang: Lang): string =>
  STRINGS[key]?.[lang] ?? STRINGS[key]?.en ?? key;

export function useLang(): Lang {
  return useLanguageStore((s) => getSafeLang(s.lang));
}
