// __tests__/offlineAnswers.test.ts
//
// Dr. Quack with no signal (Nov 2026, services/offlineAnswers).
//
//   - danger words always win: "fever and cannot breathe" is an emergency
//   - everyday questions in Tagalog, English or with accents find their topic
//   - Pangasinan gets a Pangasinan line and then the checked Tagalog text
//   - every medical answer says when to go to the RHU or a hospital
//   - the hotlines and RHUs come from the app's own lists

import { findTopic, offlineAnswer } from "../services/offlineAnswers";
import { RHU_HOTLINES } from "../constants/hotlines";

const RHUS = [
  { id: 1, label: "RHU 1", name: "RHU 1 Malasiqui", sub: "Poblacion" },
  { id: 3, label: "RHU 3", name: "RHU 3 Malasiqui", sub: "Test facility" },
];

test.each([
  ["May lagnat ang anak ko at hindi makahinga", "emergency"],
  ["chest pain po since kanina", "emergency"],
  ["nakagat ng ahas si tatay", "emergency"],
  ["ayoko nang mabuhay", "crisis"],
  ["Nilalagnát ang anak ko!!", "fever"],
  ["may dengue ba sa amin, may pantal siya", "dengue"],
  ["nagtatae ang baby", "diarrhea"],
  ["ubo at sipon", "cough"],
  ["nakagat ng aso kahapon", "bites"],
  ["napaso ng mainit na tubig", "burns"],
  ["ano gagawin sa high blood", "blood_pressure"],
  ["buntis ako, ano ang dapat", "pregnancy"],
  ["saan ang RHU", "rhu"],
  ["paano mag book ng appointment", "booking"],
])("%s -> %s", (question, topic) => {
  expect(findTopic(question)).toBe(topic);
});

test("an unknown question gets the list of what can be answered, with the hotlines", () => {
  const { topic, text } = offlineAnswer("ano ang paborito mong kulay", "tl", RHUS);
  expect(topic).toBeNull();
  expect(text).toContain("lagnat");
  RHU_HOTLINES.forEach((hotline) => expect(text).toContain(hotline.number));
});

test("Pangasinan gets a Pangasinan line, then the checked Tagalog answer", () => {
  const pag = offlineAnswer("nilalagnat", "pag", RHUS).text;
  const tl = offlineAnswer("nilalagnat", "tl", RHUS).text;
  expect(pag.startsWith("Anggapoy internet natan.")).toBe(true);
  expect(pag.endsWith(tl)).toBe(true);
});

test("English is answered in English", () => {
  expect(offlineAnswer("my child has a fever", "en", RHUS).text).toContain("Use paracetamol only");
});

test("the RHU answer lists the RHUs the app last loaded", () => {
  const text = offlineAnswer("saan ang rhu", "en", RHUS).text;
  expect(text).toContain("RHU 3 Malasiqui");
});

test("every medical answer says when to go to the RHU or a hospital", () => {
  for (const question of ["lagnat", "dengue", "nagtatae", "ubo", "nakagat ng aso", "napaso", "high blood", "buntis", "hindi makahinga"]) {
    for (const lang of ["tl", "en"] as const) {
      const text = offlineAnswer(question, lang, RHUS).text;
      expect(/RHU|ospital|hospital|emergency/i.test(text)).toBe(true);
    }
  }
});
