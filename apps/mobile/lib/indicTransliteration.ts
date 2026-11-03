/**
 * Indic Transliteration Engine
 * ─────────────────────────────────────────────────────────────────────
 * High-fidelity phonetic transliteration from English Latin script
 * into 12 official Indian scripts for constituency names, place names,
 * and political entities when exact dictionary translations are absent.
 */

export type IndicLanguageCode =
  | 'te'
  | 'hi'
  | 'kn'
  | 'ta'
  | 'mr'
  | 'bn'
  | 'gu'
  | 'ml'
  | 'pa'
  | 'or'
  | 'as'
  | 'ne';

const SCRIPT_BASES: Record<string, number> = {
  hi: 0x0900,
  mr: 0x0900,
  ne: 0x0900,
  bn: 0x0980,
  as: 0x0980,
  pa: 0x0A00,
  gu: 0x0A80,
  or: 0x0B00,
  ta: 0x0B80,
  te: 0x0C00,
  kn: 0x0C80,
  ml: 0x0D00,
};

/** Common political and geographic tokens across Indian constituencies */
export const GEOGRAPHIC_TOKENS: Record<string, Record<string, string>> = {
  cantonment: {
    te: 'కంటోన్మెంట్',
    hi: 'छावनी (कैंट)',
    kn: 'ಕಂಟೋನ್ಮೆಂಟ್',
    ta: 'கண்டோன்மென்ட்',
    mr: 'छावणी',
    bn: 'ক্যান্টনমেন্ট',
    gu: 'છાવાની',
    ml: 'കന്റോൺമെന്റ്',
    pa: 'ਕੰਟੋਨਮੈਂਟ',
    or: 'କ୍ୟାଣ୍ଟନମେଣ୍ଟ',
    as: 'কেণ্টনমেন্ট',
    ne: 'छावनी',
  },
  rural: {
    te: 'రూరల్',
    hi: 'ग्रामीण',
    kn: 'ಗ್ರಾಮಾಂತರ',
    ta: 'ஊரகம்',
    mr: 'ग्रामीण',
    bn: 'গ্রামীণ',
    gu: 'ગ્રામીણ',
    ml: 'റൂറൽ',
    pa: 'ਦਿਹਾਤੀ',
    or: 'ଗ୍ରାମୀଣ',
    as: 'গ্ৰাম্য',
    ne: 'ग्रामीण',
  },
  urban: {
    te: 'అర్బన్',
    hi: 'शहरी',
    kn: 'ನಗರ',
    ta: 'நகர்ப்புறம்',
    mr: 'शहर',
    bn: 'শহুরে',
    gu: 'શહેરી',
    ml: 'അർബൻ',
    pa: 'ਸ਼ਹਿਰੀ',
    or: 'ସହରୀ',
    as: 'নগৰীয়া',
    ne: 'शहरी',
  },
  north: {
    te: 'ఉత్తర',
    hi: 'उत्तर',
    kn: 'ಉತ್ತರ',
    ta: 'வடக்கு',
    mr: 'उत्तर',
    bn: 'উত্তর',
    gu: 'ઉત્તર',
    ml: 'വടക്ക്',
    pa: 'ਉੱਤਰੀ',
    or: 'ଉତ୍ତର',
    as: 'উত্তৰ',
    ne: 'उत्तर',
  },
  south: {
    te: 'దక్షిణ',
    hi: 'दक्षिण',
    kn: 'ದಕ್ಷಿಣ',
    ta: 'தெற்கு',
    mr: 'दक्षिण',
    bn: 'দক্ষিণ',
    gu: 'દક્ષિણ',
    ml: 'തെക്ക്',
    pa: 'ਦੱਖਣੀ',
    or: 'ଦକ୍ଷିଣ',
    as: 'দক্ষিণ',
    ne: 'दक्षिण',
  },
  east: {
    te: 'తూర్పు',
    hi: 'पूर्व',
    kn: 'ಪೂರ್ವ',
    ta: 'கிழக்கு',
    mr: 'पूर्व',
    bn: 'পূর্ব',
    gu: 'પૂર્વ',
    ml: 'കിഴക്ക്',
    pa: 'ਪੂਰਬੀ',
    or: 'ପୂର୍ବ',
    as: 'পূব',
    ne: 'पूर्व',
  },
  west: {
    te: 'పశ్చిమ',
    hi: 'पश्चिम',
    kn: 'ಪಶ್ಚಿಮ',
    ta: 'மேற்கு',
    mr: 'पश्चिम',
    bn: 'পশ্চিম',
    gu: 'પશ્ચિમ',
    ml: 'പടിഞ്ഞാറ്',
    pa: 'ਪੱਛਮੀ',
    or: 'ପଶ୍ଚିମ',
    as: 'পশ্চিম',
    ne: 'पश्चिम',
  },
  central: {
    te: 'సెంట్రల్',
    hi: 'मध्य',
    kn: 'ಮಧ್ಯ',
    ta: 'மத்திய',
    mr: 'मध्य',
    bn: 'মধ্য',
    gu: 'મધ્ય',
    ml: 'മധ്യ',
    pa: 'ਕੇਂਦਰੀ',
    or: 'ମଧ୍ୟ',
    as: 'মধ্য',
    ne: 'मध्य',
  },
  city: {
    te: 'సిటీ',
    hi: 'शहर',
    kn: 'ನಗರ',
    ta: 'நகரம்',
    mr: 'शहर',
    bn: 'শহর',
    gu: 'શહેર',
    ml: 'നഗരം',
    pa: 'ਸ਼ਹਿਰ',
    or: 'ସହର',
    as: 'চহৰ',
    ne: 'शहर',
  },
  fort: {
    te: 'కోట',
    hi: 'किला',
    kn: 'ಕೋಟೆ',
    ta: 'கோட்டை',
    mr: 'किल्ला',
    bn: 'কেল্লা',
    gu: 'કિલ્લો',
    ml: 'കോട്ട',
    pa: 'ਕਿਲ੍ਹਾ',
    or: 'ଦୁର୍ଗ',
    as: 'কিল্লা',
    ne: 'किला',
  },
  nagar: {
    te: 'నగర్',
    hi: 'नगर',
    kn: 'ನಗರ',
    ta: 'நகர்',
    mr: 'नगर',
    bn: 'নগর',
    gu: 'નગર',
    ml: 'നഗർ',
    pa: 'ਨਗਰ',
    or: 'ନଗର',
    as: 'নগৰ',
    ne: 'नगर',
  },
  puram: {
    te: 'పురం',
    hi: 'पुरम',
    kn: 'ಪುರಂ',
    ta: 'புரம்',
    mr: 'पुरम',
    bn: 'পুরম',
    gu: 'પુરમ',
    ml: 'പുരം',
    pa: 'ਪੁਰਮ',
    or: 'ପୁରମ',
    as: 'পুৰম',
    ne: 'पुरम',
  },
  palli: {
    te: 'పల్లి',
    hi: 'पल्ली',
    kn: 'ಪಳ್ಳಿ',
    ta: 'பள்ளி',
    mr: 'पल्ली',
    bn: 'পল্লী',
    gu: 'પલ્લી',
    ml: 'പള്ളി',
    pa: 'ਪੱਲੀ',
    or: 'ପଲ୍ଲୀ',
    as: 'পল্লী',
    ne: 'पल्ली',
  },
  pally: {
    te: 'పల్లి',
    hi: 'पल्ली',
    kn: 'ಪಳ್ಳಿ',
    ta: 'பள்ளி',
    mr: 'पल्ली',
    bn: 'পল্লী',
    gu: 'પલ્લી',
    ml: 'പള്ളി',
    pa: 'ਪੱਲੀ',
    or: 'ପଲ୍ଲୀ',
    as: 'পল্লী',
    ne: 'पल्ली',
  },
  halli: {
    te: 'హళ్ళి',
    hi: 'हल्ली',
    kn: 'ಹಳ್ಳಿ',
    ta: 'ஹள்ளி',
    mr: 'हळ्ळी',
    bn: 'হাল্লি',
    gu: 'હલ્લી',
    ml: 'ഹള്ളി',
    pa: 'ਹੱਲੀ',
    or: 'ହଲ୍ଲୀ',
    as: 'হাল্লি',
    ne: 'हल्ली',
  },
};

