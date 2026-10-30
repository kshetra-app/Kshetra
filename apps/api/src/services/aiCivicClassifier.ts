/**
 * POLIGRAM / KSHETRA PLATFORM
 * Domain 8: AI Civic Issue Classifier & Comprehensive Structured Taxonomy (JOB 069)
 * Authority: Master Product Blueprint, Amendment v1.2, Amendment v1.5-A & DEC-192
 */

import { defaultAIRegistry } from './aiProvider';
import type {
  CivicClassificationRequest,
  CivicClassificationResult,
  CivicTaxonomyCategory,
  CivicUrgencyLevel,
  ChatMessage,
} from '@kshetra/shared';

export interface TaxonomyEntry {
  category: CivicTaxonomyCategory;
  subcategory: string;
  department: string;
  keywords: string[];
  patterns: RegExp[];
  baseUrgency: CivicUrgencyLevel;
}

/** Comprehensive, structured civic taxonomy dictionary */
export const COMPREHENSIVE_CIVIC_TAXONOMY: TaxonomyEntry[] = [
  // 1. ROADS & TRAFFIC
  {
    category: 'ROADS_TRAFFIC',
    subcategory: 'pothole',
    department: 'Public Works Department (PWD) / Municipal Road Maintenance',
    keywords: ['pothole', 'potholes', 'crater', 'khadda', 'gaddha', 'broken road', 'asphalt peeled', 'tar road damaged', 'craters on road'],
    patterns: [/\bpotholes?\b/i, /\bcrater(s)?\b/i, /\b(broken|damaged)\s+road\b/i, /\bkhadd[ae]s?\b/i, /\bgaddh[ae]s?\b/i],
    baseUrgency: 'NORMAL',
  },
  {
    category: 'ROADS_TRAFFIC',
    subcategory: 'road_caving',
    department: 'Public Works Department (PWD) / Disaster Response',
    keywords: ['road cave', 'road caving', 'sinkhole', 'cave-in', 'road collapse'],
    patterns: [/\broad\s+cav(ing|ed)\b/i, /\bsinkhole(s)?\b/i, /\broad\s+collapse\b/i],
    baseUrgency: 'EMERGENCY',
  },
  {
    category: 'ROADS_TRAFFIC',
    subcategory: 'traffic_signal',
    department: 'Traffic Police Engineering Wing / Municipal Corporation',
    keywords: ['traffic light', 'traffic signal', 'signal not working', 'red light broken', 'signal blinking amber', 'signal fault'],
    patterns: [/\btraffic\s+(light|signal)\b/i, /\bsignal\s+(broken|fault|not\s+working)\b/i],
    baseUrgency: 'HIGH',
  },
  {
    category: 'ROADS_TRAFFIC',
    subcategory: 'speed_breaker',
    department: 'Public Works Department (PWD) / Road Safety Cell',
    keywords: ['speed breaker', 'unpainted hump', 'illegal speed breaker', 'road hump', 'speed bump'],
    patterns: [/\bspeed\s+breaker(s)?\b/i, /\broad\s+hump(s)?\b/i, /\bunpainted\s+speed\s+breaker\b/i],
    baseUrgency: 'NORMAL',
  },
  {
    category: 'ROADS_TRAFFIC',
    subcategory: 'divider_damage',
    department: 'Public Works Department (PWD)',
    keywords: ['median broken', 'road divider damaged', 'central verge broken', 'divider railing damaged'],
    patterns: [/\b(median|divider)\s+(broken|damaged)\b/i, /\broad\s+divider\b/i],
    baseUrgency: 'NORMAL',
  },
  {
    category: 'ROADS_TRAFFIC',
    subcategory: 'footpath_encroachment',
    department: 'Town Planning & Anti-Encroachment Cell',
    keywords: ['footpath blocked', 'encroachment', 'pavement encroached', 'hawker blocking path', 'vendor blocking road'],
    patterns: [/\b(footpath|pavement)\s+(blocked|encroached)\b/i, /\bencroachment\b/i],
    baseUrgency: 'NORMAL',
  },

  // 2. WATER SUPPLY
  {
    category: 'WATER_SUPPLY',
    subcategory: 'pipeline_burst',
    department: 'Water Supply & Sewerage Board (Jal Board / HMWSSB)',
    keywords: ['pipeline burst', 'pipe leak', 'water gushing', 'broken water pipe', 'main pipeline broken'],
    patterns: [/\bpipe(line)?\s+(burst|leak(ing)?|broken)\b/i, /\bwater\s+gushing\b/i],
    baseUrgency: 'HIGH',
  },
  {
    category: 'WATER_SUPPLY',
    subcategory: 'water_contamination',
    department: 'Water Supply & Sewerage Board / Quality Control Lab',
    keywords: ['dirty water', 'contaminated water', 'muddy water', 'yellowish water', 'foul smelling water', 'polluted drinking water'],
    patterns: [/\b(dirty|contaminated|muddy|foul|smelly)\s+water\b/i, /\bwater\s+contamination\b/i],
    baseUrgency: 'HIGH',
  },
  {
    category: 'WATER_SUPPLY',
    subcategory: 'drinking_water_scarcity',
    department: 'Water Supply & Sewerage Board',
    keywords: ['no water', 'water supply stopped', 'dry tap', 'tanker needed', 'water shortage', 'drinking water scarce'],
    patterns: [/\bno\s+water\b/i, /\bwater\s+(shortage|scarcity|stopped)\b/i, /\bdry\s+tap(s)?\b/i],
    baseUrgency: 'NORMAL',
  },
  {
    category: 'WATER_SUPPLY',
    subcategory: 'low_pressure',
    department: 'Water Supply Distribution Wing',
    keywords: ['low pressure', 'water pressure low', 'booster pump needed', 'trickling water'],
    patterns: [/\blow\s+(water\s+)?pressure\b/i, /\bpressure\s+(is\s+)?low\b/i],
    baseUrgency: 'LOW',
  },

  // 3. DRAINAGE & SEWERAGE
  {
    category: 'DRAINAGE_SEWERAGE',
    subcategory: 'open_manhole',
    department: 'Sewerage & Drainage Division / Disaster Response',
    keywords: ['open manhole', 'manhole cover missing', 'broken manhole', 'uncovered manhole', 'chamber open on road'],
    patterns: [/\bopen\s+manhole(s)?\b/i, /\bmanhole\s+cover\s+missing\b/i, /\buncovered\s+manhole\b/i],
    baseUrgency: 'EMERGENCY',
  },
  {
    category: 'DRAINAGE_SEWERAGE',
    subcategory: 'sewage_overflow',
    department: 'Sewerage Maintenance Division',
    keywords: ['sewage overflow', 'sewer overflow', 'dirty drain overflowing', 'foul smell drain', 'black sewage water'],
    patterns: [/\bsew(age|er)\s+overflow(ing)?\b/i, /\bdrain\s+overflow(ing)?\b/i],
    baseUrgency: 'HIGH',
  },
  {
    category: 'DRAINAGE_SEWERAGE',
    subcategory: 'choked_drain',
    department: 'Stormwater Drainage Wing',
    keywords: ['choked drain', 'blocked nala', 'clogged drain', 'nallah choked', 'plastic blocking gutter'],
    patterns: [/\b(choked|blocked|clogged)\s+(drain|nala|nallah|gutter)\b/i],
    baseUrgency: 'NORMAL',
  },
  {
    category: 'DRAINAGE_SEWERAGE',
    subcategory: 'stormwater_flooding',
    department: 'Emergency Stormwater Response',
    keywords: ['waterlogging', 'rainwater flooding', 'monsoon drain blocked', 'street flooded with water', 'water stagnant'],
    patterns: [/\bwaterlogg(ing|ed)\b/i, /\b(street|road)\s+flood(ed|ing)\b/i],
    baseUrgency: 'HIGH',
  },

  // 4. SOLID WASTE & SANITATION
  {
    category: 'SOLID_WASTE_SANITATION',
    subcategory: 'garbage_pileup',
    department: 'Municipal Solid Waste Management (SWM)',
    keywords: ['garbage dump', 'kachra', 'trash pile', 'overflowing dustbin', 'garbage not picked', 'refuse pileup'],
    patterns: [/\bgarbage\s+(dump|pile|overflowing|not\s+picked)\b/i, /\bkachra\b/i, /\btrash\s+dump\b/i],
    baseUrgency: 'NORMAL',
  },
  {
    category: 'SOLID_WASTE_SANITATION',
    subcategory: 'animal_carcass',
    department: 'Municipal Veterinary & SWM Division',
    keywords: ['dead animal', 'dead dog', 'cattle carcass', 'animal carcass', 'rotting dead body of animal'],
    patterns: [/\bdead\s+(animal|dog|cat|cow|bull|cattle)\b/i, /\bcarcass\b/i],
    baseUrgency: 'HIGH',
  },
  {
    category: 'SOLID_WASTE_SANITATION',
    subcategory: 'public_toilet_sanitation',
    department: 'Public Health Sanitation Division',
    keywords: ['public toilet dirty', 'urinal overflowing', 'dirty washroom', 'sulabh sauchalay dirty', 'public urinal'],
    patterns: [/\bpublic\s+(toilet|urinal|washroom)\b/i, /\bsulabh\s+sauchalay\b/i],
    baseUrgency: 'NORMAL',
  },
  {
    category: 'SOLID_WASTE_SANITATION',
    subcategory: 'plastic_burning',
    department: 'Municipal Enforcement & Pollution Control',
    keywords: ['plastic burning', 'garbage burning', 'open burning of trash', 'smoke from garbage', 'burning kachra'],
    patterns: [/\b(garbage|plastic|trash)\s+burn(ing)?\b/i, /\bopen\s+burning\b/i],
    baseUrgency: 'HIGH',
  },

  // 5. ELECTRICITY & LIGHTING
  {
    category: 'ELECTRICITY_LIGHTING',
    subcategory: 'hanging_live_wire',
    department: 'State Electricity Distribution Company (DISCOM) / Emergency Wing',
    keywords: ['live wire', 'hanging live wire', 'naked wire', 'sparking wire', 'exposed cable', 'electrocution risk'],
    patterns: [/\b(live|naked|hanging)\s+wire(s)?\b/i, /\bexposed\s+cable(s)?\b/i, /\belectrocution\b/i],
    baseUrgency: 'EMERGENCY',
  },
  {
    category: 'ELECTRICITY_LIGHTING',
    subcategory: 'transformer_spark',
    department: 'State Electricity Distribution Company (DISCOM)',
    keywords: ['transformer spark', 'transformer fire', 'transformer blast', 'sparking transformer', 'oil leak transformer'],
    patterns: [/\btransformer\s+(spark(ing)?|fire|blast|smoke)\b/i],
    baseUrgency: 'EMERGENCY',
  },
  {
    category: 'ELECTRICITY_LIGHTING',
    subcategory: 'streetlight_out',
    department: 'Municipal Street Lighting Division',
    keywords: ['streetlight', 'street light', 'dark street', 'lamp not working', 'flickering light', 'lights not on'],
    patterns: [/\bstreet\s*lights?\s+(out|off|broken|not\s+working|dark)\b/i, /\bdark\s+stretch\b/i],
    baseUrgency: 'NORMAL',
  },
  {
    category: 'ELECTRICITY_LIGHTING',
    subcategory: 'tilted_pole',
    department: 'Electricity Distribution Substation',
    keywords: ['electric pole tilted', 'bent pole', 'rusted pole falling', 'pole leaning dangerous'],
    patterns: [/\b(electric|light)\s+pole\s+(tilted|bent|leaning|falling)\b/i],
    baseUrgency: 'HIGH',
  },

  // 6. PUBLIC HEALTH & VECTOR CONTROL
  {
    category: 'PUBLIC_HEALTH_VECTOR',
    subcategory: 'mosquito_breeding',
    department: 'Municipal Health Officer / Entomology Wing',
    keywords: ['mosquito', 'machhar', 'dengue', 'malaria', 'stagnant water breeding', 'larvae', 'fogging needed'],
    patterns: [/\bmosquito(es)?\b/i, /\bmachhar\b/i, /\bdengue\b/i, /\bmalaria\b/i, /\bfogging\b/i],
    baseUrgency: 'NORMAL',
  },
  {
    category: 'PUBLIC_HEALTH_VECTOR',
    subcategory: 'stray_dog_pack',
    department: 'Municipal Veterinary & Animal Care Wing',
    keywords: ['stray dogs', 'dog bite', 'aggressive dogs', 'rabid dog', 'pack of dogs chasing'],
    patterns: [/\bstray\s+dogs?\b/i, /\bdog\s+bite(s)?\b/i, /\brabid\s+dog\b/i],
    baseUrgency: 'HIGH',
  },

  // 7. ENVIRONMENT & TREES
  {
    category: 'ENVIRONMENT_TREES',
    subcategory: 'fallen_tree',
    department: 'Urban Forestry & Disaster Management Cell',
    keywords: ['fallen tree', 'tree uprooted', 'heavy branch broken', 'tree blocking road', 'hanging bough dangerous'],
    patterns: [/\b(fallen|uprooted)\s+tree(s)?\b/i, /\btree\s+blocking\s+road\b/i, /\bheavy\s+branch\s+broken\b/i],
    baseUrgency: 'HIGH',
  },
  {
    category: 'ENVIRONMENT_TREES',
    subcategory: 'illegal_tree_cutting',
    department: 'Forest Department & Horticulture Cell',
    keywords: ['illegal tree cutting', 'cutting green tree', 'tree chopped without permission'],
    patterns: [/\billegal\s+tree\s+(cutting|felling)\b/i, /\btree\s+chopped\b/i],
    baseUrgency: 'NORMAL',
  },

  // 8. PUBLIC INFRASTRUCTURE & PARKS
  {
    category: 'PUBLIC_INFRASTRUCTURE_PARKS',
    subcategory: 'damaged_play_equipment',
    department: 'Urban Development Authority / Parks Division',
    keywords: ['park swing broken', 'playground equipment damaged', 'slide broken', 'children play area unsafe'],
    patterns: [/\b(park|playground)\s+(swing|slide|equipment)\s+(broken|damaged)\b/i],
    baseUrgency: 'NORMAL',
  },
  {
    category: 'PUBLIC_INFRASTRUCTURE_PARKS',
    subcategory: 'park_maintenance',
    department: 'Municipal Parks & Recreation Division',
    keywords: ['park gate broken', 'walking track eroded', 'park bench damaged', 'park untended'],
    patterns: [/\bpark\s+(gate|bench|track|lighting)\b/i],
    baseUrgency: 'LOW',
  },
];

