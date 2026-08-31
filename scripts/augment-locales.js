const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../apps/mobile/i18n/locales');

const STATE_NAMES = {
  en: { IN: 'India', TS: 'Telangana', AP: 'Andhra Pradesh', KA: 'Karnataka', MH: 'Maharashtra', TN: 'Tamil Nadu', DL: 'Delhi', UP: 'Uttar Pradesh', WB: 'West Bengal', GJ: 'Gujarat', RJ: 'Rajasthan', KL: 'Kerala', MP: 'Madhya Pradesh' },
  te: { IN: 'భారతదేశం', TS: 'తెలంగాణ', AP: 'ఆంధ్రప్రదేశ్', KA: 'కర్ణాటక', MH: 'మహారాష్ట్ర', TN: 'తమిళనాడు', DL: 'ఢిల్లీ', UP: 'ఉత్తరప్రదేశ్', WB: 'పశ్చిమ బెంగాల్', GJ: 'గుజరాత్', RJ: 'రాజస్థాన్', KL: 'కేరళ', MP: 'మధ్యప్రదేశ్' },
  hi: { IN: 'भारत', TS: 'तेलंगाना', AP: 'आंध्र प्रदेश', KA: 'कर्नाटक', MH: 'महाराष्ट्र', TN: 'तमिलनाडु', DL: 'दिल्ली', UP: 'उत्तर प्रदेश', WB: 'पश्चिम बंगाल', GJ: 'गुजरात', RJ: 'राजस्थान', KL: 'केरल', MP: 'मध्य प्रदेश' },
  ta: { IN: 'இந்தியா', TS: 'தெலங்கானா', AP: 'ஆந்திரப் பிரதேசம்', KA: 'கர்நாடகா', MH: 'மகாராஷ்டிரா', TN: 'தமிழ்நாடு', DL: 'தில்லி', UP: 'உத்தரப் பிரதேசம்', WB: 'மேற்கு வங்கம்', GJ: 'குஜராத்', RJ: 'ராஜஸ்தான்', KL: 'கேரளா', MP: 'மத்தியப் பிரதேசம்' },
  kn: { IN: 'ಭಾರತ', TS: 'ತೆಲಂಗಾಣ', AP: 'ಆಂಧ್ರಪ್ರದೇಶ', KA: 'ಕರ್ನಾಟಕ', MH: 'ಮಹಾರಾಷ್ಟ್ರ', TN: 'ತಮಿಳುನಾಡು', DL: 'ದೆಹಲಿ', UP: 'ಉತ್ತರ ಪ್ರದೇಶ', WB: 'ಪಶ್ಚಿಮ ಬಂಗಾಳ', GJ: 'ಗುಜರಾತ್', RJ: 'ರಾಜಸ್ಥಾನ', KL: 'ಕೇರಳ', MP: 'ಮಧ್ಯಪ್ರದೇಶ' },
  mr: { IN: 'भारत', TS: 'तेलंगणा', AP: 'आंध्र प्रदेश', KA: 'कर्नाटक', MH: 'महाराष्ट्र', TN: 'तमिळनाडू', DL: 'दिल्ली', UP: 'उत्तर प्रदेश', WB: 'पश्चिम बंगाल', GJ: 'गुजरात', RJ: 'राजस्थान', KL: 'केरळ', MP: 'मध्य प्रदेश' },
  bn: { IN: 'ভারত', TS: 'তেলেঙ্গানা', AP: 'অন্ধ্র প্রদেশ', KA: 'কর্ণাটক', MH: 'মহারাষ্ট্র', TN: 'তামিলনাড়ু', DL: 'দিল্লি', UP: 'উত্তর প্রদেশ', WB: 'পশ্চিমবঙ্গ', GJ: 'গুজরাট', RJ: 'রাজস্থান', KL: 'কেরল', MP: 'মধ্যপ্রদেশ' },
  gu: { IN: 'ભારત', TS: 'તેલંગાણા', AP: 'આંધ્ર પ્રદેશ', KA: 'કર્ણાટક', MH: 'મહારાષ્ટ્ર', TN: 'તમિલનાડુ', DL: 'દિલ્હી', UP: 'ઉત્તર પ્રદેશ', WB: 'પશ્ચિમ બંગાળ', GJ: 'ગુજરાત', RJ: 'રાજસ્થાન', KL: 'કેરળ', MP: 'મધ્ય પ્રદેશ' },
  ml: { IN: 'ഇന്ത്യ', TS: 'തെലങ്കാന', AP: 'ആന്ധ്രാപ്രദേശ്', KA: 'കർണാടക', MH: 'മഹാരാഷ്ട്ര', TN: 'തമിഴ്നാട്', DL: 'ഡൽഹി', UP: 'ഉത്തർപ്രദേശ്', WB: 'പശ്ചിമ ബംഗാൾ', GJ: 'ഗുജറാത്ത്', RJ: 'രാജസ്ഥാൻ', KL: 'കേരളം', MP: 'മധ്യപ്രദേശ്' },
  pa: { IN: 'ਭਾਰਤ', TS: 'ਤੇਲੰਗਾਨਾ', AP: 'ਆਂਧਰਾ ਪ੍ਰਦੇਸ਼', KA: 'ਕਰਨਾਟਕ', MH: 'ਮਹਾਰਾਸ਼ਟਰ', TN: 'ਤਾਮਿਲਨਾਡੂ', DL: 'ਦਿੱਲੀ', UP: 'ਉੱਤਰ ਪ੍ਰਦੇਸ਼', WB: 'ਪੱਛਮੀ ਬੰਗਾਲ', GJ: 'ਗੁਜਰਾਤ', RJ: 'ਰਾਜਸਥਾਨ', KL: 'ਕੇਰਲ', MP: 'ਮੱਧ ਪ੍ਰਦੇਸ਼' },
  or: { IN: 'ଭାରତ', TS: 'ତେଲେଙ୍ଗାନା', AP: 'ଆନ୍ଧ୍ର ପ୍ରଦେଶ', KA: 'କର୍ଣ୍ଣାଟକ', MH: 'ମହାରାଷ୍ଟ୍ର', TN: 'ତାମିଲନାଡୁ', DL: 'ଦିଲ୍ଲୀ', UP: 'ଉତ୍ତର ପ୍ରଦେଶ', WB: 'ପଶ୍ଚିମ ବଙ୍ଗ', GJ: 'ଗୁଜୁରାଟ', RJ: 'ରାଜସ୍ଥାନ', KL: 'କେରଳ', MP: 'ମଧ୍ୟ ପ୍ରଦେଶ' },
  as: { IN: 'ভাৰত', TS: 'তেলেংগানা', AP: 'অন্ধ্ৰ প্ৰদেশ', KA: 'কৰ্ণাটক', MH: 'মহাৰাষ্ট্ৰ', TN: 'তামিলনাডু', DL: 'দিল্লী', UP: 'উত্তৰ প্ৰদেশ', WB: 'পশ্চিম বংগ', GJ: 'গুজৰাট', RJ: 'ৰাজস্থান', KL: 'কেৰেলা', MP: 'মধ্য প্ৰদেশ' },
  ne: { IN: 'भारत', TS: 'तेलङ्गाना', AP: 'आन्ध्र प्रदेश', KA: 'कर्नाटक', MH: 'महाराष्ट्र', TN: 'तमिलनाडु', DL: 'दिल्ली', UP: 'उत्तर प्रदेश', WB: 'पश्चिम बंगाल', GJ: 'गुजरात', RJ: 'राजस्थान', KL: 'केरल', MP: 'मध्य प्रदेश' }
};

