/**
 * LMX Localizer — 100% i18n support for Live Tab cards, players, and meta info.
 * Translates/transliterates place names, reporters, organizations, and headlines
 * across all 13 supported languages.
 */

type SupportedLang =
  | 'en'
  | 'te'
  | 'hi'
  | 'kn'
  | 'mr'
  | 'ta'
  | 'ml'
  | 'bn'
  | 'gu'
  | 'pa'
  | 'or'
  | 'as'
  | 'ne';

const LOCALITIES: Record<string, Record<SupportedLang, string>> = {
  Assembly: {
    en: 'Assembly',
    hi: 'विधानसभा',
    te: 'అసెంబ్లీ',
    ta: 'சட்டமன்றம்',
    kn: 'ವಿಧಾನಸಭೆ',
    mr: 'विधानसभा',
    bn: 'বিধানসভা',
    gu: 'વિધાનસભા',
    ml: 'നിയമസഭ',
    or: 'ବିଧାନସଭା',
    pa: 'ਵਿਧਾਨ ਸਭਾ',
    as: 'বিধানসভা',
    ne: 'विधानसभा',
  },
  Abids: {
    en: 'Abids',
    hi: 'आबिड्स',
    te: 'అబిడ్స్',
    ta: 'அபிட்ஸ்',
    kn: 'ಅಬಿಡ್ಸ್',
    mr: 'आबिड्स',
    bn: 'আবিডস',
    gu: 'આબિડ્સ',
    ml: 'അബിഡ്സ്',
    or: 'ଆବିଡ୍ସ',
    pa: 'ਆਬਿਡਸ',
    as: 'আবিডছ',
    ne: 'आबिड्स',
  },
  Panjagutta: {
    en: 'Panjagutta',
    hi: 'पंजगुट्टा',
    te: 'పంజాగుట్ట',
    ta: 'பஞ்சகுட்டா',
    kn: 'ಪಂಜಾಗುಟ್ಟ',
    mr: 'पंजगुट्टा',
    bn: 'পাঞ্জাগুট্টা',
    gu: 'પંજાબગુટ્ટા',
    ml: 'പഞ്ചഗുട്ട',
    or: 'ପଞ୍ଜାଗୁଟ୍ଟା',
    pa: 'ਪੰਜਾਗੁੱਟਾ',
    as: 'পাঞ্জাগুট্টা',
    ne: 'पञ्जगुट्टा',
  },
  'MG Road': {
    en: 'MG Road',
    hi: 'एम.जी. रोड',
    te: 'ఎం.జి. రోడ్',
    ta: 'எம்.ஜி. சாலை',
    kn: 'ಎಂ.ಜಿ. ರಸ್ತೆ',
    mr: 'एम.जी. रोड',
    bn: 'এম.জি. রোড',
    gu: 'એમ.જી. રોડ',
    ml: 'എം.ജി. റോഡ്',
    or: 'ଏମ.ଜି. ରୋଡ',
    pa: 'ਐਮ.ਜੀ. ਰੋਡ',
    as: 'এম.জি. ৰোড',
    ne: 'एम.जी. रोड',
  },
  Charminar: {
    en: 'Charminar',
    hi: 'चारमीनार',
    te: 'చార్మినార్',
    ta: 'சார்மினார்',
    kn: 'ಚಾರ್ಮಿನಾರ್',
    mr: 'चारमीनार',
    bn: 'চারমিনার',
    gu: 'ચારમીનાર',
    ml: 'ചാർമിനാർ',
    or: 'ଚାରମିନାର',
    pa: 'ਚਾਰਮੀਨਾਰ',
    as: 'চাৰমინაৰ',
    ne: 'चारमीनार',
  },
  Secunderabad: {
    en: 'Secunderabad',
    hi: 'सिकंदराबाद',
    te: 'సికింద్రాబాద్',
    ta: 'செகந்திராபாத்',
    kn: 'ಸಿಕಂದರಾಬಾದ್',
    mr: 'सिकंदराबाद',
    bn: 'সেকেন্দ্রাবাদ',
    gu: 'સિકંદરાબાદ',
    ml: 'സെക്കന്തരാബാദ്',
    or: 'ସିକନ୍ଦରାବାଦ',
    pa: 'ਸਿਕੰਦਰਾਬਾਦ',
    as: 'চিকন্দৰাবাদ',
    ne: 'सिकन्दराबाद',
  },
  'Jubilee Hills': {
    en: 'Jubilee Hills',
    hi: 'जुबली हिल्स',
    te: 'జూబ్లీ హిల్స్',
    ta: 'ஜூபிலி ஹில்ஸ்',
    kn: 'ಜ್ಯೂಬಿಲಿ ಹಿಲ್ಸ್',
    mr: 'जुबली हिल्स',
    bn: 'জুবিলি হিলস',
    gu: 'જુબિલી હિલ્સ',
    ml: 'ജൂબിലി ഹിൽസ്',
    or: 'ଜୁବିଲି ହିଲ୍ସ',
    pa: 'ਜੁਬਲੀ ਹਿਲਜ਼',
    as: 'জুবিলী হিলছ',
    ne: 'जुबली हिल्स',
  },
  'Banjara Hills': {
    en: 'Banjara Hills',
    hi: 'बंजारा हिल्स',
    te: 'బంజారా హిల్స్',
    ta: 'பஞ்சாரா ஹில்ஸ்',
    kn: 'ಬಂಜಾರಾ ಹಿಲ್ಸ್',
    mr: 'बंजारा हिल्स',
    bn: 'বাঞ্জারা হিলস',
    gu: 'બંજારા હિલ્સ',
    ml: 'ബഞ്ചാര ഹിൽസ്',
    or: 'ବଞ୍ଜାରା ହିଲ୍ସ',
    pa: 'ਬੰਜਾਰਾ ਹਿਲਜ਼',
    as: 'বাঞ্জাৰা হিলছ',
    ne: 'बञ्जरा हिल्स',
  },
  'Hitec City': {
    en: 'Hitec City',
    hi: 'हाईटेक सिटी',
    te: 'హైటెక్ సిటీ',
    ta: 'ஹைடெக் சிட்டி',
    kn: 'ಹೈಟೆಕ್ ಸಿಟಿ',
    mr: 'हायटेक सिटी',
    bn: 'হাইটেক সিটি',
    gu: 'હાઇટેક સિટી',
    ml: 'ഹൈടെക് സിറ്റി',
    or: 'ହାଇଟେକ୍ ସିଟି',
    pa: 'ਹਾਈਟੈੱਕ ਸਿਟੀ',
    as: 'হাইটেক চিটি',
    ne: 'हाइटेक सिटी',
  },
};

