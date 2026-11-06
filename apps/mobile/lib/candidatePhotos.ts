/**
 * Candidate Photo Service — 4-Tier Pipeline
 * ─────────────────────────────────────────────────────────────────────
 * Priority:
 *  1. Static scraped map (MyNeta + Official Legislature sites) — bundled JSON, instant
 *  2. Wikipedia REST API — runtime fetch for ~100 notable politicians, cached
 *  3. Initials with party-colored background — last resort
 *
 * The static map is populated by running:
 *   npx ts-node scripts/scrape-candidate-photos.ts
 *
 * This generates data/candidate-photo-map.json which is bundled with the app.
 */

import { mmkv, isMMKVAvailable } from './storage';

/**
 * Normalise a candidate name for lookup: lowercase, collapse whitespace,
 * strip dots/commas, trim.
 */
function normaliseName(name: string): string {
  if (!name) return '';
  return name.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
}

// ── Dynamic photo map (pre-indexed with 4,600+ verified politician photos, cached in MMKV) ────
const PHOTO_CACHE_PREFIX = 'cand_photo:';
const STATIC_PHOTO_MAP: Record<string, string> = {};

try {
  // Use require to avoid huge TS compiler AST overhead on large static JSON
  const candidatePhotoMap: Record<string, string> = require('../data/candidate-photo-map.json');
  if (candidatePhotoMap && typeof candidatePhotoMap === 'object') {
    for (const [rawName, rawUrl] of Object.entries(candidatePhotoMap)) {
      if (typeof rawUrl === 'string' && rawUrl.startsWith('http')) {
        STATIC_PHOTO_MAP[rawName] = rawUrl;
        const norm = normaliseName(rawName);
        if (norm) {
          STATIC_PHOTO_MAP[norm] = rawUrl;
        }
      }
    }
  }
} catch {
  // Fallback to empty map if file is not found
}

/**
 * Curated high-resolution static portraits for the Prime Minister,
 * Chief Ministers of all Indian States & UTs, and key political figures.
 * These load instantaneously with zero network latency.
 */