export class AICivicClassifier {
  /** Classify civic complaint with deterministic taxonomy first, AI fallback when ambiguous */
  static async classify(req: CivicClassificationRequest): Promise<CivicClassificationResult> {
    const text = req.description.trim();

    // 1. Run Deterministic Taxonomy Matcher
    const heuristicMatch = this.matchDeterministic(text);

    if (heuristicMatch && heuristicMatch.confidence >= 0.85) {
      return {
        category: heuristicMatch.entry.category,
        subcategory: heuristicMatch.entry.subcategory,
        department: heuristicMatch.entry.department,
        urgency: heuristicMatch.urgency,
        confidence: heuristicMatch.confidence,
        deterministic: true,
        matchedRule: heuristicMatch.matchedPattern,
        aiFallbackUsed: false,
      };
    }

    // 2. Ambiguous or low confidence (< 0.85): Fallback to AI Provider
    try {
      const systemPrompt = `You are POLIGRAM AI Civic Classifier.
Classify the civic complaint into one of the following 8 categories:
- ROADS_TRAFFIC
- WATER_SUPPLY
- DRAINAGE_SEWERAGE
- SOLID_WASTE_SANITATION
- ELECTRICITY_LIGHTING
- PUBLIC_HEALTH_VECTOR
- ENVIRONMENT_TREES
- PUBLIC_INFRASTRUCTURE_PARKS

Also provide subcategory, responsible municipal department, and urgency (LOW, NORMAL, HIGH, EMERGENCY).
Return ONLY valid JSON matching this schema:
{
  "category": "CATEGORY_NAME",
  "subcategory": "subcategory_name",
  "department": "Department Name",
  "urgency": "LOW" | "NORMAL" | "HIGH" | "EMERGENCY",
  "confidence": 0.90
}`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Civic Complaint: "${text}"` },
      ];

      const aiRes = await defaultAIRegistry.generateWithFallback({
        messages,
        responseFormat: 'json',
        tenantId: req.tenantId,
        operation: 'civic_classification',
      });

      const cleaned = aiRes.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned) as {
        category?: CivicTaxonomyCategory;
        subcategory?: string;
        department?: string;
        urgency?: CivicUrgencyLevel;
        confidence?: number;
      };

      if (parsed.category) {
        return {
          category: parsed.category,
          subcategory: parsed.subcategory || 'general_civic_complaint',
          department: parsed.department || 'Municipal Corporation General Administration',
          urgency: parsed.urgency || 'NORMAL',
          confidence: Number(parsed.confidence || 0.85),
          deterministic: false,
          aiFallbackUsed: true,
          providerUsed: aiRes.provider,
          provisionalOffline: aiRes.degradedOffline,
        };
      }
    } catch {
      // Fallback: if AI call or JSON parsing fails, use best heuristic
    }

    // 3. Graceful offline fallback to best heuristic or default
    if (heuristicMatch) {
      return {
        category: heuristicMatch.entry.category,
        subcategory: heuristicMatch.entry.subcategory,
        department: heuristicMatch.entry.department,
        urgency: heuristicMatch.urgency,
        confidence: heuristicMatch.confidence,
        deterministic: false,
        aiFallbackUsed: true,
        provisionalOffline: true,
      };
    }

    return {
      category: 'ROADS_TRAFFIC',
      subcategory: 'general_civic_issue',
      department: 'Municipal Citizen Grievance Redressal Cell',
      urgency: 'NORMAL',
      confidence: 0.60,
      deterministic: false,
      aiFallbackUsed: true,
      provisionalOffline: true,
    };
  }

  /** Match against structured dictionary with confidence calculation */
  private static matchDeterministic(text: string): {
    entry: TaxonomyEntry;
    urgency: CivicUrgencyLevel;
    confidence: number;
    matchedPattern: string;
  } | null {
    let bestMatch: {
      entry: TaxonomyEntry;
      urgency: CivicUrgencyLevel;
      confidence: number;
      matchedPattern: string;
    } | null = null;

    let maxScore = 0;

    for (const entry of COMPREHENSIVE_CIVIC_TAXONOMY) {
      let score = 0;
      let matchedPatternStr = '';

      // Pattern regex matches (high precision)
      for (const pattern of entry.patterns) {
        if (pattern.test(text)) {
          score += 50;
          matchedPatternStr = pattern.source;
          break;
        }
      }

      // Keyword token matches
      const lower = text.toLowerCase();
      let kwMatches = 0;
      for (const kw of entry.keywords) {
        if (lower.includes(kw.toLowerCase())) {
          kwMatches++;
          score += 20;
          if (!matchedPatternStr) matchedPatternStr = kw;
        }
      }

      if (score > maxScore) {
        maxScore = score;
        let confidence = 0.5;
        if (score >= 70) confidence = 0.95;
        else if (score >= 50) confidence = 0.88;
        else if (score >= 20) confidence = 0.70;

        // Check for urgency escalation
        let urgency = entry.baseUrgency;
        if (/\b(emergency|urgent|danger|risk of life|immediately|fatal)\b/i.test(text)) {
          if (urgency === 'NORMAL') urgency = 'HIGH';
          else if (urgency === 'HIGH') urgency = 'EMERGENCY';
        }

        bestMatch = {
          entry,
          urgency,
          confidence,
          matchedPattern: matchedPatternStr,
        };
      }
    }

    return bestMatch;
  }
}