const COMMON_TIME = {
  en: { justNow: 'just now', minutesShort: 'm', hoursShort: 'h', daysShort: 'd' },
  te: { justNow: 'ఇప్పుడే', minutesShort: 'నిమి', hoursShort: 'గం', daysShort: 'రో' },
  hi: { justNow: 'अभी-अभी', minutesShort: 'मि', hoursShort: 'घं', daysShort: 'दिन' },
  ta: { justNow: 'இப்போது', minutesShort: 'நிமி', hoursShort: 'மணி', daysShort: 'நா' },
  kn: { justNow: 'ಈಗಷ್ಟೇ', minutesShort: 'ನಿ', hoursShort: 'ಗಂ', daysShort: 'ದಿನ' },
  mr: { justNow: 'आत्ताच', minutesShort: 'मि', hoursShort: 'तास', daysShort: 'दिवस' },
  bn: { justNow: 'এইমাত্র', minutesShort: 'মি', hoursShort: 'ঘ', daysShort: 'দিন' },
  gu: { justNow: 'હમણાં જ', minutesShort: 'મિ', hoursShort: 'ક', daysShort: 'દિવસ' },
  ml: { justNow: 'ഇപ്പോൾ', minutesShort: 'മിനിറ്റ്', hoursShort: 'മണിക്കൂർ', daysShort: 'ദിവസം' },
  pa: { justNow: 'ਹੁਣੇ', minutesShort: 'ਮਿੰਟ', hoursShort: 'ਘੰਟੇ', daysShort: 'ਦਿਨ' },
  or: { justNow: 'ଏବେ', minutesShort: 'ମି', hoursShort: 'ଘଣ୍ଟା', daysShort: 'ଦିନ' },
  as: { justNow: 'এইমাত্ৰ', minutesShort: 'মি', hoursShort: 'ঘণ্টা', daysShort: 'দিন' },
  ne: { justNow: 'भर्खरै', minutesShort: 'मिनेट', hoursShort: 'घन्टा', daysShort: 'दिन' }
};

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.ts'));

for (const f of files) {
  const code = path.basename(f, '.ts');
  const filePath = path.join(localesDir, f);
  let content = fs.readFileSync(filePath, 'utf8');

  const statesObj = STATE_NAMES[code] || STATE_NAMES.en;
  const timeObj = COMMON_TIME[code] || COMMON_TIME.en;

  // Insert time keys into common if missing
  if (!content.includes('"justNow":')) {
    const timeAddition = `    "justNow": ${JSON.stringify(timeObj.justNow)},\n    "minutesShort": ${JSON.stringify(timeObj.minutesShort)},\n    "hoursShort": ${JSON.stringify(timeObj.hoursShort)},\n    "daysShort": ${JSON.stringify(timeObj.daysShort)},\n`;
    content = content.replace(/"common":\s*{/, `"common": {\n${timeAddition}`);
  }

  // Insert states object if missing
  if (!content.includes('"states":')) {
    const statesFormatted = `  "states": ${JSON.stringify(statesObj, null, 4).replace(/\n/g, '\n  ')},\n`;
    content = content.replace(/(const\s+\w+\s*=\s*{)/, `$1\n${statesFormatted}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Augmented ${f}`);
}

console.log('All locale files augmented successfully.');