export const STATIC_LEADER_PHOTOS: Record<string, string> = {
  // Prime Minister of India
  'Narendra Modi': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Narendra_Modi_Portrait_2026.jpg/330px-Narendra_Modi_Portrait_2026.jpg',

  // Chief Ministers
  'Anumula Revanth Reddy': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Telangana_CM_Revanth_Reddy_at_Gaddar_Awards_2025_-_1.jpg/330px-Telangana_CM_Revanth_Reddy_at_Gaddar_Awards_2025_-_1.jpg',
  'A. Revanth Reddy': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Telangana_CM_Revanth_Reddy_at_Gaddar_Awards_2025_-_1.jpg/330px-Telangana_CM_Revanth_Reddy_at_Gaddar_Awards_2025_-_1.jpg',
  'Revanth Reddy': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Telangana_CM_Revanth_Reddy_at_Gaddar_Awards_2025_-_1.jpg/330px-Telangana_CM_Revanth_Reddy_at_Gaddar_Awards_2025_-_1.jpg',

  'N. Chandrababu Naidu': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/The_portrait_of_CM_Shri_Nara_Chandrababu_Naidu.jpg/330px-The_portrait_of_CM_Shri_Nara_Chandrababu_Naidu.jpg',
  'N Chandrababu Naidu': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/The_portrait_of_CM_Shri_Nara_Chandrababu_Naidu.jpg/330px-The_portrait_of_CM_Shri_Nara_Chandrababu_Naidu.jpg',
  'Chandrababu Naidu': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/The_portrait_of_CM_Shri_Nara_Chandrababu_Naidu.jpg/330px-The_portrait_of_CM_Shri_Nara_Chandrababu_Naidu.jpg',

  'Siddaramaiah': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ac/Siddaramaiah_at_the_function_to_commemorate_the_serving_of_2_billion_meals_of_the_Akshaya_Patra_Foundation_in_Karnataka_%28cropped%29.jpg/330px-Siddaramaiah_at_the_function_to_commemorate_the_serving_of_2_billion_meals_of_the_Akshaya_Patra_Foundation_in_Karnataka_%28cropped%29.jpg',
  'D. K. Shivakumar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/D._K._Shivakumar.jpg/330px-D._K._Shivakumar.jpg',
  'D.K. Shivakumar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/D._K._Shivakumar.jpg/330px-D._K._Shivakumar.jpg',

  'C. Joseph Vijay': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Vijay_at_the_Nadigar_Sangam_Protest.jpg/330px-Vijay_at_the_Nadigar_Sangam_Protest.jpg',
  'Joseph Vijay': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Vijay_at_the_Nadigar_Sangam_Protest.jpg/330px-Vijay_at_the_Nadigar_Sangam_Protest.jpg',

  'V. D. Satheesan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/V_D_Satheesan.jpg/330px-V_D_Satheesan.jpg',
  'V.D. Satheesan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/V_D_Satheesan.jpg/330px-V_D_Satheesan.jpg',

  'Suvendu Adhikari': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Suvendu_Adhikari_at_a_rally_in_Nandigram_04_%28cropped%29.jpg/330px-Suvendu_Adhikari_at_a_rally_in_Nandigram_04_%28cropped%29.jpg',

  'Devendra Fadnavis': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Shri_Devendra_Gangadharrao_Fadnavis.jpg/330px-Shri_Devendra_Gangadharrao_Fadnavis.jpg',
  'Eknath Shinde': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Eknath_Shinde_2022.jpg/330px-Eknath_Shinde_2022.jpg',

  'M. K. Stalin': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9d/The_Chief_Minister_of_Tamil_Nadu%2C_Thiru_MK_Stalin.jpg/330px-The_Chief_Minister_of_Tamil_Nadu%2C_Thiru_MK_Stalin.jpg',
  'M.K. Stalin': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9d/The_Chief_Minister_of_Tamil_Nadu%2C_Thiru_MK_Stalin.jpg/330px-The_Chief_Minister_of_Tamil_Nadu%2C_Thiru_MK_Stalin.jpg',

  'Pinarayi Vijayan': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Chief_Minister_Pinarayi_Vijayan_2023.jpg/330px-Chief_Minister_Pinarayi_Vijayan_2023.jpg',

  'Mamata Banerjee': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4d/Official_portrait_of_Mamata_Banerjee.jpg/330px-Official_portrait_of_Mamata_Banerjee.jpg',

  'Yogi Adityanath': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/Yogi_Adityanath_2026.jpg/330px-Yogi_Adityanath_2026.jpg',

  'Bhajan Lal Sharma': 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Bhajan_Lal_Sharma_and_deputies_meets_VP_of_India.jpg',

  'Bhupendra Patel': 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Bhupendra_Patel_%28cropped%29.jpg',

  'Atishi': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Moments_of_Lieutenant_Governor_and_Chief_Minister_%28cropped%29.jpg/330px-Moments_of_Lieutenant_Governor_and_Chief_Minister_%28cropped%29.jpg',
  'Rekha Gupta': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Moments_of_Lieutenant_Governor_and_Chief_Minister_%28cropped%29.jpg/330px-Moments_of_Lieutenant_Governor_and_Chief_Minister_%28cropped%29.jpg',

  'Mohan Charan Majhi': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Shri_Mohan_Charan_Majhi.jpg/330px-Shri_Mohan_Charan_Majhi.jpg',

  'Hemant Soren': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Hemant_Soren_2024.jpg/330px-Hemant_Soren_2024.jpg',

  'Nitish Kumar': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Nitish_Kumar_August_2026.jpg/330px-Nitish_Kumar_August_2026.jpg',

  'Bhagwant Mann': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Bhagwant_Mann_2026.jpg/330px-Bhagwant_Mann_2026.jpg',

  'Nayab Singh Saini': 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Nayab_Singh_Saini_October_2024.jpg',

  'Pushkar Singh Dhami': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Pushkar_Singh_Dhami%2C_Chief_Minister_of_Uttarakhand.jpg/330px-Pushkar_Singh_Dhami%2C_Chief_Minister_of_Uttarakhand.jpg',

  'Vishnu Deo Sai': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Vishnu_Deo_Sai%2C_Chief_Minister_of_Chhattisgarh.jpg/330px-Vishnu_Deo_Sai%2C_Chief_Minister_of_Chhattisgarh.jpg',

  'Mohan Yadav': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Mohan_Yadav%2C_Chief_Minister_of_Madhya_Pradesh.jpg/330px-Mohan_Yadav%2C_Chief_Minister_of_Madhya_Pradesh.jpg',

  'Himanta Biswa Sarma': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8c/Himanta_Biswa_Sarma_in_2026.jpg/330px-Himanta_Biswa_Sarma_in_2026.jpg',

  'Pramod Sawant': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9e/Pramod_Sawant_at_the_inauguration_of_the_Chhatrapati_Shivaji_Maharaj_Chair_in_Goa_University_%28cropped%29.jpg/330px-Pramod_Sawant_at_the_inauguration_of_the_Chhatrapati_Shivaji_Maharaj_Chair_in_Goa_University_%28cropped%29.jpg',

  'Sukhvinder Singh Sukhu': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Sukhvinder_Singh_Sukhu.jpg/330px-Sukhvinder_Singh_Sukhu.jpg',

  'Omar Abdullah': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/68/Omar_Abdullah%2C_Chief_Minister_of_Jammu_%26_Kashmir.jpg/330px-Omar_Abdullah%2C_Chief_Minister_of_Jammu_%26_Kashmir.jpg',

  'N. Biren Singh': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/02/The_Chief_Minister_of_Manipur%2C_Shri_Biren_Singh_calling_on_the_Vice_President%2C_Shri_M._Venkaiah_Naidu%2C_in_New_Delhi_on_September_06%2C_2017_%28cropped%29.jpg/330px-The_Chief_Minister_of_Manipur%2C_Shri_Biren_Singh_calling_on_the_Vice_President%2C_Shri_M._Venkaiah_Naidu%2C_in_New_Delhi_on_September_06%2C_2017_%28cropped%29.jpg',

  'Conrad Sangma': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Conrad_Sangma_%28cropped%29.jpg/330px-Conrad_Sangma_%28cropped%29.jpg',

  'Lalduhoma': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Lalduhoma.jpg/330px-Lalduhoma.jpg',

  'Neiphiu Rio': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4d/Neiphiu_Rio.jpg/330px-Neiphiu_Rio.jpg',

  'Manik Saha': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Dr._Manik_Saha.jpg/330px-Dr._Manik_Saha.jpg',

  'Prem Singh Tamang': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Prem_Singh_Tamang%2C_Chief_Minister_of_Sikkim.jpg',

  'Pema Khandu': 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Pema_Khandu_in_2018.jpg',

  'N. Rangaswamy': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/N._Rangaswamy_%28cropped%29.jpg/330px-N._Rangaswamy_%28cropped%29.jpg',

  // Additional National Leaders
  'Rahul Gandhi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Rahul_Gandhi_in_2023.jpg/330px-Rahul_Gandhi_in_2023.jpg',
  'Amit Shah': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Amit_Shah_in_2024.jpg/330px-Amit_Shah_in_2024.jpg',
  'Rajnath Singh': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Rajnath_Singh_in_2023.jpg/330px-Rajnath_Singh_in_2023.jpg',
  'Nitin Gadkari': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Nitin_Gadkari_in_2024.jpg/330px-Nitin_Gadkari_in_2024.jpg',
  'Mallikarjun Kharge': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Mallikarjun_Kharge_in_2023.jpg/330px-Mallikarjun_Kharge_in_2023.jpg',
  'Asaduddin Owaisi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Asaduddin_Owaisi_in_2023.jpg/330px-Asaduddin_Owaisi_in_2023.jpg',
  'Pawan Kalyan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Pawan_Kalyan_2024.jpg/330px-Pawan_Kalyan_2024.jpg',
  'Nara Lokesh': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Nara_Lokesh_in_2024.jpg/330px-Nara_Lokesh_in_2024.jpg',
  'K. Chandrashekar Rao': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/K._Chandrashekar_Rao.jpg/330px-K._Chandrashekar_Rao.jpg',
  'K.T. Rama Rao': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/K._T._Rama_Rao_in_2023.jpg/330px-K._T._Rama_Rao_in_2023.jpg',
  'T. Harish Rao': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/T._Harish_Rao.jpg/330px-T._Harish_Rao.jpg',
  'Y.S. Jagan Mohan Reddy': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Y._S._Jagan_Mohan_Reddy_in_2024.jpg/330px-Y._S._Jagan_Mohan_Reddy_in_2024.jpg',
  'Palvai Harish Babu': 'https://www.myneta.info/images_candidate/Telangana2023/bb9e743621635e6661dd738aadbf27e7577411f4.jpg',
  'Koneru Konappa': 'https://www.myneta.info/images_candidate/Telangana2023/0bde6c67481fefa18c48f7a16e15dc2ec8b4042b.jpg',
  'Nalamada Uttam Kumar Reddy': 'https://www.myneta.info/images_candidate/Telangana2023/8affd3c15179952f38acf9cdbfa961c0e361b957.jpg',
  'Shanampudi Saidi Reddy': 'https://www.myneta.info/images_candidate/Telangana2023/8d862a898684c1048c70c32201a2ee29c9898621.jpg',
  'Shanampudi Saidireddy': 'https://www.myneta.info/images_candidate/Telangana2023/8d862a898684c1048c70c32201a2ee29c9898621.jpg',
  'Sharad Pawar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Sharad_Pawar_in_2023.jpg/330px-Sharad_Pawar_in_2023.jpg',
  'Uddhav Thackeray': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Uddhav_Thackeray_in_2023.jpg/330px-Uddhav_Thackeray_in_2023.jpg',
  'Akhilesh Yadav': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Akhilesh_Yadav_in_2024.jpg/330px-Akhilesh_Yadav_in_2024.jpg',
};