const DISTRICTS: Record<string, Record<SupportedLang, string>> = {
  Hyderabad: {
    en: 'Hyderabad',
    hi: 'हैदराबाद',
    te: 'హైదరాబాద్',
    ta: 'ஹைதராபாத்',
    kn: 'ಹೈದರಾಬಾದ್',
    mr: 'हैदराबाद',
    bn: 'হায়দ্রাবাদ',
    gu: 'હૈદરાબાદ',
    ml: 'ഹൈദരാബാദ്',
    or: 'ହାଇଦ୍ରାବାଦ',
    pa: 'ਹੈਦਰਾਬਾਦ',
    as: 'হায়দৰাবাদ',
    ne: 'हैदराबाद',
  },
  'Bengaluru Urban': {
    en: 'Bengaluru Urban',
    hi: 'बेंगलुरु शहरी',
    te: 'బెంగళూరు అర్బన్',
    ta: 'பெங்களூரு நகர்ப்புறம்',
    kn: 'ಬೆಂಗಳೂರು ನಗರ',
    mr: 'बंगळुरू शहर',
    bn: 'বেঙ্গালুরু শহর',
    gu: 'બેંગલુરુ શહેરી',
    ml: 'ബെംഗളൂരു അർബൻ',
    or: 'ବେଙ୍ଗାଲୁରୁ ସହରାଞ୍ଚଳ',
    pa: 'ਬੈਂਗਲੁਰੂ ਸ਼ਹਿਰੀ',
    as: 'বেংগালুৰু নগৰীয়া',
    ne: 'बेङ्गलोर शहरी',
  },
  Bengaluru: {
    en: 'Bengaluru',
    hi: 'बेंगलुरु',
    te: 'బెంగళూరు',
    ta: 'பெங்களூரு',
    kn: 'ಬೆಂಗಳೂರು',
    mr: 'बंगळुरू',
    bn: 'বেঙ্গালুরু',
    gu: 'બેંગલુરુ',
    ml: 'ബെംഗളൂരു',
    or: 'ବେଙ୍ଗାଲୁରୁ',
    pa: 'ਬੈਂਗਲੁਰੂ',
    as: 'বেংগালুৰু',
    ne: 'बेङ्गलोर',
  },
  Rangareddy: {
    en: 'Rangareddy',
    hi: 'रंगारेड्डी',
    te: 'రంగారెడ్డి',
    ta: 'ரங்காரெட்டி',
    kn: 'ರಂಗಾರೆಡ್ಡಿ',
    mr: 'रंगारेड्डी',
    bn: 'রঙ্গারেড্ডি',
    gu: 'રંગારેડ્ડી',
    ml: 'രംഗറെഡ്ഡി',
    or: 'ରଙ୍ଗାରେଡ୍ଡି',
    pa: 'ਰੰਗਾਰੈੱਡੀ',
    as: 'ৰঙ্গৰেড্ডী',
    ne: 'रङ्गारेड्डी',
  },
  Warangal: {
    en: 'Warangal',
    hi: 'वारंगल',
    te: 'వరంగల్',
    ta: 'வாரங்கல்',
    kn: 'ವಾರಂಗಲ್',
    mr: 'वारंगळ',
    bn: 'ওয়ারাঙ্গল',
    gu: 'વારંગલ',
    ml: 'വാറങ്കൽ',
    or: 'ୱାରଙ୍ଗଲ',
    pa: 'ਵਾਰੰਗਲ',
    as: 'ৱাৰাংগাল',
    ne: 'वारङ्गल',
  },
  Karimnagar: {
    en: 'Karimnagar',
    hi: 'करीमनगर',
    te: 'కరీంనగర్',
    ta: 'கரீம்நகர்',
    kn: 'ಕರೀಂನಗರ',
    mr: 'करीमनगर',
    bn: 'করিমগর',
    gu: 'કરીમનગર',
    ml: 'കരിംനഗർ',
    or: 'କରିମନଗର',
    pa: 'ਕਰੀਮਨਗਰ',
    as: 'কৰিমনাগৰ',
    ne: 'करिमनगर',
  },
  Nizamabad: {
    en: 'Nizamabad',
    hi: 'निज़ामाबाद',
    te: 'నిజామాబాద్',
    ta: 'நிஜாமாபாத்',
    kn: 'ನಿಜಾಮಾಬಾದ್',
    mr: 'निझामाबाद',
    bn: 'নিজামাবাদ',
    gu: 'નિઝામાબાદ',
    ml: 'નિસામાબાદ',
    or: 'ନିଜାମାବାଦ',
    pa: 'ਨਿਜ਼ਾਮਾਬਾਦ',
    as: 'নিজামাবাদ',
    ne: 'निजामाबाद',
  },
};