const CONSONANTS: [string, number][] = [
  ['shh', 0x37],
  ['chh', 0x1B],
  ['sh', 0x36],
  ['kh', 0x16],
  ['gh', 0x18],
  ['ch', 0x1A],
  ['jh', 0x1D],
  ['th', 0x25],
  ['dh', 0x27],
  ['ph', 0x2B],
  ['bh', 0x2D],
  ['ck', 0x15],
  ['ng', 0x19],
  ['ny', 0x1E],
  ['k', 0x15],
  ['c', 0x15],
  ['g', 0x17],
  ['j', 0x1C],
  ['t', 0x24],
  ['d', 0x26],
  ['n', 0x28],
  ['p', 0x2A],
  ['f', 0x2B],
  ['b', 0x2C],
  ['m', 0x2E],
  ['y', 0x2F],
  ['r', 0x30],
  ['l', 0x32],
  ['v', 0x35],
  ['w', 0x35],
  ['s', 0x38],
  ['z', 0x1C],
  ['h', 0x39],
];

const VOWEL_SIGNS: [string, number][] = [
  ['aai', 0x48],
  ['aau', 0x4C],
  ['aa', 0x3E],
  ['ee', 0x40],
  ['oo', 0x42],
  ['ai', 0x48],
  ['au', 0x4C],
  ['a', 0x00],
  ['i', 0x3F],
  ['u', 0x41],
  ['e', 0x47],
  ['o', 0x4B],
];