export function getCachedCandidatePhoto(name: string): string | undefined {
  const norm = normaliseName(name);
  if (STATIC_PHOTO_MAP[norm]) return STATIC_PHOTO_MAP[norm];
  if (isMMKVAvailable && mmkv) {
    const cached = mmkv.getString(PHOTO_CACHE_PREFIX + norm);
    if (cached) {
      STATIC_PHOTO_MAP[norm] = cached;
      return cached;
    }
  }
  return undefined;
}

export function setCachedCandidatePhoto(name: string, url: string): void {
  const norm = normaliseName(name);
  STATIC_PHOTO_MAP[norm] = url;
  if (isMMKVAvailable && mmkv) {
    mmkv.set(PHOTO_CACHE_PREFIX + norm, url);
  }
}

/**
 * Curated mapping: Candidate Name → Wikipedia Article Title
 * Only notable politicians with Wikipedia articles are included.
 */
export const WIKIPEDIA_ARTICLES: Record<string, string> = {
  // ── National ──
  'Narendra Modi': 'Narendra_Modi',
  'Amit Shah': 'Amit_Shah',
  'Rajnath Singh': 'Rajnath_Singh',
  'Nitin Gadkari': 'Nitin_Gadkari',
  'Nirmala Sitharaman': 'Nirmala_Sitharaman',
  'S. Jaishankar': 'S._Jaishankar',
  'Smriti Irani': 'Smriti_Irani',
  'Rahul Gandhi': 'Rahul_Gandhi',
  'Sonia Gandhi': 'Sonia_Gandhi',
  'Mallikarjun Kharge': 'Mallikarjun_Kharge',

  // ── Telangana ──
  'A. Revanth Reddy': 'Anumula_Revanth_Reddy',
  'Revanth Reddy': 'Anumula_Revanth_Reddy',
  'K. Chandrashekar Rao': 'K._Chandrashekar_Rao',
  'K.T. Rama Rao': 'K._T._Rama_Rao',
  'T. Harish Rao': 'T._Harish_Rao',
  'Bhatti Vikramarka': 'Bhatti_Vikramarka',
  'Eatala Rajender': 'Eatala_Rajender',
  'Asaduddin Owaisi': 'Asaduddin_Owaisi',
  'G. Kishan Reddy': 'G._Kishan_Reddy',
  'Bandi Sanjay Kumar': 'Bandi_Sanjay_Kumar',
  'D. Sridhar Babu': 'D._Sridhar_Babu',
  'Konda Surekha': 'Konda_Surekha',
  'Nama Nageswara Rao': 'Nama_Nageswara_Rao',

  // ── Andhra Pradesh ──
  'N. Chandrababu Naidu': 'N._Chandrababu_Naidu',
  'Chandrababu Naidu': 'N._Chandrababu_Naidu',
  'Y.S. Jagan Mohan Reddy': 'Y._S._Jagan_Mohan_Reddy',
  'Jagan Mohan Reddy': 'Y._S._Jagan_Mohan_Reddy',
  'Pawan Kalyan': 'Pawan_Kalyan',
  'Nara Lokesh': 'Nara_Lokesh',
  'K. Atchannaidu': 'Kinjarapu_Atchannaidu',
  'Botcha Satyanarayana': 'Botcha_Satyanarayana',

  // ── Karnataka ──
  'Siddaramaiah': 'Siddaramaiah',
  'D.K. Shivakumar': 'D._K._Shivakumar',
  'B.S. Yediyurappa': 'B._S._Yediyurappa',
  'H.D. Kumaraswamy': 'H._D._Kumaraswamy',
  'B.Y. Raghavendra': 'B._Y._Raghavendra',
  'R. Ashoka': 'R._Ashok',
  'Pralhad Joshi': 'Pralhad_Joshi',
  'Basavaraj Bommai': 'Basavaraj_Bommai',

  // ── Maharashtra ──
  'Devendra Fadnavis': 'Devendra_Fadnavis',
  'Eknath Shinde': 'Eknath_Shinde',
  'Ajit Pawar': 'Ajit_Pawar',
  'Uddhav Thackeray': 'Uddhav_Thackeray',
  'Aaditya Thackeray': 'Aaditya_Thackeray',
  'Sharad Pawar': 'Sharad_Pawar',
  'Supriya Sule': 'Supriya_Sule',

  // ── Tamil Nadu ──
  'C. Joseph Vijay': 'Vijay_(actor)',
  'Joseph Vijay': 'Vijay_(actor)',
  'M.K. Stalin': 'M._K._Stalin',
  'Edappadi K. Palaniswami': 'Edappadi_K._Palaniswami',
  'K. Annamalai': 'K._Annamalai',
  'Udhayanidhi Stalin': 'Udhayanidhi_Stalin',
  'O. Panneerselvam': 'O._Panneerselvam',
  'T.R. Baalu': 'T._R._Baalu',
  'Kanimozhi': 'Kanimozhi',
  'Dayanidhi Maran': 'Dayanidhi_Maran',

  // ── Kerala ──
  'Pinarayi Vijayan': 'Pinarayi_Vijayan',
  'V.D. Satheesan': 'V._D._Satheesan',
  'V. D. Satheesan': 'V._D._Satheesan',
  'K. Sudhakaran': 'K._Sudhakaran',
  'Shashi Tharoor': 'Shashi_Tharoor',
  'E. Sreedharan': 'E._Sreedharan',

  // ── West Bengal ──
  'Mamata Banerjee': 'Mamata_Banerjee',
  'Suvendu Adhikari': 'Suvendu_Adhikari',
  'Dilip Ghosh': 'Dilip_Ghosh',
  'Abhishek Banerjee': 'Abhishek_Banerjee_(politician)',

  // ── Uttar Pradesh ──
  'Yogi Adityanath': 'Yogi_Adityanath',
  'Akhilesh Yadav': 'Akhilesh_Yadav',
  'Mayawati': 'Mayawati',
  'Keshav Prasad Maurya': 'Keshav_Prasad_Maurya',
  'Brajesh Pathak': 'Brajesh_Pathak',
  'Azam Khan': 'Azam_Khan_(politician)',

  // ── Puducherry ──
  'N. Rangaswamy': 'N._Rangaswamy',
};

