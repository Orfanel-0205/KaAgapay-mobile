// services/offlineAnswers.ts
//
// DR. QUACK WITH NO SIGNAL: a small answer book that lives in the app
// (Nov 2026).
//
// The AI runs on the server, so with no internet Dr. Quack used to answer
// only "I cannot connect right now." A resident in a barangay with weak
// signal, at night, with a feverish child, got nothing. This answers the
// questions that matter most when there is no one to ask -- danger signs,
// first aid, fever, dengue, diarrhoea, bites, burns, pregnancy, blood
// pressure, the RHUs and their hotlines -- by matching words, with no AI and
// no download. The question is also kept and sent to Dr. Quack when the
// signal returns (services/offlineOutbox).
//
// THE MEDICAL TEXT IS TAGALOG AND ENGLISH. When the app is set to
// Pangasinan, a Pangasinan line introduces the Tagalog answer: first-aid
// instructions are not the place for a translation nobody at the RHU has
// checked. Have a nurse or doctor read this file before each release, and a
// native speaker add the Pangasinan text.
//
// Every answer ends by naming when to go to the RHU or the emergency room.
// It never names a diagnosis or a dose by weight: "follow the label" and "ask
// the RHU" are the limits of what an app with no clinician should say.

import type { Lang } from "../constants/i18n";
import { RHU_HOTLINES } from "../constants/hotlines";
import type { MobileRhu } from "./api/rhus";

type Text = { tl: string; en: string };

type Topic = {
  id: string;
  /** Matched as whole words or phrases, in Tagalog, English and Pangasinan. */
  keywords: string[];
  /** Answered before anything else whenever one of its words appears. */
  urgent?: boolean;
  answer: (rhus: MobileRhu[]) => Text;
};

const hotlines = () => RHU_HOTLINES.map((h) => `• ${h.label}: ${h.number}`).join("\n");