const INDEP_VOWELS: [string, number][] = [
  ['aa', 0x06],
  ['ee', 0x08],
  ['oo', 0x0A],
  ['ai', 0x10],
  ['au', 0x14],
  ['a', 0x05],
  ['i', 0x07],
  ['u', 0x09],
  ['e', 0x0F],
  ['o', 0x13],
];

export const NAME_TOKENS: Record<string, Record<string, string>> = {
  reddy: { te: 'రెడ్డి', hi: 'रेड्डी', kn: 'ರೆಡ್ಡಿ', ta: 'ரெட்டி', mr: 'रेड्डी', ml: 'റെഡ്ഡി' },
  reddi: { te: 'రెడ్డి', hi: 'रेड्डी', kn: 'ರೆಡ್ಡಿ', ta: 'ரெட்டி', mr: 'रेड्डी', ml: 'റെഡ്ഡി' },
  rao: { te: 'రావు', hi: 'राव', kn: 'ರಾವ್', ta: 'ராவ்', mr: 'राव', ml: 'റാവു' },
  sreedhar: { te: 'శ్రీధర్', hi: 'श्रीधर', kn: 'ಶ್ರೀಧರ್', ta: 'ஸ்ரீதர்', mr: 'श्रीधर', ml: 'ശ്രീധർ' },
  sridhar: { te: 'శ్రీధర్', hi: 'श्रीधर', kn: 'ಶ್ರೀಧರ್', ta: 'ஸ்ரீதர்', mr: 'श्रीधर', ml: 'ശ്രീധർ' },
  srinivas: { te: 'శ్రీనివాస్', hi: 'श्रीनिवास', kn: 'ಶ್ರೀನಿವಾಸ್', ta: 'ஸ்ரீனிவாஸ்', mr: 'श्रीनिवास', ml: 'ശ്രീനിവാസ്' },
  srinivasa: { te: 'శ్రీనివాస', hi: 'श्रीनिवास', kn: 'ಶ್ರೀನಿವಾಸ', ta: 'ஸ்ரீனிவாச', mr: 'श्रीनिवास', ml: 'ശ്രീനിവാസ' },
  srinivasulu: { te: 'శ్రీనివాసులు', hi: 'श्रीनिवासुलु', kn: 'ಶ್ರೀನಿವಾಸುಲು', ta: 'ஸ்ரீனிவாசுலு', mr: 'श्रीनिवासुलु', ml: 'ശ്രീനിവാസുലു' },
  sreenivasulu: { te: 'శ్రీనివాసులు', hi: 'श्रीनिवासुलु', kn: 'ಶ್ರೀನಿವಾಸುಲು', ta: 'ஸ்ரீனிவாசுலு', mr: 'श्रीनिवासुलु', ml: 'ശ്രീനിவாസുലു' },
  sireesha: { te: 'శిరీష', hi: 'शिरीषा', kn: 'ಶಿರೀಷಾ', ta: 'ஷிரீஷா', mr: 'शिरीषा' },
  sirisha: { te: 'శిరీష', hi: 'शिरीषा', kn: 'ಶಿರೀಷಾ', ta: 'ஷிரீஷா', mr: 'शिरीषा' },
  devi: { te: 'దేవి', hi: 'देवी', kn: 'ದೇವಿ', ta: 'தேவி', mr: 'देवी', ml: 'ദേവി' },
  dhanalakshmi: { te: 'ధనలక్ష్మి', hi: 'धनलक्ष्मी', kn: 'ಧನಲಕ್ಷ್ಮಿ', ta: 'தனலட்சுமி', mr: 'धनलक्ष्मी' },
  lakshmi: { te: 'లక్ష్మి', hi: 'लक्ष्मी', kn: 'ಲಕ್ಷ್ಮಿ', ta: 'லட்சுமி', mr: 'लक्ष्मी' },
  laxmi: { te: 'లక్ష్మి', hi: 'लक्ष्मी', kn: 'ಲಕ್ಷ್ಮಿ', ta: 'லட்சுமி', mr: 'लक्ष्मी' },
  julakanti: { te: 'జులకంటి', hi: 'जुलकांति', kn: 'ಜುಲಕಂಟಿ', ta: 'ஜுலகண்டி' },
  brahmananda: { te: 'బ్రహ్మానంద', hi: 'ब्रह्मानंद', kn: 'ಬ್ರಹ್ಮಾನಂದ', ta: 'பிரம்மானந்த' },
  arava: { te: 'అరవ', hi: 'अरवा', kn: 'ಅರವ', ta: 'அரவ' },
  koramutla: { te: 'కోరముట్ల', hi: 'कोरमुट्ला', kn: 'ಕೋರಮುಟ್ಲ', ta: 'கோரமுட்ல' },
  nagulapalli: { te: 'నాగులపల్లి', hi: 'नागुलपल्ली', kn: 'ನಾಗುಲಪಳ್ಳಿ', ta: 'நாகுலபள்ளி' },
  miryala: { te: 'మిరియాల', hi: 'मिरियाला', kn: 'ಮಿರಿಯಾಲ', ta: 'மிரியால' },
  miriyala: { te: 'మిరియాల', hi: 'मिरियाला', kn: 'ಮಿರಿಯಾಲ', ta: 'மிரியால' },
  kumar: { te: 'కుమార్', hi: 'कुमार', kn: 'ಕುಮಾರ್', ta: 'குமார்', mr: 'कुमार', ml: 'കുമാർ' },
  singh: { te: 'సింగ్', hi: 'सिंह', kn: 'ಸಿಂಗ್', ta: 'சிங்', mr: 'सिंह', ml: 'സിംഗ്' },
  sharma: { te: 'శర్మ', hi: 'शर्मा', kn: 'ಶರ್ಮ', ta: 'சர்மா', mr: 'शर्मा', ml: 'ശർമ്മ' },
  prasad: { te: 'ప్రసాద్', hi: 'प्रसाद', kn: 'ಪ್ರಸಾದ್', ta: 'பிரசாத்', mr: 'प्रसाद', ml: 'പ്രസാദ്' },
  naidu: { te: 'నాయుడు', hi: 'नायडू', kn: 'ನಾಯ್ಡು', ta: 'நாயுடு', mr: 'नायडू' },
  chowdary: { te: 'చౌదరి', hi: 'चौधरी', kn: 'చౌధరి', ta: 'சௌத்ரி', mr: 'चौधरी' },
  choudhary: { te: 'చౌదరి', hi: 'चौधरी', kn: 'చౌధరి', ta: 'சௌத்ரி', mr: 'चौधरी' },
  patil: { te: 'పాటిల్', hi: 'पाटिल', kn: 'ಪಾಟೀಲ್', ta: 'பாட்டீல்', mr: 'पाटील' },
  yadav: { te: 'యాదవ్', hi: 'यादव', kn: 'ಯಾದವ್', ta: 'யாதவ்', mr: 'यादव' },
  gupta: { te: 'గుప్తా', hi: 'गुप्ता', kn: 'ಗುಪ್ತಾ', ta: 'குப்தா', mr: 'गुप्ता' },
  goud: { te: 'గౌడ్', hi: 'गौड़', kn: 'ಗೌಡ್', ta: 'கவுட்', mr: 'गौड' },
  gowda: { te: 'గౌడ', hi: 'गौड़ा', kn: 'ಗೌಡ', ta: 'கவுடா' },
  babu: { te: 'బాబు', hi: 'बाबू', kn: 'ಬಾಬು', ta: 'பாபு', mr: 'बाबू' },
  raju: { te: 'రాజు', hi: 'राजू', kn: 'ರಾಜು', ta: 'ராஜு', mr: 'राजू' },
  varma: { te: 'వర్మ', hi: 'वर्मा', kn: 'ವರ್ಮ', ta: 'வர்மா', mr: 'वर्मा' },
  murthy: { te: 'మూర్తి', hi: 'मूर्ति', kn: 'ಮೂರ್ತಿ', ta: 'மூர்த்தி', mr: 'मूर्ती' },
  anand: { te: 'ఆనంద్', hi: 'आनंद', kn: 'ಆನಂದ್', ta: 'ஆனந்த்', mr: 'आनंद' },
  prakash: { te: 'ప్రకాష్', hi: 'प्रकाश', kn: 'ಪ್ರಕಾಶ್', ta: 'பிரகாஷ்', mr: 'प्रकाश' },
  vijay: { te: 'విజయ్', hi: 'विजय', kn: 'ವಿಜಯ್', ta: 'விஜய்', mr: 'विजय' },
  vijaya: { te: 'విజయ', hi: 'विजया', kn: 'ವಿಜಯ', ta: 'விஜயா', mr: 'विजया' },
  krishna: { te: 'కృష్ణ', hi: 'कृष्ण', kn: 'ಕೃಷ್ಣ', ta: 'கிருஷ்ண', mr: 'कृष्ण' },
  balakrishna: { te: 'బాలకృష్ణ', hi: 'बालकृष्ण', kn: 'ಬಾಲಕೃಷ್ಣ', ta: 'பாலகிருஷ்ண', mr: 'बालकृष्ण' },
  jagan: { te: 'జగన్', hi: 'जगन', kn: 'జగన్', ta: 'ஜகன்', mr: 'जगन' },
  pawan: { te: 'పవన్', hi: 'पवन', kn: 'పవన్', ta: 'பவன்', mr: 'पवन' },
  kalyan: { te: 'కళ్యాణ్', hi: 'कल्याण', kn: 'ಕಲ್ಯಾಣ್', ta: 'கல்யாண்', mr: 'कल्याण' },
  chandrababu: { te: 'చంద్రబాబు', hi: 'चंद्रबाबू', kn: 'ಚಂದ್ರಬಾಬು', ta: 'சந்திரபாபு', mr: 'चंद्रबाबू' },
  lokesh: { te: 'లోకేష్', hi: 'लोकेश', kn: 'ಲೋಕೇಶ್', ta: 'லோகேஷ்', mr: 'लोकेश' },
  appalaraju: { te: 'అప్పలరాజు', hi: 'अप्पला राजू', kn: 'ಅಪ್ಪಲರಾಜು', ta: 'அப்பலராஜு' },
  atchannaidu: { te: 'అచ్చెన్నాయుడు', hi: 'अच्चेन्नायडू', kn: 'ಅಚ್ಚೆನ್ನಾಯ್ಡು', ta: 'அச்செந்நாயுடு' },
  seetharam: { te: 'సీతారాం', hi: 'सीताराम', kn: 'ಸೀತಾರಾಮ್', ta: 'சீதாராம்' },
  eswara: { te: 'ఈశ్వర', hi: 'ईश्वर', kn: 'ಈಶ್ವರ', ta: 'ஈஸ்வர' },
  kiran: { te: 'కిరణ్', hi: 'किरण', kn: 'ಕಿರಣ್', ta: 'கிரண்' },
  govinda: { te: 'గోవింద', hi: 'गोविंद', kn: 'ಗೋವಿಂದ', ta: 'கோவிந்த' },
  shankar: { te: 'శంకర్', hi: 'शंकर', kn: 'ಶಂಕರ್', ta: 'சங்கர்' },
  swamy: { te: 'స్వామి', hi: 'स्वामी', kn: 'ಸ್ವಾಮಿ', ta: 'சுவாமி' },
  murali: { te: 'మురళి', hi: 'मुरली', kn: 'ಮುರಳಿ', ta: 'முரளி' },
  jaya: { te: 'జయ', hi: 'जय', kn: 'ಜಯ', ta: 'ஜய' },
  pushpa: { te: 'పుష్ప', hi: 'पुष्पा', kn: 'ಪುಷ್ಪ', ta: 'புஷ்பா' },
  sandhyarani: { te: 'సంధ్యారాణి', hi: 'संध्यारानी', kn: 'ಸಂಧ್ಯಾರಾಣಿ', ta: 'சந்த்யாராணி' },
  candidate: { te: '', hi: '', kn: '', ta: '', mr: '' },
};