// ── In-memory caches ─────────────────────────────────────────────────
const photoCache = new Map<string, string>();
const failedNames = new Set<string>();
let pendingCount = 0;
const MAX_CONCURRENT = 8;
const requestQueue: (() => void)[] = [];

function processQueue() {
  while (pendingCount < MAX_CONCURRENT && requestQueue.length > 0) {
    const next = requestQueue.shift();
    if (next) next();
  }
}

/**
 * Look up a photo from the static curated leaders map or scraped map.
 * Returns the photo URL or undefined if not found.
 */
export function getStaticPhoto(name: string): string | undefined {
  if (!name) return undefined;

  // 1. Check exact key in curated leaders map
  if (STATIC_LEADER_PHOTOS[name]) return STATIC_LEADER_PHOTOS[name];

  // 2. Check normalised key in curated leaders map
  const norm = normaliseName(name);
  for (const [key, url] of Object.entries(STATIC_LEADER_PHOTOS)) {
    if (normaliseName(key) === norm) return url;
  }

  // 3. Try dynamic cache first, then exact or normalised key in static photo map
  const url = getCachedCandidatePhoto(name) ?? STATIC_PHOTO_MAP[name] ?? STATIC_PHOTO_MAP[norm];
  if (!url) return undefined;
  // Skip SVG URLs — React Native Image cannot render SVG
  if (url.includes('.svg')) return undefined;
  return url;
}

