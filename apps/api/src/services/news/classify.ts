import type { FeedSource, NewsCategory } from './sources';

// Publisher labels can be multilingual. Headline matches use specific civic
// phrases so a sports result, for example, is not treated as an election.
const topics: Array<[NewsCategory, RegExp, RegExp]> = [
  [
    'politics',
    /^(politics|political pulse|राजनीति|राजकारण|పాలిటిక్స్|రాజకీయం|அரசியல்|ರಾಜಕೀಯ(?: ಸುದ್ದಿ)?|രാഷ്ട്രീയം|রাজনীতি|રાજકારણ)$/iu,
    /(?<![\p{L}\p{M}])(?:BJP|AICC|BRS|YSRCP|TDP|DMK|AIADMK|राजनीति|भाजपा|बीजेपी|బీజేపీ|బీఆర్ఎస్|టీడీపీ|திமுக|பாஜக|ಬಿಜೆಪಿ|ബിജെപി|বিজেপি|ભાજપ)(?![\p{L}\p{M}])/iu,
  ],
  [
    'elections',
    /^(elections?|polls|चुनाव|निर्वाचन|నిర్వచన|ఎన్నికలు|தேர்தல்|ಚುನಾವಣೆ|തിരഞ്ഞെടുപ്പ്|নির্বাচন|निवडणूक|ચૂંટણી)(?:\s*-?\s*20\d{2})?$/iu,
    /\b(?:by[- ]election|panchayat (?:polls?|elections?)|assembly (?:polls?|elections?)|voter (?:rolls?|registration)|polling booths?)\b|पंचायत चुनाव|विधानसभा चुनाव|उपचुनाव|ఉప ఎన్నిక|పంచాయతీ ఎన్నిక|అసెంబ్లీ ఎన్నిక|இடைத்தேர்தல்|சட்டமன்றத் தேர்தல்|ಉಪಚುನಾವಣೆ|ವಿಧಾನಸಭಾ ಚುನಾವಣೆ|ಪಂಚಾಯಿತಿ ಚುನಾವಣೆ|നിയമസഭാ തിരഞ്ഞെടുപ്പ്|পঞ্চায়েত নির্বাচন|पोटनिवडणूक|પેટા ચૂંટણી/iu,
  ],
  [
    'governance',
    /^(governance|public policy|government schemes|सरकारी योजनाएं|ప్రభుత్వ పథకాలు|அரசுத் திட்டங்கள்|সরকারি প্রকল্প)$/iu,
    /\b(?:government scheme|cabinet approves?|cabinet clears?|government notification|public consultation|municipal corporation approves?)\b|कैबिनेट ने मंजूरी|सरकारी योजना|ప్రభుత్వ పథకం|మంత్రివర్గం ఆమోదం|அரசுத் திட்டம்|ಸರ್ಕಾರಿ ಯೋಜನೆ|സർക്കാർ പദ്ധതി|সরকারি প্রকল্প|शासकीय योजना|સરકારી યોજના/iu,
  ],
  [
    'economy',
    /^(economy|budget|inflation|economic policy|अर्थव्यवस्था|अर्थसंकल्प|ఆర్థిక వ్యవస్థ|பொருளாதாரம்|ಆರ್ಥಿಕತೆ|സമ്പദ്‌?വ്യവസ്ഥ|অর্থনীতি|અર્થતંત્ર)$/iu,
    /\b(?:state budget|union budget|inflation|GDP|repo rate|economic survey|tax revenue)\b|केंद्रीय बजट|आर्थिक सर्वेक्षण|రాష్ట్ర బడ్జెట్|ద్రవ్యోల్బణం|மாநில பட்ஜெட்|ರಾಜ್ಯ ಬಜೆಟ್|സംസ്ഥാന ബജറ്റ്|রাজ্য বাজেট|राज्याचा अर्थसंकल्प|રાજ્યનું બજેટ/iu,
  ],
];

const breakingLabel =
  /^(?:breaking(?: news)?|ब्रेकिंग(?: न्यू[ज़ज])?|బ్రేకింగ్(?: న్యూస్)?|செய்தி உடனடி|ಬ್ರೇಕಿಂಗ್(?: ನ್ಯೂಸ್)?|ബ്രേക്കിംഗ്(?: ന്യൂസ്)?|ব্রেকিং(?: নিউজ)?|બ્રેકિંગ(?: ન્યૂઝ)?)$/iu;

export function classifyNews(source: FeedSource, title: string, tags: readonly string[]) {
  const categories = new Set<NewsCategory>([source.category]);
  if (source.scope === 'state') categories.add('regional');
  for (const [category, tagPattern, titlePattern] of topics) {
    if (tags.some((tag) => tagPattern.test(tag.trim())) || titlePattern.test(title)) {
      categories.add(category);
    }
  }
  const heading = title.match(/^(.{1,32}?)\s*[:|–—-]/u)?.[1].trim() ?? '';
  return {
    categories: [...categories],
    breaking: tags.some((tag) => breakingLabel.test(tag.trim())) || breakingLabel.test(heading),
  };
}
