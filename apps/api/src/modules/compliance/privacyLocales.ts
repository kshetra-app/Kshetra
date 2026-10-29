/**
 * apps/api/src/modules/compliance/privacyLocales.ts
 *
 * Milestone W051.5 — Compliance, DPDP & Data Governance Readiness
 * Authoritative 13-Language Statutory Privacy Surface Matrix.
 * Guarantees 100% linguistic completeness across all 13 official supported Indian languages.
 */

import type { PrivacyNoticePack, SupportedPrivacyLocale } from '@kshetra/shared';

export const COMPLIANCE_PRIVACY_LOCALES: Record<SupportedPrivacyLocale, PrivacyNoticePack> = {
  en: {
    locale: 'en',
    languageName: 'English',
    privacyPolicyTitle: 'PanIN / Kshetra Statutory Privacy Notice & Citizen Data Charter',
    purposeSummary:
      'We process personal data strictly to deliver localized civic information, authenticate user accounts, provide statutory electoral geography, and facilitate lawful civic participation under the Digital Personal Data Protection Act, 2023.',
    dataCollectedSummary:
      'We collect mobile numbers for authentication, display names for community contributions, and coarse constituency preferences. We strictly do not track continuous GPS movement or construct individual political preference profiles.',
    rightsSummary:
      'As a Data Principal, you possess the right to access a copy of your personal data, rectify inaccuracies, withdraw consent, and request complete erasure of your citizen profile under Section 11 and 12 of the DPDP Act, 2023.',
    consentWithdrawalInstructions:
      'You may withdraw consent at any time via App Settings > Privacy Controls > Withdraw Consent, or by lodging a request directly with our Data Protection Officer.',
    dpoContact: {
      name: 'Adv. S. Ramanathan, Data Protection Officer',
      email: 'dpo@kshetra.io',
      address: 'PanIN Privacy & Governance Cell, Connaught Place, New Delhi 110001, India',
    },
    dpbiAppealNotice:
      'If your grievance is not redressed within 30 days, you have the statutory right to appeal before the Data Protection Board of India under Section 28 of the DPDP Act, 2023.',
  },

  hi: {
    locale: 'hi',
    languageName: 'हिन्दी (Hindi)',
    privacyPolicyTitle: 'पैन-इन / क्षेत्र वैधानिक गोपनीयता सूचना एवं नागरिक डेटा घोषणापत्र',
    purposeSummary:
      'हम डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 के अंतर्गत स्थानीय नागरिक जानकारी, खाता प्रमाणीकरण, चुनावी भूगोल और लोकतांत्रिक सहभागिता प्रदान करने के लिए ही व्यक्तिगत डेटा संसाधित करते हैं।',
    dataCollectedSummary:
      'हम प्रमाणीकरण के लिए मोबाइल नंबर, नागरिक चर्चा के लिए नाम और केवल निर्वाचन क्षेत्र प्राथमिकताएं एकत्र करते हैं। हम निरंतर जीपीएस ट्रैकिंग या व्यक्तिगत राजनीतिक प्रोफाइलिंग नहीं करते हैं।',
    rightsSummary:
      'डेटा प्रिंसिपल के रूप में आपके पास डीपी सहायता अधिनियम, 2023 की धारा 11 और 12 के तहत अपने डेटा तक पहुँचने, संशोधन करने, सहमति वापस लेने और खाता हटाने का पूर्ण अधिकार है।',
    consentWithdrawalInstructions:
      'आप ऐप सेटिंग्स > गोपनीयता नियंत्रण > सहमति वापसी के माध्यम से या हमारे डेटा संरक्षण अधिकारी से संपर्क करके किसी भी समय सहमति वापस ले सकते हैं।',
    dpoContact: {
      name: 'अधिवक्ता एस. रामनाथन, डेटा संरक्षण अधिकारी',
      email: 'dpo@kshetra.io',
      address: 'पैन-इन गवर्नेंस सेल, कनॉट प्लेस, नई दिल्ली 110001, भारत',
    },
    dpbiAppealNotice:
      'यदि आपकी शिकायत का निवारण 30 दिनों के भीतर नहीं होता है, तो आपको भारतीय डेटा संरक्षण बोर्ड (DPBI) के समक्ष अपील करने का कानूनी अधिकार है।',
  },

  te: {
    locale: 'te',
    languageName: 'తెలుగు (Telugu)',
    privacyPolicyTitle: 'పాన్-ఇన్ / క్షేత్ర చట్టబద్ధమైన గోప్యతా నోటీసు మరియు పౌర సమాచార పత్రం',
    purposeSummary:
      'డిజిటల్ పర్సనల్ డేటా ప్రొటెక్షన్ యాక్ట్, 2023 ప్రకారం స్థానిక పౌర సమాచారం, ఖాతా ప్రమాణీకరణ మరియు ఎన్నికల సమాచారాన్ని అందించడానికి మాత్రమే మేము వ్యక్తిగత సమాచారాన్ని ప్రాసెస్ చేస్తాము.',
    dataCollectedSummary:
      'ఖాతా లాగిన్ కొరకు మొబైల్ నంబర్, పౌర చర్చల కోసం పేరు మరియు కేవలం నియోజకవర్గ ప్రాధాన్యతలను మాత్రమే సేకరిస్తాము. మేము ఖచ్చితమైన GPS ట్రాకింగ్ లేదా రాజకీయ ప్రాధాన్యత ప్రొఫైలింగ్ చేయము.',
    rightsSummary:
      'DPDP చట్టం సెక్షన్ 11 మరియు 12 కింద మీ డేటాను యాక్సెస్ చేయడం, సరిదిద్దడం, సమ్మతిని ఉపసంహరించుకోవడం మరియు ప్రొఫైల్‌ను పూర్తిగా తొలగించే హక్కు మీకు ఉంది.',
    consentWithdrawalInstructions:
      'మీరు యాప్ సెట్టింగ్‌లు > గోప్యత > సమ్మతి ఉపసంహరణ ద్వారా లేదా మా డేటా రక్షణ అధికారిని సంప్రదించి ఎప్పుడైనా సమ్మతిని ఉపసంహరించుకోవచ్చు.',
    dpoContact: {
      name: 'న్యాయవాది ఎస్. రామనాథన్, డేటా రక్షణ అధికారి (DPO)',
      email: 'dpo@kshetra.io',
      address: 'పాన్-ఇన్ గవర్నెన్స్ సెల్, కన్నాట్ ప్లేస్, న్యూఢిల్లీ 110001, భారతదేశం',
    },
    dpbiAppealNotice:
      'మీ ఫిర్యాదు 30 రోజుల్లో పరిష్కారం కాకపోతే, డేటా ప్రొటెక్షన్ బోర్డ్ ఆఫ్ ఇండియా (DPBI) ముందు అప్పీల్ చేసే చట్టబద్ధమైన హక్కు మీకు ఉంది.',
  },

  ta: {
    locale: 'ta',
    languageName: 'தமிழ் (Tamil)',
    privacyPolicyTitle: 'பான்-இன் / க்ஷேத்ரா சட்டபூர்வ தனியுரிமை அறிவிப்பு & குடிமக்கள் தரவு சாசனம்',
    purposeSummary:
      'டிஜிட்டல் தனிநபர் தரவு பாதுகாப்புச் சட்டம், 2023 இன் கீழ் உள்ளூர் குடிமைத் தகவல், கணக்கு சரிபார்ப்பு மற்றும் சட்டப்பூர்வ தேர்தல் புவியியல் தகவல்களை வழங்க மட்டுமே நாங்கள் தரவை செயலாக்குகிறோம்.',
    dataCollectedSummary:
      'உள்நுழைவுக்கு மொபைல் எண், பயனர் பெயர் மற்றும் தொகுதி விவரங்களை மட்டுமே சேகரிக்கிறோம். தொடர்ச்சியான ஜிபிஎஸ் டிராக்கிங் அல்லது தனிநபர் அரசியல் விவரக்குறிப்பு செய்யப்படுவதில்லை.',
    rightsSummary:
      'சட்டம் பிரிவு 11 மற்றும் 12 இன் கீழ் உங்கள் தனிப்பட்ட தரவை அணுகவும், திருத்தவும், ஒப்புதலை திரும்பப் பெறவும், கணக்கை அழிக்கவும் உங்களுக்கு முழு உரிமை உண்டு.',
    consentWithdrawalInstructions:
      'செயலி அமைப்புகள் > தனியுரிமை கட்டுப்பாடுகள் > ஒப்புதல் திரும்பப் பெறுதல் மூலம் நீங்கள் எப்போது வேண்டுமானாலும் உங்கள் ஒப்புதலை திரும்பப் பெறலாம்.',
    dpoContact: {
      name: 'வழக்கறிஞர் எஸ். ராமநாதன், தரவு பாதுகாப்பு அலுவலர்',
      email: 'dpo@kshetra.io',
      address: 'பான்-இன் தனியுரிமை பிரிவு, கன்னாட் பிளேஸ், புது தில்லி 110001, இந்தியா',
    },
    dpbiAppealNotice:
      '30 நாட்களுக்குள் உங்கள் குறை தீர்க்கப்படாவிட்டால், இந்திய தரவு பாதுகாப்பு வாரியத்திடம் (DPBI) மேல்முறையீடு செய்ய உங்களுக்கு சட்டப்பூர்வ உரிமை உள்ளது.',
  },

  kn: {
    locale: 'kn',
    languageName: 'ಕನ್ನಡ (Kannada)',
    privacyPolicyTitle: 'ಪ್ಯಾನ್-ಇನ್ / ಕ್ಷೇತ್ರ ಶಾಸನಬದ್ಧ ಗೌಪ್ಯತಾ ಸೂಚನೆ ಮತ್ತು ನಾಗರಿಕ ಡೇಟಾ ಸನ್ನದು',
    purposeSummary:
      'ಡಿಜಿಟಲ್ ವೈಯಕ್ತಿಕ ಡೇಟಾ ಸಂರಕ್ಷಣಾ ಕಾಯ್ದೆ, 2023 ರ ಅಡಿಯಲ್ಲಿ ಸ್ಥಳೀಯ ನಾಗರಿಕ ಮಾಹಿತಿ, ಖಾತೆ ದೃಢೀಕರಣ ಮತ್ತು ಚುನಾವಣಾ ಭೂಗೋಳ ಒದಗಿಸಲು ಮಾತ್ರ ವೈಯಕ್ತಿಕ ಡೇಟಾವನ್ನು ಬಳಸಲಾಗುತ್ತದೆ.',
    dataCollectedSummary:
      'ದೃಢೀಕರಣಕ್ಕಾಗಿ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ, ಹೆಸರು ಮತ್ತು ಕ್ಷೇತ್ರ ಆದ್ಯತೆಗಳನ್ನು ಮಾತ್ರ ಸಂಗ್ರಹಿಸುತ್ತೇವೆ. ನಿರಂತರ ಜಿಪಿಎಸ್ ಟ್ರ್ಯಾಕಿಂಗ್ ಅಥವಾ ವೈಯಕ್ತಿಕ ರಾಜಕೀಯ ಪ್ರೊಫೈಲಿಂಗ್ ಅನ್ನು ನಾವು ಮಾಡುವುದಿಲ್ಲ.',
    rightsSummary:
      'ಕಾಯ್ದೆಯ ಸೆಕ್ಷನ್ 11 ಮತ್ತು 12 ರ ಅಡಿಯಲ್ಲಿ ನಿಮ್ಮ ಡೇಟಾವನ್ನು ಪ್ರವೇಶಿಸಲು, ಸರಿಪಡಿಸಲು, ಸಮ್ಮತಿಯನ್ನು ಹಿಂಪಡೆಯಲು ಮತ್ತು ಅಳಿಸಲು ನಿಮಗೆ ಹಕ್ಕಿದೆ.',
    consentWithdrawalInstructions:
      'ಆಪ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳು > ಗೌಪ್ಯತಾ ನಿಯಂತ್ರಣಗಳು > ಸಮ್ಮತಿ ಹಿಂಪಡೆಯುವಿಕೆ ಮೂಲಕ ನೀವು ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ಸಮ್ಮತಿಯನ್ನು ಹಿಂಪಡೆಯಬಹುದು.',
    dpoContact: {
      name: 'ಅಡ್ವೊಕೇಟ್ ಎಸ್. ರಾಮನಾಥನ್, ಡೇಟಾ ಸಂರಕ್ಷಣಾ ಅಧಿಕಾರಿ',
      email: 'dpo@kshetra.io',
      address: 'ಪ್ಯಾನ್-ಇನ್ ಗವರ್ನೆನ್ಸ್ ಸೆಲ್, ಕನ್ನಾಟ್ ಪ್ಲೇಸ್, ನವದೆಹಲಿ 110001, ಭಾರತ',
    },
    dpbiAppealNotice:
      'ನಿಮ್ಮ ಕುಂದುಕೊರತೆ 30 ದಿನಗಳಲ್ಲಿ ಪರಿಹಾರವಾಗದಿದ್ದರೆ, ಭಾರತೀಯ ಡೇಟಾ ಸಂರಕ್ಷಣಾ ಮಂಡಳಿಗೆ (DPBI) ಮೇಲ್ಮನವಿ ಸಲ್ಲಿಸುವ ಹಕ್ಕು ನಿಮಗಿದೆ.',
  },

  ml: {
    locale: 'ml',
    languageName: 'മലയാളം (Malayalam)',
    privacyPolicyTitle: 'പാൻ-ഇൻ / ക്ഷേത്ര നിയമപരമായ സ്വകാര്യതാ അറിയിപ്പും പൗര ഡാറ്റാ ചാർട്ടറും',
    purposeSummary:
      'ഡിജിറ്റൽ വ്യക്തിഗത വിവര സംരക്ഷണ നിയമം, 2023 പ്രകാരം പ്രാദേശിക വിവരങ്ങൾ, അക്കൗണ്ട് സ്ഥിരീകരണം, തിരഞ്ഞെടുപ്പ് ഭൂമിശാസ്ത്രം എന്നിവയ്ക്കായി മാത്രം വ്യക്തിഗത വിവരങ്ങൾ ശേഖരിക്കുന്നു.',
    dataCollectedSummary:
      'ലോഗിൻ ചെയ്യാൻ മൊബൈൽ നമ്പർ, യൂസർ നെയിം, മണ്ഡലം വിവരങ്ങൾ എന്നിവ മാത്രം ശേഖരിക്കുന്നു. നിരന്തരമായ ജിപിഎസ് ട്രാക്കിംഗോ രാഷ്ട്രീയ പ്രൊഫൈലിംഗോ നടത്തുന്നില്ല.',
    rightsSummary:
      'നിയമത്തിലെ വകുപ്പ് 11, 12 പ്രകാരം നിങ്ങളുടെ വിവരങ്ങൾ പരിശോധിക്കാനും തിരുത്താനും പിൻവലിക്കാനും അക്കൗണ്ട് പൂർണ്ണമായി നീക്കം ചെയ്യാനും നിങ്ങൾക്ക് അവകാശമുണ്ട്.',
    consentWithdrawalInstructions:
      'ആപ്പ് ക്രമീകരണങ്ങൾ > സ്വകാര്യത > അനുമതി പിൻവലിക്കൽ വഴി നിങ്ങൾക്ക് എപ്പോൾ വേണമെങ്കിലും അനുമതി പിൻവലിക്കാവുന്നതാണ്.',
    dpoContact: {
      name: 'അഡ്വ. എസ്. രാമനാഥൻ, ഡാറ്റാ പ്രൊട്ടക്ഷൻ ഓഫീസർ',
      email: 'dpo@kshetra.io',
      address: 'പാൻ-ഇൻ പ്രൈവസി സെൽ, കൊണാട്ട് പ്ലേസ്, ന്യൂഡൽഹി 110001, ഇന്ത്യ',
    },
    dpbiAppealNotice:
      '30 ദിവസത്തിനകം പരാതി പരിഹരിച്ചില്ലെങ്കിൽ, ഡാറ്റാ പ്രൊട്ടക്ഷൻ ബോർഡ് ഓഫ് ഇന്ത്യ (DPBI) മുൻപാകെ അപ്പീൽ നൽകാൻ നിങ്ങൾക്ക് നിയമപരമായ അവകാശമുണ്ട്.',
  },

  mr: {
    locale: 'mr',
    languageName: 'मराठी (Marathi)',
    privacyPolicyTitle: 'पॅन-इन / क्षेत्र वैधानिक गोपनीयता सूचना आणि नागरिक डेटा सनद',
    purposeSummary:
      'डिजिटल वैयक्तिक डेटा संरक्षण कायदा, २०२३ अंतर्गत स्थानिक नागरी माहिती, खाते प्रमाणीकरण आणि निवडणूक भूगोल प्रदान करण्यासाठीच आम्ही डेटा संकलित करतो.',
    dataCollectedSummary:
      'आम्ही केवळ मोबाईल क्रमांक, वापरकर्ता नाव आणि मतदारसंघाची माहिती गोळा करतो. सतत जीपीएस ट्रॅकिंग किंवा वैयक्तिक राजकीय प्रोफाइलिंग केले जात नाही.',
    rightsSummary:
      'डीपीडीपी कायद्याच्या कलम ११ आणि १२ अन्वये आपल्याकडे माहिती मिळवण्याचा, दुरुस्त करण्याचा, संमती मागे घेण्याचा आणि खाते हटवण्याचा पूर्ण अधिकार आहे.',
    consentWithdrawalInstructions:
      'अॅप सेटिंग्ज > गोपनीयता > संमती मागे घ्या या पर्यायाद्वारे किंवा डेटा संरक्षण अधिकाऱ्याशी संपर्क साधून आपण कधीही संमती मागे घेऊ शकता.',
    dpoContact: {
      name: 'अ‍ॅड. एस. रामनाथन, डेटा संरक्षण अधिकारी',
      email: 'dpo@kshetra.io',
      address: 'पॅन-इन गव्हर्नन्स सेल, कॅनॉट प्लेस, नवी दिल्ली १1000१, भारत',
    },
    dpbiAppealNotice:
      'आपल्या तक्रारीचे ३० दिवसांत निवारण न झाल्यास, भारतीय डेटा संरक्षण मंडळाकडे (DPBI) दाद मागण्याचा कायदेशीर अधिकार आपल्याकडे आहे.',
  },

  bn: {
    locale: 'bn',
    languageName: 'বাংলা (Bengali)',
    privacyPolicyTitle: 'প্যান-ইন / ক্ষেত্র সংবিধিবদ্ধ গোপনীয়তা বিজ্ঞপ্তি এবং নাগরিক ডেটা সনদ',
    purposeSummary:
      'ডিজিটাল ব্যক্তিগত ডেটা সুরক্ষা আইন, ২০২৩-এর অধীনে নাগরিক তথ্য, অ্যাকাউন্ট যাচাইকরণ এবং নির্বাচনী তথ্যের জন্য ব্যক্তিগত ডেটা প্রক্রিয়া করা হয়।',
    dataCollectedSummary:
      'লগইনের জন্য মোবাইল নম্বর, প্রদর্শন নাম এবং নির্বাচনী এলাকার পছন্দ সংগ্রহ করা হয়। আমরা অবিরত জিপিএস ট্র্যাকিং বা রাজনৈতিক প্রোফাইলিং করি না।',
    rightsSummary:
      'আইনের ধারা ১১ ও ১২ অনুযায়ী আপনার ডেটা দেখা, সংশোধন করা, সম্মতি প্রত্যাহার করা এবং অ্যাকাউন্ট মুছে ফেলার সম্পূর্ণ অধিকার রয়েছে।',
    consentWithdrawalInstructions:
      'অ্যাপ সেটিংস > গোপনীয়তা > সম্মতি প্রত্যাহার বিকল্পের মাধ্যমে যেকোনো সময় আপনার সম্মতি প্রত্যাহার করতে পারেন।',
    dpoContact: {
      name: 'অ্যাডভোকেট এস. রামনাথন, ডেটা সুরক্ষা কর্মকর্তা',
      email: 'dpo@kshetra.io',
      address: 'প্যান-ইন গোপনীয়তা বিভাগ, কনট প্লেস, নতুন দিল্লি ১১০০০১, ভারত',
    },
    dpbiAppealNotice:
      '৩০ দিনের মধ্যে অভিযোগের সমাধান না হলে, ভারতের ডেটা সুরক্ষা বোর্ডের (DPBI) কাছে আপিল করার অধিকার রয়েছে।',
  },

  gu: {
    locale: 'gu',
    languageName: 'ગુજરાતી (Gujarati)',
    privacyPolicyTitle: 'પૅન-ઇન / ક્ષેત્ર વૈધાનિક ગોપનીયતા સૂચના અને નાગરિક ડેટા ચાર્ટર',
    purposeSummary:
      'ડિજિટલ પર્સનલ ડેટા પ્રોટેક્શન એક્ટ, ૨૦૨૩ હેઠળ સ્થાનિક નાગરિક માહિતી, ખાતાની ચકાસણી અને ચૂંટણી સંબંધિત સેવાઓ માટે જ ડેટા પ્રક્રિયા થાય છે.',
    dataCollectedSummary:
      'અમે સાઇન-ઇન માટે મોબાઇલ નંબર, નામ અને મતવિસ્તારની વિગતો લઈએ છીએ. સતત જીપીએસ ટ્રેકિંગ કે રાજકીય પ્રોફાઇલિંગ કરવામાં આવતું નથી.',
    rightsSummary:
      'કાયદાની કલમ ૧૧ અને ૧૨ હેઠળ તમને તમારા ડેટાની નકલ મેળવવાનો, સુધારો કરવાનો અને ડેટા ભૂંસી નાખવાનો કાનૂની અધિકાર છે.',
    consentWithdrawalInstructions:
      'તમે એપ સેટિંગ્સ > ગોપનીયતા > સંમતિ પાછી ખેંચો દ્વારા કોઈપણ સમયે તમારી સંમતિ રદ કરી શકો છો.',
    dpoContact: {
      name: 'એડવોકેટ એસ. રામનાથન, ડેટા પ્રોટેક્શન ઓફિસર',
      email: 'dpo@kshetra.io',
      address: 'પૅન-ઇન ગવર્નન્સ સેલ, કનોટ પ્લેસ, નવી દિલ્હી ૧૧૦૦૦૧, ભારત',
    },
    dpbiAppealNotice:
      'જો ૩૦ દિવસમાં ફરિયાદનું નિરાકરણ ન થાય, તો ભારતીય ડેટા પ્રોટેક્શન બોર્ડ (DPBI) સમક્ષ અપીલ કરવાનો અધિકાર છે.',
  },

  or: {
    locale: 'or',
    languageName: 'ଓଡ଼ିଆ (Odia)',
    privacyPolicyTitle: 'ପ୍ୟାନ୍-ଇନ୍ / କ୍ଷେତ୍ର ବୈଧାନିକ ଗୋପନୀୟତା ବିଜ୍ଞପ୍ତି ଏବଂ ନାଗରିକ ତଥ୍ୟ ଚାର୍ଟର',
    purposeSummary:
      'ଡିଜିଟାଲ୍ ବ୍ୟକ୍ତିଗତ ତଥ୍ୟ ସୁରକ୍ଷା ଅଧିନିୟମ, ୨୦୨୩ ଅନୁଯାୟୀ ନାଗରିକ ସୂଚନା, ଆକାଉଣ୍ଟ୍ ପ୍ରମାଣୀକରଣ ଏବଂ ନିର୍ବାଚନ ସେବା ପାଇଁ ବ୍ୟକ୍ତିଗତ ତଥ୍ୟ ବ୍ୟବହାର କରାଯାଏ |',
    dataCollectedSummary:
      'ଆମେ କେବଳ ମୋବାଇଲ୍ ନମ୍ବର, ନାମ ଏବଂ ନିର୍ବାଚନମଣ୍ଡଳୀ ପସନ୍ଦ ସଂଗ୍ରହ କରୁ | କୌଣସି ନିରନ୍ତର ଜିପିଏସ୍ ଟ୍ରାକିଂ କରାଯାଏ ନାହିଁ |',
    rightsSummary:
      'ଧାରା ୧୧ ଏବଂ ୧୨ ଅଧୀନରେ ଆପଣଙ୍କର ତଥ୍ୟ ଦେଖିବା, ସଂଶୋଧନ କରିବା ଏବଂ ସମ୍ପୂର୍ଣ୍ଣ ବିଲୋପ କରିବା ପାଇଁ ଆଇନଗତ ଅଧିକାର ଅଛି |',
    consentWithdrawalInstructions:
      'ଆପଣ ଆପ୍ ସେଟିଙ୍ଗ୍ସ > ଗୋପନୀୟତା > ସମ୍ମତି ପ୍ରତ୍ୟାହାର ମାଧ୍ୟମରେ ଯେକୌଣସି ସମୟରେ ସମ୍ମତି ପ୍ରତ୍ୟାହାର କରିପାରିବେ |',
    dpoContact: {
      name: 'ଆଡଭୋକେଟ୍ ଏସ୍. ରାମନାଥନ୍, ଡାଟା ସୁରକ୍ଷା ଅଧିକାରୀ',
      email: 'dpo@kshetra.io',
      address: 'ପ୍ୟାନ୍-ଇନ୍ ଗଭର୍ଣ୍ଣାନ୍ସ ସେଲ୍, କନଟ୍ ପ୍ଲେସ୍, ନୂଆଦିଲ୍ଲୀ ୧୧୦୦୦୧, ଭାରତ',
    },
    dpbiAppealNotice:
      'ଯଦି ୩୦ ଦିନ ମଧ୍ୟରେ ଅଭିଯୋଗ ସମାଧାନ ନହୁଏ, ତେବେ ଭାରତୀୟ ଡାଟା ସୁରକ୍ଷା ବୋର୍ଡ (DPBI) ରେ ଆବେଦନ କରିବାକୁ ଅଧିକାର ଅଛି |',
  },

  pa: {
    locale: 'pa',
    languageName: 'ਪੰਜਾਬੀ (Punjabi)',
    privacyPolicyTitle: 'ਪੈਨ-ਇਨ / ਖੇਤਰ ਕਾਨੂੰਨੀ ਗੋਪਨੀਯਤਾ ਨੋਟਿਸ ਅਤੇ ਨਾਗਰਿਕ ਡਾਟਾ ਚਾਰਟਰ',
    purposeSummary:
      'ਡਿਜੀਟਲ ਨਿੱਜੀ ਡਾਟਾ ਸੁਰੱਖਿਆ ਐਕਟ, 2023 ਅਧੀਨ ਨਾਗਰਿਕ ਜਾਣਕਾਰੀ, ਖਾਤਾ ਪ੍ਰਮਾਣੀਕਰਨ ਅਤੇ ਚੋਣ ਜਾਣਕਾਰੀ ਪ੍ਰਦਾਨ ਕਰਨ ਲਈ ਡਾਟਾ ਵਰਤਿਆ ਜਾਂਦਾ ਹੈ।',
    dataCollectedSummary:
      'ਅਸੀਂ ਸਿਰਫ ਮੋਬਾਈਲ ਨੰਬਰ, ਨਾਮ ਅਤੇ ਹਲਕੇ ਦੀ ਚੋਣ ਇਕੱਠੀ ਕਰਦੇ ਹਾਂ। ਨਿਰੰਤਰ ਜੀਪੀਐਸ ਟਰੈਕਿੰਗ ਜਾਂ ਸਿਆਸੀ ਪ੍ਰੋਫਾਈਲਿੰਗ ਨਹੀਂ ਕੀਤੀ ਜਾਂਦੀ।',
    rightsSummary:
      'ਐਕਟ ਦੀ ਧਾਰਾ 11 ਅਤੇ 12 ਅਧੀਨ ਤੁਹਾਡੇ ਕੋਲ ਆਪਣੇ ਡਾਟੇ ਨੂੰ ਵੇਖਣ, ਸੋਧਣ, ਸਹਿਮਤੀ ਵਾਪਸ ਲੈਣ ਅਤੇ ਮਿਟਾਉਣ ਦਾ ਅਧਿਕਾਰ ਹੈ।',
    consentWithdrawalInstructions:
      'ਤੁਸੀਂ ਐਪ ਸੈਟਿੰਗਾਂ > ਗੋਪਨੀਯਤਾ ਕੰਟਰੋਲ > ਸਹਿਮਤੀ ਵਾਪਸੀ ਰਾਹੀਂ ਕਿਸੇ ਵੀ ਸਮੇਂ ਸਹਿਮਤੀ ਵਾਪਸ ਲੈ ਸਕਦੇ ਹੋ।',
    dpoContact: {
      name: 'ਐਡਵੋਕੇਟ ਐਸ. ਰਾਮਨਾਥਨ, ਡਾਟਾ ਪ੍ਰੋਟੈਕਸ਼ਨ ਅਫਸਰ',
      email: 'dpo@kshetra.io',
      address: 'ਪੈਨ-ਇਨ ਗਵਰਨੈਂਸ ਸੈੱਲ, ਕਨਾਟ ਪਲੇਸ, ਨਵੀਂ ਦਿੱਲੀ 110001, ਭਾਰਤ',
    },
    dpbiAppealNotice:
      'ਜੇਕਰ 30 ਦਿਨਾਂ ਦੇ ਅੰਦਰ ਸ਼ਿਕਾਇਤ ਦਾ ਨਿਪਟਾਰਾ ਨਹੀਂ ਹੁੰਦਾ, ਤਾਂ ਭਾਰਤੀ ਡਾਟਾ ਸੁਰੱਖਿਆ ਬੋਰਡ (DPBI) ਅੱਗੇ ਅਪੀਲ ਕਰਨ ਦਾ ਅਧਿਕਾਰ ਹੈ।',
  },

  as: {
    locale: 'as',
    languageName: 'অসমীয়া (Assamese)',
    privacyPolicyTitle: 'পেন-ইন / ক্ষেত্ৰ আইনী গোপনীয়তা জাননী আৰু নাগৰিক তথ্য চনদ',
    purposeSummary:
      'ডিজিটেল ব্যক্তিগত তথ্য সুৰক্ষা আইন, ২০২৩ ৰ অধীনত নাগৰিক তথ্য, একাউণ্ট সত্যাপন আৰু নিৰ্বাচনী সেৱা প্ৰদান কৰাৰ বাবেহে তথ্য ব্যৱহাৰ কৰা হয়।',
    dataCollectedSummary:
      'আমি কেৱল মোবাইল নম্বৰ, নাম আৰু সমষ্টিৰ পছন্দ সংগ্ৰহ কৰোঁ। নিৰন্তৰ জিপিএছ ট্ৰেকিং বা ৰাজনৈতিক প্ৰফাইল প্ৰস্তুত কৰা নহয়।',
    rightsSummary:
      'আইনৰ ১১ আৰু ১২ নং ধাৰাৰ অধীনত আপোনাৰ তথ্য চোৱা, শুধৰণি কৰা, সন্মতি প্ৰত্যাহাৰ কৰা আৰু মচি পেলোৱাৰ আইনী অধিকাৰ আছে।',
    consentWithdrawalInstructions:
      'আপুনি এপৰ ছেটিংছ > গোপনীয়তা > সন্মতি প্ৰত্যাহাৰৰ জৰিয়তে যিকোনো সময়তে সন্মতি বাতিল কৰিব পাৰে।',
    dpoContact: {
      name: 'অধিবক্তা এছ. ৰামনাথন, তথ্য সুৰক্ষা বিষয়া',
      email: 'dpo@kshetra.io',
      address: 'পেন-ইন প্ৰাইভেচি চেল, কনট প্লেচ, নতুন দিল্লী ১১০০০১, ভাৰত',
    },
    dpbiAppealNotice:
      '৩০ দিনৰ ভিতৰত অভিযোগ নিষ্পত্তি নহ’লে, ভাৰতীয় তথ্য সুৰক্ষা বোৰ্ডৰ (DPBI) ওচৰত আপীল কৰাৰ অধিকাৰ আছে।',
  },

  ne: {
    locale: 'ne',
    languageName: 'नेपाली (Nepali)',
    privacyPolicyTitle: 'प्यान-इन / क्षेत्र वैधानिक गोपनीयता सूचना तथा नागरिक डेटा घोषणापत्र',
    purposeSummary:
      'डिजिटल व्यक्तिगत डेटा संरक्षण ऐन, २०२३ अन्तर्गत स्थानीय नागरिक जानकारी, खाता प्रमाणीकरण र निर्वाचन भूगोल प्रदान गर्न मात्र व्यक्तिगत डेटा प्रयोग गरिन्छ।',
    dataCollectedSummary:
      'हामी केवल मोबाइल नम्बर, नाम र निर्वाचन क्षेत्र प्राथमिकताहरू सङ्कलन गर्छौं। निरन्तर जीपीएस ट्र्याकिङ वा राजनीतिक प्रोफाइलिङ गरिँदैन।',
    rightsSummary:
      'ऐनको दफा ११ र १२ बमोजिम तपाईंसँग आफ्नो डेटा हेर्ने, सच्याउने, सहमति फिर्ता लिने र खाता मेटाउने पूर्ण अधिकार छ।',
    consentWithdrawalInstructions:
      'तपाईंले एप सेटिङ > गोपनीयता > सहमति फिर्ता मार्फत जुनसुकै बेला सहमति फिर्ता लिन सक्नुहुन्छ।',
    dpoContact: {
      name: 'अधिवक्ता एस. रामनाथन, डेटा संरक्षण अधिकारी',
      email: 'dpo@kshetra.io',
      address: 'प्यान-इन गभर्नेन्स सेल, कनोट प्लेस, नयाँ दिल्ली १1000१, भारत',
    },
    dpbiAppealNotice:
      'यदि ३० दिनभित्र तपाईंको गुनासो सम्बोधन भएन भने, भारतीय डेटा संरक्षण बोर्ड (DPBI) समक्ष पुनरावेदन गर्ने अधिकार छ।',
  },
};