/**
 * Auto-generate a Wikipedia article title from a candidate name.
 * Most Indian politician pages follow: "Firstname Lastname" → "Firstname_Lastname"
 */
function guessWikiArticle(name: string): string {
  return name.replace(/\s+/g, '_');
}

/**
 * Fetch the Wikipedia thumbnail for a politician.
 * ONLY fetches for candidates in the curated WIKIPEDIA_ARTICLES map.
 * Results are cached; failed lookups are not retried.
 */
export async function fetchWikipediaPhoto(name: string): Promise<string | null> {
  if (photoCache.has(name)) return photoCache.get(name) ?? null;
  if (failedNames.has(name)) return null;

  // ONLY fetch for candidates in the curated list — guessing causes wrong photos
  const article = WIKIPEDIA_ARTICLES[name];
  if (!article) {
    failedNames.add(name);
    return null;
  }

  return new Promise<string | null>((resolve) => {
    const doFetch = async () => {
      pendingCount++;
      try {
        const resp = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(article)}`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'PoligramApp/1.0 (https://kshetra.app; contact@kshetra.app)',
            },
          },
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const url = data?.thumbnail?.source;
        // Validate: must have a thumbnail and be about a person (not disambiguation)
        const type = data?.type;
        const desc = (data?.description || '').toLowerCase();
        const isPolitician = /politician|minister|chief minister|mla|mp|legislat|member of|governor|cm of/i.test(desc);
        if (url && type !== 'disambiguation' && type !== 'no-extract' && isPolitician) {
          // Filter out map/logo/symbol images
          if (url.includes('Map') || url.includes('map_') || url.includes('Logo') || url.includes('Flag') || url.includes('Seal_of')) {
            failedNames.add(name);
            resolve(null);
          } else {
            photoCache.set(name, url);
            resolve(url);
          }
        } else {
          failedNames.add(name);
          resolve(null);
        }
      } catch {
        failedNames.add(name);
        resolve(null);
      } finally {
        pendingCount--;
        processQueue();
      }
    };

    if (pendingCount < MAX_CONCURRENT) {
      doFetch();
    } else {
      requestQueue.push(doFetch);
    }
  });
}

/**
 * Full candidate photo lookup — 4-tier pipeline.
 * Returns the best available photo URL, or null (= show initials).
 *
 * Priority:
 *  1. Explicit photoUrl passed in (from seed data)
 *  2. Static scraped map (MyNeta / Legislature)
 *  3. Wikipedia REST API (async, cached)
 *  4. null → component shows initials
 */
export async function getCandidatePhoto(
  name: string,
  photoUrl?: string,
): Promise<string | null> {
  // Tier 1: explicit photoUrl from seed data
  if (photoUrl) return photoUrl;

  // Tier 2: static scraped map (instant, bundled)
  const scraped = getStaticPhoto(name);
  if (scraped) return scraped;

  // Tier 3: Wikipedia runtime fetch
  const wiki = await fetchWikipediaPhoto(name);
  if (wiki) return wiki;

  // Tier 4: null — component renders initials
  return null;
}

/**
 * Check if a candidate has any known photo source.
 * Only returns true for candidates in static map or curated Wikipedia list.
 * This prevents incorrect photos from random Wikipedia articles.
 */
export function hasKnownPhoto(name: string): boolean {
  if (getStaticPhoto(name)) return true;
  if (WIKIPEDIA_ARTICLES[name]) return true;
  return false;
}

/**
 * Get cached photo URL (synchronous, no fetch).
 * Checks static map first, then in-memory Wikipedia cache.
 */
export function getCachedPhoto(name: string): string | undefined {
  return getStaticPhoto(name) ?? photoCache.get(name);
}