const STATES: Record<string, Record<SupportedLang, string>> = {
  TS: {
    en: 'Telangana',
    hi: 'तेलंगाना',
    te: 'తెలంగాణ',
    ta: 'தெலுங்கானா',
    kn: 'ತೆಲಂಗಾಣ',
    mr: 'तेलंगणा',
    bn: 'তেলেঙ্গানা',
    gu: 'તેલંગાણા',
    ml: 'തെലങ്കാന',
    or: 'ତେଲେଙ୍ଗାନା',
    pa: 'ਤੇਲੰਗਾਨਾ',
    as: 'তেলেংগানা',
    ne: 'तेलङ्गाना',
  },
  TG: {
    en: 'Telangana',
    hi: 'तेलंगाना',
    te: 'తెలంగాణ',
    ta: 'தெலுங்கானா',
    kn: 'ತೆಲಂಗಾಣ',
    mr: 'तेलंगणा',
    bn: 'তেলেঙ্গানা',
    gu: 'તેલંગાણા',
    ml: 'തെലങ്കാന',
    or: 'ତେଲେଙ୍ଗାନା',
    pa: 'ਤੇਲੰਗਾਨਾ',
    as: 'তেলেংগানা',
    ne: 'तेलङ्गाना',
  },
  Telangana: {
    en: 'Telangana',
    hi: 'तेलंगाना',
    te: 'తెలంగాణ',
    ta: 'தெலுங்கானா',
    kn: 'ತೆಲಂಗಾಣ',
    mr: 'तेलंगणा',
    bn: 'তেলেঙ্গানা',
    gu: 'તેલંગાણા',
    ml: 'തെലങ്കാന',
    or: 'ତେଲେଙ୍ଗାନା',
    pa: 'ਤੇਲੰਗਾਨਾ',
    as: 'তেলেংগানা',
    ne: 'तेलङ्गाना',
  },
  KA: {
    en: 'Karnataka',
    hi: 'कर्नाटक',
    te: 'కర్ణాటక',
    ta: 'கர்நாடகா',
    kn: 'ಕರ್ನಾಟಕ',
    mr: 'कर्नाटक',
    bn: 'কর্ণাটক',
    gu: 'કર્ણાટક',
    ml: 'കർണാടക',
    or: 'କର୍ଣ୍ଣାଟକ',
    pa: 'ਕਰਨਾਟਕ',
    as: 'কৰ্ণাটক',
    ne: 'कर्नाटक',
  },
  Karnataka: {
    en: 'Karnataka',
    hi: 'कर्नाटक',
    te: 'కర్ణాటక',
    ta: 'கர்நாடகா',
    kn: 'ಕರ್ನಾಟಕ',
    mr: 'कर्नाटक',
    bn: 'কর্ণাটক',
    gu: 'કર્ણાટક',
    ml: 'കർണാടക',
    or: 'କର୍ଣ୍ଣାଟକ',
    pa: 'ਕਰਨਾਟਕ',
    as: 'কৰ্ণাটক',
    ne: 'कर्नाटक',
  },
  AP: {
    en: 'Andhra Pradesh',
    hi: 'आंध्र प्रदेश',
    te: 'ఆంధ్రప్రదేశ్',
    ta: 'ஆந்திர பிரதேசம்',
    kn: 'ಆಂಧ್ರ ಪ್ರದೇಶ',
    mr: 'आंध्र प्रदेश',
    bn: 'অন্ধ্র প্রদেশ',
    gu: 'આંધ્ર પ્રદેશ',
    ml: 'ആന്ധ്രാപ്രദേശ്',
    or: 'ଆନ୍ଧ୍ର ପ୍ରଦେଶ',
    pa: 'ਆਂਧਰਾ ਪ੍ਰਦੇਸ਼',
    as: 'অন্ধ্ৰ প্ৰদেশ',
    ne: 'आन्ध्र प्रदेश',
  },
  MH: {
    en: 'Maharashtra',
    hi: 'महाराष्ट्र',
    te: 'మహారాష్ట్ర',
    ta: 'மகாராஷ்டிரா',
    kn: 'ಮಹಾರಾಷ್ಟ್ರ',
    mr: 'महाराष्ट्र',
    bn: 'মহারাষ্ট্র',
    gu: 'મહારાષ્ટ્ર',
    ml: 'മഹാരാഷ്ട്ര',
    or: 'ମହାରାଷ୍ଟ୍ର',
    pa: 'ਮਹਾਰਾਸ਼ਟਰ',
    as: 'মহাৰাষ্ট্ৰ',
    ne: 'महाराष्ट्र',
  },
  DL: {
    en: 'Delhi',
    hi: 'दिल्ली',
    te: 'ఢిల్లీ',
    ta: 'டெல்லி',
    kn: 'ದೆಹಲಿ',
    mr: 'दिल्ली',
    bn: 'দিল্লি',
    gu: 'દિલ્હી',
    ml: 'ഡൽഹി',
    or: 'ଦିଲ୍ଲୀ',
    pa: 'ਦਿੱਲੀ',
    as: 'দিল্লী',
    ne: 'दिल्ली',
  },
};

