// constants/hotlines.ts
// The RHUs' emergency hotlines, in one place: the SOS button
// (Components/EmergencyButton) and Dr. Quack's offline answers
// (services/offlineAnswers) both read them, so a changed number is changed
// once.

export const RHU_HOTLINES: Array<{ label: string; number: string }> = [
  { label: "RHU1 Emergency Hotline", number: "09338678423" },
  { label: "RHU2 Emergency Hotline", number: "(075) 632-7543" },
];