const TOPICS: Topic[] = [
  {
    id: "crisis",
    urgent: true,
    keywords: [
      "magpakamatay", "papatayin ko ang sarili ko", "ayoko nang mabuhay", "gusto ko nang mamatay", "suicide",
      "kill myself", "end my life", "self harm", "saktan ang sarili",
    ],
    answer: () => ({
      tl:
        "Nandito kami para sa iyo, at hindi ka nag-iisa. Kausapin ang isang tao ngayon na:\n" +
        "• NCMH Crisis Hotline: 1553 (libre sa landline), 0917-899-8727, 0966-351-4518, 0908-639-2672\n" +
        "• O tumawag sa RHU:\n" + hotlines() + "\n" +
        "Kung may agarang panganib, pumunta sa pinakamalapit na emergency room o lumapit sa taong pinagkakatiwalaan mo.",
      en:
        "We are here for you, and you are not alone. Please talk to someone now:\n" +
        "• NCMH Crisis Hotline: 1553 (toll-free from a landline), 0917-899-8727, 0966-351-4518, 0908-639-2672\n" +
        "• Or call the RHU:\n" + hotlines() + "\n" +
        "If you are in immediate danger, go to the nearest emergency room or to someone you trust.",
    }),
  },
  {
    id: "emergency",
    urgent: true,
    keywords: [
      "hindi makahinga", "hirap huminga", "hirap sa paghinga", "cannot breathe", "cant breathe", "difficulty breathing",
      "short of breath", "agak makaangas", "chest pain", "masakit ang dibdib", "sakit sa dibdib", "masakit so pagew",
      "nawalan ng malay", "walang malay", "nahimatay", "unconscious", "fainted", "kombulsyon", "nangingisay",
      "seizure", "convulsion", "maraming dugo", "heavy bleeding", "hindi tumitigil ang dugo", "stroke",
      "naparalisa", "ngiwi ang mukha", "nakagat ng ahas", "snake bite", "snakebite", "nalason", "poison", "lason",
      "overdose", "nalunod", "drowning", "aksidente", "accident",
    ],
    answer: () => ({
      tl:
        "Mukhang EMERGENCY ito. Huwag nang maghintay:\n" +
        "1. Pindutin ang Emergency Help sa app, o tumawag:\n" + hotlines() + "\n" +
        "2. Dalhin agad ang pasyente sa pinakamalapit na ospital o emergency room.\n" +
        "3. Habang naghihintay: manatili sa tabi niya, idiin ang malinis na tela sa dumudugo, at huwag siyang painumin o pakainin kung walang malay.",
      en:
        "This sounds like an EMERGENCY. Do not wait:\n" +
        "1. Press Emergency Help in the app, or call:\n" + hotlines() + "\n" +
        "2. Take the patient to the nearest hospital or emergency room now.\n" +
        "3. While waiting: stay with them, press a clean cloth on any bleeding, and give nothing to eat or drink if they are not fully awake.",
    }),
  },
  {
    id: "dengue",
    keywords: ["dengue", "lamok", "mosquito", "pantal", "rashes", "nagdurugo ang gilagid", "bleeding gums", "platelet"],
    answer: () => ({
      tl:
        "Dengue: kapag may lagnat nang 2 araw, magpatingin agad sa RHU.\n" +
        "Pumunta AGAD sa ospital kung may: matinding sakit ng tiyan, paulit-ulit na pagsusuka, pagdurugo ng gilagid o ilong, maitim na dumi, sobrang panghihina o malamig at basang balat.\n" +
        "Sa bahay: uminom ng maraming tubig o oresol, magpahinga, at paracetamol lang ayon sa label. Huwag uminom ng aspirin o ibuprofen.\n" +
        "Iwas-dengue: itapon ang naiipong tubig, magsuot ng mahabang manggas, at gumamit ng kulambo o lotion kontra-lamok.",
      en:
        "Dengue: after 2 days of fever, see the RHU.\n" +
        "Go to a hospital AT ONCE for: severe stomach pain, repeated vomiting, bleeding gums or nose, black stools, extreme weakness, or cold and clammy skin.\n" +
        "At home: drink plenty of water or ORS, rest, and take only paracetamol as the label says. Do not take aspirin or ibuprofen.\n" +
        "Prevention: empty standing water, wear long sleeves, and use a mosquito net or repellent.",
    }),
  },
  {
    id: "fever",
    keywords: ["lagnat", "nilalagnat", "sinat", "fever", "mainit ang katawan", "mataas ang temperatura", "temperature", "trangkaso"],
    answer: () => ({
      tl:
        "Lagnat: magpahinga, uminom ng maraming tubig, at punasan ng maligamgam na tubig.\n" +
        "Paracetamol lang, ayon sa nakasulat sa label para sa edad. Huwag bigyan ng aspirin ang bata.\n" +
        "Magpatingin sa RHU kung: 2 araw na ang lagnat, may pantal, paninigas ng leeg, pagsusuka, o kung sanggol na wala pang 3 buwan ang may lagnat.\n" +
        "Pumunta AGAD sa ospital kung nangingisay, hirap huminga, o hindi magising nang maayos.",
      en:
        "Fever: rest, drink plenty of water, and sponge with lukewarm water.\n" +
        "Use paracetamol only, as the label says for the age. Never give a child aspirin.\n" +
        "See the RHU if: the fever has lasted 2 days, there is a rash, a stiff neck or vomiting, or a baby under 3 months has any fever.\n" +
        "Go to a hospital AT ONCE for seizures, difficulty breathing, or if they are hard to wake.",
    }),
  },
  {
    id: "diarrhea",
    keywords: ["pagtatae", "nagtatae", "lbm", "diarrhea", "diarrhoea", "pagsusuka", "nagsusuka", "vomiting", "dehydration", "dehydrated", "oresol", "ors"],
    answer: () => ({
      tl:
        "Pagtatae o pagsusuka: uminom ng oresol (ORS) pagkatapos ng bawat pagdumi, kaunti-kaunti pero madalas. Ituloy ang pagkain at pagpapasuso.\n" +
        "Sa bata, may zinc at ORS sa RHU.\n" +
        "Pumunta AGAD sa RHU o ospital kung: may dugo ang dumi, hindi makainom, paulit-ulit ang pagsusuka, lubog ang mata, sobrang antukin, o hindi umiihi nang 6 na oras o higit pa.",
      en:
        "Diarrhoea or vomiting: drink ORS after every loose stool, a little at a time but often. Keep eating and keep breastfeeding.\n" +
        "For children, the RHU has zinc and ORS.\n" +
        "Go to the RHU or a hospital AT ONCE for: blood in the stool, unable to drink, repeated vomiting, sunken eyes, unusual sleepiness, or no urine for 6 hours or more.",
    }),
  },
  {
    id: "cough",
    keywords: ["ubo", "inuubo", "sipon", "cough", "colds", "flu", "sore throat", "masakit ang lalamunan", "lalamunan"],
    answer: () => ({
      tl:
        "Ubo at sipon: magpahinga, uminom ng maraming tubig, at takpan ang bibig kapag umuubo. Magsuot ng mask kung may kasama sa bahay.\n" +
        "Kung 2 linggo o higit na ang ubo, magpasuri sa RHU: libre ang TB check.\n" +
        "Pumunta AGAD sa RHU o ospital kung mabilis o hirap ang paghinga, lalo na sa bata o matanda.",
      en:
        "Cough and colds: rest, drink plenty of water, and cover your cough. Wear a mask around others at home.\n" +
        "A cough of 2 weeks or more needs a check at the RHU: TB testing is free.\n" +
        "Go to the RHU or a hospital AT ONCE for fast or difficult breathing, especially in a child or an older person.",
    }),
  },
  {
    id: "bites",
    keywords: ["kagat ng aso", "nakagat ng aso", "dog bite", "kagat ng pusa", "cat bite", "kalmot", "scratch", "rabies", "sugat", "wound", "hiwa", "galos"],
    answer: () => ({
      tl:
        "Kagat o kalmot ng aso o pusa: hugasan agad ng sabon at umaagos na tubig nang 15 minuto, saka lagyan ng antiseptic. Huwag lagyan ng bawang, langis o kung anu-ano.\n" +
        "Pumunta sa RHU o Animal Bite Center SA ARAW DING IYON para sa anti-rabies na bakuna, kahit maliit ang sugat.\n" +
        "Ibang sugat: hugasan, idiin ang malinis na tela kung dumudugo, at takpan. Magpatingin kung malalim, marumi, o hindi tumitigil ang dugo.",
      en:
        "Dog or cat bite or scratch: wash at once with soap and running water for 15 minutes, then apply antiseptic. Do not put garlic, oil or anything else on it.\n" +
        "Go to the RHU or an Animal Bite Center THE SAME DAY for the anti-rabies vaccine, even for a small wound.\n" +
        "Other wounds: wash, press a clean cloth on any bleeding, and cover. See the RHU if it is deep, dirty, or keeps bleeding.",
    }),
  },
  {
    id: "burns",
    keywords: ["paso", "napaso", "burn", "burned", "nasunog", "scald", "kumukulong tubig"],
    answer: () => ({
      tl:
        "Paso: palamigin agad sa umaagos na malamig (hindi yelo) na tubig nang 20 minuto. Tanggalin ang singsing o relo bago mamaga. Takpan ng malinis na tela.\n" +
        "Huwag lagyan ng toothpaste, mantika, butter o yelo, at huwag putukin ang paltos.\n" +
        "Pumunta AGAD sa ospital kung malaki ang paso, nasa mukha, kamay o ari, o dahil sa kuryente o kemikal.",
      en:
        "Burns: cool at once under cool (not iced) running water for 20 minutes. Remove rings or a watch before swelling starts. Cover with a clean cloth.\n" +
        "Do not put toothpaste, oil, butter or ice on it, and do not pop blisters.\n" +
        "Go to a hospital AT ONCE if the burn is large, on the face, hands or genitals, or from electricity or chemicals.",
    }),
  },
  {
    id: "blood_pressure",
    keywords: ["high blood", "alta presyon", "altapresyon", "hypertension", "blood pressure", "presyon", "maintenance", "losartan", "amlodipine", "nahihilo", "dizzy"],
    answer: () => ({
      tl:
        "High blood: inumin ang maintenance araw-araw kahit maganda ang pakiramdam. Huwag itigil o palitan nang hindi nagtatanong sa doktor.\n" +
        "Libre ang pagpapa-BP sa RHU. Bawasan ang alat, mamantika at sigarilyo.\n" +
        "Pumunta AGAD sa ospital kung may matinding sakit ng ulo, sakit sa dibdib, panghihina o pamamanhid ng isang bahagi ng katawan, ngiwi ang mukha, o hirap magsalita.",
      en:
        "High blood pressure: take your maintenance medicine every day, even when you feel well. Do not stop or change it without asking a doctor.\n" +
        "BP checks are free at the RHU. Cut down on salt, fatty food and smoking.\n" +
        "Go to a hospital AT ONCE for a severe headache, chest pain, weakness or numbness on one side, a drooping face, or trouble speaking.",
    }),
  },
  {
    id: "pregnancy",
    keywords: ["buntis", "nagbubuntis", "pregnant", "pregnancy", "prenatal", "manganganak", "labor", "panubigan", "nagdadalang tao"],
    answer: () => ({
      tl:
        "Pagbubuntis: magpa-prenatal check-up nang regular sa RHU, simula pa lang ng pagbubuntis.\n" +
        "Pumunta AGAD sa ospital o lying-in kung may: pagdurugo, matinding sakit ng ulo o paglabo ng paningin, pangingisay, pamamaga ng mukha o kamay, lagnat, matinding sakit ng tiyan, pumutok ang panubigan, o humina ang galaw ni baby.",
      en:
        "Pregnancy: have regular prenatal check-ups at the RHU, starting early.\n" +
        "Go to a hospital or birthing home AT ONCE for: bleeding, a severe headache or blurred vision, seizures, swelling of the face or hands, fever, severe stomach pain, waters breaking, or the baby moving less.",
    }),
  },
  {
    id: "rhu",
    keywords: ["rhu", "health center", "saan", "address", "lokasyon", "location", "oras", "schedule", "bukas", "open", "serbisyo", "services", "hotline", "numero ng rhu", "contact"],
    answer: (rhus) => ({
      tl:
        "Mga RHU ng Malasiqui:\n" +
        rhus.map((r) => `• ${r.name}${r.sub ? ` (${r.sub})` : ""}`).join("\n") + "\n\n" +
        "Hotline:\n" + hotlines() + "\n\n" +
        "Ang oras at serbisyo ay nasa Announcements ng app kapag may internet.",
      en:
        "The RHUs of Malasiqui:\n" +
        rhus.map((r) => `• ${r.name}${r.sub ? ` (${r.sub})` : ""}`).join("\n") + "\n\n" +
        "Hotlines:\n" + hotlines() + "\n\n" +
        "Opening hours and services are in the app's Announcements when you are online.",
    }),
  },
  {
    id: "booking",
    keywords: ["book", "booking", "appointment", "mag book", "magpa check up", "check up", "checkup", "pila", "queue", "numero", "konsulta"],
    answer: () => ({
      tl:
        "Pwede mong punan ang booking kahit walang internet: itatabi ito sa phone mo at kusang ipapadala kapag may signal na. Makikita mo ang status sa itaas ng app.\n" +
        "Ang numero sa pila ay ibinibigay kapag naipadala na, o sa RHU mismo.",
      en:
        "You can fill in a booking even with no internet: it is kept on your phone and sent by itself when there is signal. You can see its status at the top of the app.\n" +
        "Queue numbers are given once it is sent, or at the RHU itself.",
    }),
  },
];