const REPORTERS: Record<string, Record<SupportedLang, string>> = {
  'Kavitha Reddy': {
    en: 'Kavitha Reddy',
    hi: 'कविता रेड्डी',
    te: 'కవితా రెడ్డి',
    ta: 'கவிதா ரெட்டி',
    kn: 'ಕವಿತಾ ರೆಡ್ಡಿ',
    mr: 'कविता रेड्डी',
    bn: 'কবিতা রেড্ডি',
    gu: 'કવિતા રેડ્ડી',
    ml: 'കവിതാ റെഡ്ഡി',
    or: 'କବିତା ରେଡ୍ଡୀ',
    pa: 'ਕਵਿਤਾ ਰੈੱਡੀ',
    as: 'কবিতা ৰেড্ডী',
    ne: 'कविता रेड्डी',
  },
  'Sunitha Rao': {
    en: 'Sunitha Rao',
    hi: 'सुनीता राव',
    te: 'సునీతా రావు',
    ta: 'சுனிதா ராவ்',
    kn: 'ಸುನೀತಾ ರಾವ್',
    mr: 'सुनीता राव',
    bn: 'সুনীতা রাও',
    gu: 'સુનીતા રાવ',
    ml: 'സുനിത റാവു',
    or: 'ସୁନୀତା ରାଓ',
    pa: 'ਸੁਨੀਤਾ ਰਾਵ',
    as: 'সুনীতা ৰাও',
    ne: 'सुनीता राव',
  },
  'Anil Kumar': {
    en: 'Anil Kumar',
    hi: 'अनिल कुमार',
    te: 'అనిల్ కుమార్',
    ta: 'அனில் குமார்',
    kn: 'ಅನಿಲ್ ಕುಮಾರ್',
    mr: 'अनिल कुमार',
    bn: 'অনিল কুমার',
    gu: 'અનિલ કુમાર',
    ml: 'അനിൽ കുമാർ',
    or: 'ଅନିଲ କୁମାର',
    pa: 'ਅਨਿਲ ਕੁਮਾਰ',
    as: 'অনিল কুমাৰ',
    ne: 'अनिल कुमार',
  },
  'Ground Report — KA': {
    en: 'Ground Report — Karnataka',
    hi: 'ग्राउंड रिपोर्ट — कर्नाटक',
    te: 'గ్రౌండ్ రిపోర్ట్ — కర్ణాటక',
    ta: 'கிரவுண்ட் ரிப்போர்ட் — கர்நாடகா',
    kn: 'ಗ್ರೌಂಡ್ ರಿಪೋರ್ಟ್ — ಕರ್ನಾಟಕ',
    mr: 'ग्राउंड रिपोर्ट — कर्नाटक',
    bn: 'গ্রাউন্ড রিপোর্ট — কর্ণাটক',
    gu: 'ગ્રાઉન્ડ રિપોર્ટ — કર્ણાટક',
    ml: 'ഗ്രൗണ്ട് റിപ്പോർട്ട് — കർണാടക',
    or: 'ଗ୍ରାଉଣ୍ଡ ରିପୋର୍ଟ — କର୍ଣ୍ଣାଟକ',
    pa: 'ਗਰਾਊਂਡ ਰਿਪੋਰਟ — ਕਰਨਾਟਕ',
    as: 'গ্ৰাউণ্ড ৰিপোৰ্ট — কৰ্ণাটক',
    ne: 'ग्राउन्ड रिपोर्ट — कर्नाटक',
  },
  'Citizen Reporter': {
    en: 'Citizen Reporter',
    hi: 'नागरिक रिपोर्टर',
    te: 'పౌర రిపోర్టర్',
    ta: 'குடிமக்கள் நிருபர்',
    kn: 'ನಾಗರಿಕ ವರದಿಗಾರ',
    mr: 'नागरिक बातमीदार',
    bn: 'নাগরিক প্রতিবেদক',
    gu: 'નાગરિક રિપોર્ટર',
    ml: 'പൗര റിപ്പോർട്ടർ',
    or: 'ନାଗରିକ ରିପୋର୍ଟର',
    pa: 'ਨਾਗਰਿਕ ਰਿਪੋਰਟਰ',
    as: 'নাগৰিক প্ৰতিবেদক',
    ne: 'नागरिक रिपोर्टर',
  },
  'You (Citizen)': {
    en: 'You (Citizen)',
    hi: 'आप (नागरिक)',
    te: 'మీరు (పౌరుడు)',
    ta: 'நீங்கள் (குடிமகன்)',
    kn: 'ನೀವು (ನಾಗರಿಕ)',
    mr: 'तुम्ही (नागरिक)',
    bn: 'আপনি (নাগরিক)',
    gu: 'તમે (નાગરિક)',
    ml: 'നിങ്ങൾ (പൗരൻ)',
    or: 'ଆପଣ (ନାଗରିକ)',
    pa: 'ਤੁਸੀਂ (ਨਾਗਰਿਕ)',
    as: 'আপুনি (নাগৰিক)',
    ne: 'तपाईं (नागरिक)',
  },
};

