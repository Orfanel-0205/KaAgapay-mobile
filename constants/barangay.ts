// constants/barangay.ts
//
// ── PURPOSE ──────────────────────────────────────────────────────────────────
// This list is used ONLY as a placeholder while useBarangays() is fetching
// the list from the API. It makes the picker instantly usable on first open
// instead of showing a blank list while the network request is in-flight.
//
// The user is NOT allowed to submit until barangaysReady === true (meaning the
// API has responded and the real DB list is in memory). This prevents a mismatch
// between this local fallback and what the DB actually contains.
//
// ── SYNC REQUIREMENT ─────────────────────────────────────────────────────────
// This list MUST match BarangaySeeder.php exactly — same spellings, same casing,
// same hyphens. If the seeder is updated, update this file too.
//
// Previous version had wrong spellings (now corrected):
//   ❌ "Asin East" / "Asin West"           (these were correct — kept)
//   ❌ "Bacundao East" / "Bacundao West"    (these were correct — kept)
//   ❌ "Banaoang"                           (was correct — kept)
//   ❌ "Buto"                               (was correct — kept)
//   ❌ "Ingala-Gala"                        (was correct — kept)
//   ❌ "Lareg-Lareg"                        (was correct — kept)
//   ❌ "Lokeb Este/Norte/Sur"               (was correct — kept)
// ─────────────────────────────────────────────────────────────────────────────

export const BARANGAYS = [
  "Abonagan",
  "Agdao",
  "Alacan",
  "Aliaga",
  "Amacalan",
  "Anolid",
  "Apaya",
  "Asin East",
  "Asin West",
  "Bacundao East",
  "Bacundao West",
  "Bakitiw",
  "Balite",
  "Banaoang",
  "Barang",
  "Bawer",
  "Binalay",
  "Bobon",
  "Bolaoit",
  "Bongar",
  "Buto",
  "Cabatling",
  "Cabueldatan",
  "Calbueg",
  "Canan Norte",
  "Canan Sur",
  "Cawayan Bogtong",
  "Don Pedro",
  "Gatang",
  "Goliman",
  "Gomez",
  "Guilig",
  "Ican",
  "Ingala-Gala",
  "Lareg-Lareg",
  "Lasip",
  "Lepa",
  "Lokeb Este",
  "Lokeb Norte",
  "Lokeb Sur",
  "Lunec",
  "Mabulitec",
  "Malimpec",
  "Manggan-Dampay",
  "Nalsian Norte",
  "Nalsian Sur",
  "Nancapian",
  "Nansangaan",
  "Olea",
  "Pacuan",
  "Palapar Norte",
  "Palapar Sur",
  "Palong",
  "Pamaranum",
  "Pasima",
  "Payar",
  "Poblacion",
  "Polong Norte",
  "Polong Sur",
  "Potiocan",
  "San Julian",
  "Tabo-Sili",
  "Taloy",
  "Taloyan",
  "Talospatang",
  "Tambac",
  "Tobor",
  "Tolonguat",
  "Tomling",
  "Umando",
  "Viado",
  "Waig",
  "Warey",
] as const;

export type Barangay = (typeof BARANGAYS)[number];