const HELP: Text = {
  tl:
    "Wala akong internet ngayon, pero masasagot ko ang tungkol sa: emergency, lagnat, dengue, pagtatae, ubo at sipon, kagat ng hayop at sugat, paso, high blood, pagbubuntis, at ang mga RHU.\n" +
    "Para sa emergency, pindutin ang Emergency Help o tumawag:\n" + hotlines(),
  en:
    "I have no internet right now, but I can answer about: emergencies, fever, dengue, diarrhoea, cough and colds, animal bites and wounds, burns, high blood pressure, pregnancy, and the RHUs.\n" +
    "For an emergency, press Emergency Help or call:\n" + hotlines(),
};

const PANGASINAN_INTRO = "Anggapoy internet natan. Say ebat ed Tagalog:";

/** Lower case, no accents or punctuation, single spaces, padded for whole-word matching. */
export function normalizeQuestion(text: string): string {
  const plain = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
  return ` ${plain} `;
}

export function findTopic(question: string): string | null {
  const q = normalizeQuestion(question);
  let best: { id: string; score: number } | null = null;

  for (const topic of TOPICS) {
    let score = 0;
    for (const keyword of topic.keywords) {
      if (q.includes(` ${normalizeQuestion(keyword).trim()} `)) {
        // A phrase says more than a single word.
        score += keyword.includes(" ") ? 2 : 1;
      }
    }
    if (score === 0) continue;
    if (topic.urgent) return topic.id;
    if (!best || score > best.score) best = { id: topic.id, score };
  }

  return best?.id ?? null;
}

/** Dr. Quack's answer from the book, in the app's language. */
export function offlineAnswer(question: string, lang: Lang, rhus: MobileRhu[]): { topic: string | null; text: string } {
  const id = findTopic(question);
  const topic = id ? TOPICS.find((t) => t.id === id) : undefined;
  const text = topic ? topic.answer(rhus) : HELP;

  if (lang === "en") return { topic: id, text: text.en };
  if (lang === "pag") return { topic: id, text: `${PANGASINAN_INTRO}\n\n${text.tl}` };
  return { topic: id, text: text.tl };
}