const ORGANIZATIONS: Record<string, Record<SupportedLang, string>> = {
  'Deccan Chronicle': {
    en: 'Deccan Chronicle',
    hi: 'डेक्कन क्रॉनिकल',
    te: 'డెక్కన్ క్రానికల్',
    ta: 'டெக்கான் குரோனிகல்',
    kn: 'ಡೆಕ್ಕನ್ ಕ್ರಾನಿಕಲ್',
    mr: 'डेक्कन क्रॉनिकल',
    bn: 'ডেকান ক্রনিকল',
    gu: 'ડેક્કન ક્રોનિકલ',
    ml: 'ഡെക്കാൺ ക്രോണിക്കിൾ',
    or: 'ଡେକାନ କ୍ରୋନିକଲ',
    pa: 'ਡੈੱਕਨ ਕ੍ਰੋਨੀਕਲ',
    as: 'ডেকান ক্ৰনিকল',
    ne: 'डेक्कन क्रोनिकल',
  },
};

function normalizeLang(lang?: string): SupportedLang {
  if (!lang) return 'en';
  const clean = lang.split('-')[0].toLowerCase() as SupportedLang;
  const valid: SupportedLang[] = [
    'en', 'te', 'hi', 'kn', 'mr', 'ta', 'ml', 'bn', 'gu', 'pa', 'or', 'as', 'ne',
  ];
  return valid.includes(clean) ? clean : 'en';
}

