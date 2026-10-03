/// <reference types="jest" />
/// <reference types="node" />
// Jest globals for this file only: tsconfig limits ambient types to
// NativeWind, and app code should not see describe/expect.
// __tests__/chatbotComposer.test.ts
//
// Two chatbot behaviours that are easy to undo by accident.
//
// A picked photo has to wait in the composer so the resident can ask about
// it; sending it straight from the picker takes that chance away.
//
// Auto speak has to start off. A phone that reads symptoms aloud in a
// waiting room without being asked to is a privacy problem.

import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");

describe("sending a photo from the chatbot", () => {
  const screen = read("screens/ChatbotScreen.tsx");

  it("keeps the picked photo in the composer instead of sending it", () => {
    const pick = screen.slice(screen.indexOf("const pickPhoto"), screen.indexOf("const sendFromComposer"));

    expect(pick).toContain("setPendingPhoto(");
    expect(pick).not.toContain("sendMessage(");
  });

  it("sends the typed question and the photo together", () => {
    expect(screen).toMatch(/void sendMessage\(undefined, photo\)/);
    expect(screen).toMatch(/input\.trim\(\)\.length > 0 \|\| pendingPhoto !== null/);
  });
});

describe("auto speak", () => {
  const hook = read("hooks/useReadAloud.ts");

  it("starts off and only turns on from what was saved", () => {
    expect(hook).toMatch(/useState\(false\)/);
    expect(hook).toMatch(/value === "on"\) setAutoSpeakState\(true\)/);
  });

  it("checks the switch when the reply arrives", () => {
    expect(read("screens/ChatbotScreen.tsx")).toMatch(/if \(autoSpeakRef\.current\)/);
  });
});