function transliterateSingleWord(word: string, lang: string): string {
  const base = SCRIPT_BASES[lang];
  if (!base) return word;

  const lower = word.toLowerCase().trim();
  if (NAME_TOKENS[lower]?.[lang] !== undefined) {
    return NAME_TOKENS[lower][lang];
  }
  if (GEOGRAPHIC_TOKENS[lower]?.[lang]) {
    return GEOGRAPHIC_TOKENS[lower][lang];
  }

  let i = 0;
  let out = '';
  const w = lower;

  while (i < w.length) {
    if (!/[a-z]/.test(w[i])) {
      out += w[i];
      i++;
      continue;
    }

    // Check consonant match
    let cons: number | null = null;
    let consLen = 0;
    for (const [cStr, cCode] of CONSONANTS) {
      if (w.startsWith(cStr, i)) {
        cons = cCode;
        consLen = cStr.length;
        break;
      }
    }

    if (cons !== null) {
      out += String.fromCharCode(base + cons);
      i += consLen;

      // Check following vowel
      let vow: number | null = null;
      let vowLen = 0;
      for (const [vStr, vCode] of VOWEL_SIGNS) {
        if (w.startsWith(vStr, i)) {
          vow = vCode;
          vowLen = vStr.length;
          break;
        }
      }

      if (vow !== null) {
        if (vow !== 0x00) {
          out += String.fromCharCode(base + vow);
        }
        i += vowLen;
      } else if (i < w.length && /[a-z]/.test(w[i])) {
        // Consonant cluster -> add Virama (Halant)
        out += String.fromCharCode(base + 0x4D);
      }
    } else {
      // Independent vowel
      let ivow: number | null = null;
      let ivowLen = 0;
      for (const [vStr, vCode] of INDEP_VOWELS) {
        if (w.startsWith(vStr, i)) {
          ivow = vCode;
          ivowLen = vStr.length;
          break;
        }
      }
      if (ivow !== null) {
        out += String.fromCharCode(base + ivow);
        i += ivowLen;
      } else {
        out += w[i];
        i++;
      }
    }
  }

  return out;
}

/**
 * Transliterates an English constituency or place name into the requested Indian language.
 * Handles compound words, spaces, hyphens, and standard geographic descriptors.
 */
export function transliterateToIndic(text: string, lang: string): string {
  if (!text || !lang || lang === 'en') return text;
  if (!SCRIPT_BASES[lang]) return text;

  // Split on whitespace or hyphens
  const tokens = text.split(/(\s+|-)/);
  return tokens
    .map((token) => {
      if (!token.trim() || token === '-') return token;
      return transliterateSingleWord(token, lang);
    })
    .join('');
}
