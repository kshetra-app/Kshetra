/**
 * POLIGRAM / KSHETRA PLATFORM
 * Domain 8: Ask POLIGRAM Grounded Retrieval-Augmented Generation (JOB 070)
 * Authority: Master Product Blueprint, Amendment v1.2, Amendment v1.5-A & DEC-192
 */

import { defaultAIRegistry } from './aiProvider';
import {
  getConstituency,
  getRawConstituency,
  getConstituencyElectionData,
  getStateInfo,
  getConstituencies,
  getMLAProfile,
  getTSElectionHistory,
} from './stateData';
import type {
  AskPoligramRequest,
  AskPoligramResponse,
  AskPoligramCitation,
  ChatMessage,
} from '@kshetra/shared';

const ADVERSARIAL_INJECTION_PATTERNS = [
  /\b(ignore|bypass|override)\s+(all\s+)?.*?(instructions|rules|directives|prompts)\b/i,
  /\b(act\s+as\s+dan|jailbreak|unfiltered\s+mode|do\s+anything\s+now)\b/i,
  /\b(system\s+prompt|hidden\s+instructions|secret\s+instructions|secret\s+prompt)\b/i,
  /\b(tell\s+me|show\s+me|reveal)\s+.*?(system\s+prompt|hidden\s+instructions|secret)/i,
  /\b(invent|fabricate|hallucinate|make\s+up)\s+(corruption|crimes|scandal|charges)\b/i,
];