export function localizeLocality(name?: string | null, lang?: string): string {
  if (!name) return '';
  const l = normalizeLang(lang);
  if (l === 'en') return name;
  return LOCALITIES[name]?.[l] || name;
}

export function localizeDistrict(name?: string | null, lang?: string): string {
  if (!name) return '';
  const l = normalizeLang(lang);
  if (l === 'en') return name;
  return DISTRICTS[name]?.[l] || name;
}

export function localizeState(codeOrName?: string | null, lang?: string): string {
  if (!codeOrName) return '';
  const l = normalizeLang(lang);
  if (l === 'en') return STATES[codeOrName]?.en || codeOrName;
  return STATES[codeOrName]?.[l] || codeOrName;
}

export function localizeReporterName(name?: string | null, lang?: string): string {
  if (!name) return '';
  const l = normalizeLang(lang);
  if (l === 'en') return name;
  return REPORTERS[name]?.[l] || name;
}

export function localizeOrgName(name?: string | null, lang?: string): string {
  if (!name) return '';
  const l = normalizeLang(lang);
  if (l === 'en') return name;
  return ORGANIZATIONS[name]?.[l] || name;
}

/**
 * Formats a live news headline.
 * In English: `${category} in ${location}`
 * In Indian languages: `${category} — ${location}` (standard Indian broadcast ticker format)
 */
export function formatLiveHeadline(
  categoryLabel: string,
  locationLabel?: string | null,
  lang?: string,
): string {
  if (!locationLabel) return categoryLabel;
  const l = normalizeLang(lang);
  if (l === 'en') {
    return `${categoryLabel} in ${locationLabel}`;
  }
  return `${categoryLabel} — ${locationLabel}`;
}

/**
 * Formats the bottom location line.
 * e.g. "Hyderabad, TS" -> "हैदराबाद, तेलंगाना" in Hindi, "హైదరాబాద్, తెలంగాణ" in Telugu.
 */
export function formatLocationText(
  districtName?: string | null,
  stateCode?: string | null,
  lang?: string,
  fallback: string = 'Location unavailable',
): string {
  const l = normalizeLang(lang);
  const dist = localizeDistrict(districtName, l);
  const state = localizeState(stateCode, l);
  const parts = [dist, state].filter(Boolean);
  if (parts.length === 0) return fallback;
  return parts.join(', ');
}
