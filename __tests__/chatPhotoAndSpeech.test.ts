// __tests__/chatPhotoAndSpeech.test.ts
//
// The chatbot, Oct 2026: photos are made small before they are sent, replies
// show bold text instead of raw asterisks, and read-aloud says "R. H. U.",
// not "RHO".

jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

const mockManipulate = jest.fn();
jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: (...args: unknown[]) => mockManipulate(...args),
  SaveFormat: { JPEG: "jpeg" },
}));

import { prepareChatPhoto, resizeFor } from "../services/chatPhoto";
import { richTextRuns } from "../utils/richText";
import { speakableText } from "../hooks/useReadAloud";

describe("photos for the assistant", () => {
  test("a camera photo is resized on its longer side; a small one is not", () => {
    expect(resizeFor(4000, 3000)).toEqual({ width: 1600 });
    expect(resizeFor(3000, 4000)).toEqual({ height: 1600 });
    expect(resizeFor(1200, 900)).toBeNull();
  });

  test("the photo sent is the small JPEG", async () => {
    mockManipulate.mockResolvedValueOnce({ uri: "file:///small.jpg", width: 1600, height: 1200 });

    const photo = await prepareChatPhoto({ uri: "file:///big.jpg", width: 4000, height: 3000, mimeType: "image/png" });

    expect(mockManipulate).toHaveBeenCalledWith("file:///big.jpg", [{ resize: { width: 1600 } }], { compress: 0.7, format: "jpeg" });
    expect(photo.uri).toBe("file:///small.jpg");
    expect(photo.mime).toBe("image/jpeg");
  });

  test("if the phone cannot process it, the original still goes", async () => {
    mockManipulate.mockRejectedValueOnce(new Error("no memory"));

    const photo = await prepareChatPhoto({ uri: "file:///big.jpg", width: 4000, height: 3000, mimeType: "image/jpeg", fileName: "x.jpg" });

    expect(photo).toEqual({ uri: "file:///big.jpg", mime: "image/jpeg", name: "x.jpg" });
  });
});

describe("assistant replies on screen", () => {
  test("**bold** becomes bold text, without the asterisks", () => {
    expect(richTextRuns("1. **Magpahinga po muna.** Iwasan ang pagod.")).toEqual([
      { text: "1. ", bold: false },
      { text: "Magpahinga po muna.", bold: true },
      { text: " Iwasan ang pagod.", bold: false },
    ]);
  });

  test("bullets become dots and stray asterisks disappear", () => {
    const text = richTextRuns("* Uminom ng tubig\n- Magpahinga **").map((run) => run.text).join("");
    expect(text).toBe("• Uminom ng tubig\n• Magpahinga ");
  });
});

describe("read aloud", () => {
  test("RHU and other abbreviations are read letter by letter", () => {
    expect(speakableText("Pumunta sa RHU o sa ER.")).toBe("Pumunta sa R. H. U. o sa E. R..");
    expect(speakableText("Dalawang RHUs, isang MHO at mga BHW")).toBe("Dalawang R. H. U.s, isang M. H. O. at mga B. H. W.");
  });

  test("ordinary words that contain the letters are left alone", () => {
    expect(speakableText("Ang thrust ay mahirap")).toBe("Ang thrust ay mahirap");
    expect(speakableText("**Telemedicine** ay online")).toBe("Telemedicine ay online");
  });
});