export class AskPoligramService {
  /** Execute grounded, non-partisan, statutory-cited Q&A */
  static async ask(req: AskPoligramRequest): Promise<AskPoligramResponse> {
    const startTime = Date.now();
    const query = req.query.trim();
    const stateCode = (req.stateCode || 'TS').toUpperCase();

    // 1. Adversarial Defense & Prompt Injection Deflection
    for (const pattern of ADVERSARIAL_INJECTION_PATTERNS) {
      if (pattern.test(query)) {
        return {
          answer:
            'POLIGRAM is a sovereign civic intelligence platform strictly grounded in verified public records and statutory election datasets. Prompts attempting to bypass factual grounding, generate unverified political allegations, or deflect non-partisan protocols are deflected.',
          query,
          groundedContextSummary: 'Adversarial prompt injection deflected by security filter.',
          citations: [],
          deflectedInjection: true,
          provider: 'security_filter',
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
        };
      }
    }

    // 2. Structured Grounded Context Retrieval
    const { contextText, citations, acFound } = this.retrieveContext(query, stateCode, req.acNo);

    // 3. Grounded System Prompt
    const systemPrompt = `You are POLIGRAM AI — an expert, non-partisan civic and electoral intelligence assistant.
You provide objective, strictly factual answers grounded EXCLUSIVELY in verified public records, Election Commission of India (ECI) data, and official constituency statistics.

STRICT ANTI-HALLUCINATION & LEGAL COMPLIANCE INVARIANTS:
1. Base all statements strictly on the verified database context provided below.
2. Do NOT speculate, infer unverified corruption, or hallucinate criminal charges or voting records.
3. If information about a person or metric is not present in the verified records, explicitly state: "Verified public records for this inquiry are not present in the current database. POLIGRAM does not speculate on unverified figures."
4. Maintain a non-partisan, neutral, and dignified civic tone.
5. Emphasize verified figures (votes, margins, party names, terms) with precision.

VERIFIED DATABASE CONTEXT:
${contextText}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ];

    // 4. Generate Completion via Fallback Cascade
    const aiRes = await defaultAIRegistry.generateWithFallback({
      messages,
      tenantId: req.tenantId,
      operation: 'ask_poligram',
    });

    const latencyMs = Date.now() - startTime;

    return {
      answer: aiRes.content,
      query,
      groundedContextSummary: acFound
        ? `Grounded in verified records for AC #${acFound.acNo} ${acFound.name} (${stateCode})`
        : `Grounded in verified state electoral records for ${stateCode}`,
      citations,
      deflectedInjection: false,
      provider: aiRes.provider,
      tokensUsed: aiRes.usage.totalTokens,
      latencyMs,
    };
  }

  /** Retrieve verified context and compile statutory citations */
  private static retrieveContext(
    query: string,
    stateCode: string,
    explicitAcNo?: number,
  ): {
    contextText: string;
    citations: AskPoligramCitation[];
    acFound?: { acNo: number; name: string };
  } {
    const citations: AskPoligramCitation[] = [];
    const constituencies = getConstituencies(stateCode);

    // Identify target constituency
    let targetAcNo = explicitAcNo;
    if (!targetAcNo) {
      const lowerQuery = query.toLowerCase();
      // Try to find AC name mentioned in query
      const match = constituencies.find((c) =>
        lowerQuery.includes(c.name.toLowerCase()) ||
        lowerQuery.includes(`ac ${c.acNo}`) ||
        lowerQuery.includes(`ac #${c.acNo}`),
      );
      if (match) {
        targetAcNo = match.acNo;
      }
    }

    if (targetAcNo) {
      const c = getConstituency(stateCode, targetAcNo);
      if (c) {
        let ctx = `Constituency: AC #${c.acNo} ${c.name} (${stateCode})\n`;
        ctx += `District: ${c.district || 'Unassigned'} | Reservation: ${c.reservationStatus}\n`;
        ctx += `Current Elected MLA: ${c.currentMLA || 'Not Recorded'} (${c.currentParty || 'Unspecified'})\n`;

        // Statutory citation: Elected tenure
        citations.push({
          sourceTitle: 'State Legislative Assembly Secretariat Official Members Register',
          documentType: 'ELECTED_TENURE_REGISTER',
          referenceId: `LA-SEC-REGISTER-${stateCode}-${c.acNo}`,
          publicationYear: 2023,
        });

        // Delimitation citation
        citations.push({
          sourceTitle: 'Delimitation Commission of India — Delimitation Order (Gazette of India)',
          documentType: 'DELIMITATION_ORDER',
          referenceId: `DCI-DELIM-ORDER-${stateCode}-2008`,
          url: 'https://eci.gov.in/files/file/2288-delimitation-order/',
          publicationYear: 2008,
        });

        if (stateCode === 'TS') {
          const raw = getRawConstituency('TS', c.acNo);
          if (raw) {
            ctx += `2023 Winner: ${raw.winnerName2023} (${raw.winner2023}) with ${raw.winnerVotes2023.toLocaleString()} votes\n`;
            ctx += `2023 Runner-up: ${raw.runnerUp2023} with margin of ${raw.margin2023.toLocaleString()} votes\n`;

            citations.push({
              sourceTitle: 'Election Commission of India — Form 20 Final Result Sheet (General Election 2023)',
              documentType: 'ECI_FORM_20',
              referenceId: `ECI-FORM20-TS-2023-AC${raw.acNo}`,
              url: 'https://results.eci.gov.in',
              publicationYear: 2023,
            });
          }

          const mla = getMLAProfile(c.acNo);
          if (mla) {
            ctx += `Representative Profile: Name: ${mla.name}, Gender: ${mla.gender}, Terms: ${mla.terms}`;
            if (mla.education) ctx += `, Education: ${mla.education}`;
            if (mla.age) ctx += `, Age: ${mla.age}`;
            ctx += '\n';
          }
        } else {
          const elec = getConstituencyElectionData(stateCode, c.acNo);
          if (elec?.recentElection) {
            const r = elec.recentElection;
            ctx += `Recent Election (${r.electionYear || 2023}): Winner: ${r.winnerName || c.currentMLA} (${r.winner || c.currentParty})`;
            if (r.winnerVotes) ctx += ` with ${r.winnerVotes.toLocaleString()} votes`;
            if (r.margin) ctx += ` (Margin: ${r.margin.toLocaleString()} votes)`;
            ctx += '\n';

            citations.push({
              sourceTitle: `Election Commission of India — Assembly General Election Results (${stateCode})`,
              documentType: 'ECI_FORM_20',
              referenceId: `ECI-FORM20-${stateCode}-${c.acNo}`,
              url: 'https://results.eci.gov.in',
              publicationYear: r.electionYear || 2023,
            });
          }
        }

        return {
          contextText: ctx,
          citations,
          acFound: { acNo: c.acNo, name: c.name },
        };
      }
    }

    // Default: State-wide context
    const stateInfo = getStateInfo(stateCode);
    let stateCtx = `State / UT: ${stateInfo?.name || stateCode} (Code: ${stateCode})\n`;
    stateCtx += `Total Assembly Constituencies: ${constituencies.length}\n`;

    if (stateCode === 'TS') {
      const history = getTSElectionHistory();
      stateCtx += `Election History (Telangana Assembly):\n`;
      for (const h of history) {
        const topParties = h.partyResults
          .sort((a, b) => b.seatsWon - a.seatsWon)
          .slice(0, 4)
          .map((p) => `${p.party}: ${p.seatsWon} seats`)
          .join(', ');
        stateCtx += `- ${h.year}: ${topParties} (Turnout: ${h.turnout}%)\n`;
      }
      citations.push({
        sourceTitle: 'Chief Electoral Officer (Telangana) — Statistical Reports (2014, 2018, 2023)',
        documentType: 'ECI_FORM_20',
        referenceId: 'CEO-TS-STAT-REPORT-2014-2023',
        url: 'https://ceotelangana.nic.in',
        publicationYear: 2023,
      });
    }

    return {
      contextText: stateCtx,
      citations,
    };
  }
}