export class PrivacyLocaleService {
  /**
   * Retrieves the privacy notice for a supported locale. Defaults to English ('en').
   */
  getNotice(locale: string = 'en'): PrivacyNoticePack {
    const validLocale = (locale.toLowerCase() in COMPLIANCE_PRIVACY_LOCALES
      ? locale.toLowerCase()
      : 'en') as SupportedPrivacyLocale;
    return COMPLIANCE_PRIVACY_LOCALES[validLocale];
  }

  /**
   * Returns list of all 13 supported language codes and display names.
   */
  getSupportedLocales(): { locale: SupportedPrivacyLocale; languageName: string }[] {
    return Object.values(COMPLIANCE_PRIVACY_LOCALES).map((p) => ({
      locale: p.locale,
      languageName: p.languageName,
    }));
  }

  /**
   * Verifies that all 13 official languages exist with 100% key completeness.
   */
  verifyLinguisticParity(): {
    totalExpectedLocales: number;
    loadedLocales: number;
    completeParity: boolean;
    missingKeysByLocale: Record<string, string[]>;
  } {
    const requiredLocales: SupportedPrivacyLocale[] = [
      'en',
      'hi',
      'te',
      'ta',
      'kn',
      'ml',
      'mr',
      'bn',
      'gu',
      'or',
      'pa',
      'as',
      'ne',
    ];
    const missingKeysByLocale: Record<string, string[]> = {};

    for (const loc of requiredLocales) {
      const pack = COMPLIANCE_PRIVACY_LOCALES[loc];
      if (!pack) {
        missingKeysByLocale[loc] = ['ENTIRE_LOCALE_MISSING'];
        continue;
      }
      const missing: string[] = [];
      if (!pack.privacyPolicyTitle) missing.push('privacyPolicyTitle');
      if (!pack.purposeSummary) missing.push('purposeSummary');
      if (!pack.dataCollectedSummary) missing.push('dataCollectedSummary');
      if (!pack.rightsSummary) missing.push('rightsSummary');
      if (!pack.consentWithdrawalInstructions) missing.push('consentWithdrawalInstructions');
      if (!pack.dpoContact?.email) missing.push('dpoContact.email');
      if (!pack.dpbiAppealNotice) missing.push('dpbiAppealNotice');

      if (missing.length > 0) {
        missingKeysByLocale[loc] = missing;
      }
    }

    return {
      totalExpectedLocales: requiredLocales.length,
      loadedLocales: Object.keys(COMPLIANCE_PRIVACY_LOCALES).length,
      completeParity: Object.keys(missingKeysByLocale).length === 0,
      missingKeysByLocale,
    };
  }
}

export const privacyLocaleService = new PrivacyLocaleService();
