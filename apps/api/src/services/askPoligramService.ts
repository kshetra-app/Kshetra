/**
 * POLIGRAM / KSHETRA PLATFORM
 * Domain 8: Ask POLIGRAM Grounded Retrieval-Augmented Generation (JOB 070)
 * Authority: Master Product Blueprint, Amendment v1.2, Amendment v1.5-A & DEC-192
 */

import { executeAICompletion } from './aiExecutionService';
import {
  getConstituency,
  getRawConstituency,
  getConstituencyElectionData,
  getStateInfo,
  getConstituencies,
  getMLAProfile,
  getTSElectionHistory,
} from './stateData';
import type { AskPoligramRequest, AskPoligramResponse, ChatMessage } from '@kshetra/shared';

const ADVERSARIAL_INJECTION_PATTERNS = [
  /\b(ignore|bypass|override)\s+(all\s+)?.*?(instructions|rules|directives|prompts)\b/i,
  /\b(act\s+as\s+dan|jailbreak|unfiltered\s+mode|do\s+anything\s+now)\b/i,
  /\b(system\s+prompt|hidden\s+instructions|secret\s+instructions|secret\s+prompt)\b/i,
  /\b(tell\s+me|show\s+me|reveal)\s+.*?(system\s+prompt|hidden\s+instructions|secret)/i,
  /\b(invent|fabricate|hallucinate|make\s+up)\s+(corruption|crimes|scandal|charges)\b/i,
];

export class AskPoligramService {
  /** Answer from bundled reference data while clearly disclosing its unverified provenance. */
  static async ask(req: AskPoligramRequest): Promise<AskPoligramResponse> {
    const startTime = Date.now();
    const query = req.query.trim();
    const stateCode = (req.stateCode || 'TS').toUpperCase();

    // 1. Adversarial Defense & Prompt Injection Deflection
    for (const pattern of ADVERSARIAL_INJECTION_PATTERNS) {
      if (pattern.test(query)) {
        return {
          answer:
            'POLIGRAM cannot help bypass factuality safeguards or generate unverified political allegations. This request was not answered from platform reference data.',
          query,
          groundedContextSummary: 'Adversarial prompt injection deflected by security filter.',
          groundingStatus: 'not_applicable',
          citations: [],
          deflectedInjection: true,
          provider: 'security_filter',
          tokensUsed: 0,
          promptTokens: 0,
          completionTokens: 0,
          latencyMs: Date.now() - startTime,
          costUsd: 0,
          costInr: 0,
          costBasis: 'none',
          costRateCardVersion: null,
          costRateCardSource: null,
          usageBasis: 'not_applicable',
        };
      }
    }

    // 2. Structured Grounded Context Retrieval
    const { contextText, acFound } = this.retrieveContext(query, stateCode, req.acNo);

    // 3. Factuality prompt. The currently connected reference adapter has no
    // per-record source manifest, so its values must not be represented as verified.
    const systemPrompt = `You are POLIGRAM AI — a non-partisan civic and electoral information assistant.
Use only the context supplied below. It comes from bundled platform reference datasets, and per-record source/date verification is not attached to this request. Do not describe these values as verified, official, current, or certified. Do not invent citations, sources, dates, links, or statistics.

FACTUALITY RULES:
1. Do not speculate about corruption, crimes, or voting records.
2. If information is absent from the supplied context, say that the current context does not contain it. Do not infer a missing value.
3. Maintain a non-partisan, neutral, and dignified tone.
4. Preserve the stated year and scope of every figure; explain that source verification is unavailable when relevant.

REFERENCE DATA CONTEXT (NOT VERIFIED AT RECORD LEVEL):
${contextText}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ];

    // 4. Generate Completion via Fallback Cascade
    const aiRes = await executeAICompletion({
      messages,
      tenantId: req.tenantId,
      operation: 'ask_poligram',
    });

    const latencyMs = Date.now() - startTime;

    return {
      answer: aiRes.content,
      query,
      groundedContextSummary: acFound
        ? `Bundled reference data used for AC #${acFound.acNo} ${acFound.name} (${stateCode}); per-record source and date verification is not attached.`
        : `Bundled state reference data used for ${stateCode}; per-record source and date verification is not attached.`,
      groundingStatus: 'reference_data_unverified',
      citations: [],
      deflectedInjection: false,
      provider: aiRes.provider,
      tokensUsed: aiRes.usage.totalTokens,
      promptTokens: aiRes.usage.promptTokens,
      completionTokens: aiRes.usage.completionTokens,
      latencyMs,
      costUsd: aiRes.costUsd,
      costInr: aiRes.costInr,
      costBasis: aiRes.costBasis,
      costRateCardVersion: aiRes.costRateCardVersion,
      costRateCardSource: aiRes.costRateCardSource,
      usageBasis: aiRes.usageBasis,
    };
  }

  /** Retrieve bundled reference context without constructing unverifiable citations. */
  private static retrieveContext(
    query: string,
    stateCode: string,
    explicitAcNo?: number,
  ): {
    contextText: string;
    acFound?: { acNo: number; name: string };
  } {
    const constituencies = getConstituencies(stateCode);

    // Identify target constituency
    let targetAcNo = explicitAcNo;
    if (!targetAcNo) {
      const lowerQuery = query.toLowerCase();
      // Try to find AC name mentioned in query
      const match = constituencies.find(
        (c) =>
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
        ctx += `Bundled dataset recorded MLA: ${c.currentMLA || 'Not Recorded'} (${c.currentParty || 'Unspecified'})\n`;

        if (stateCode === 'TS') {
          const raw = getRawConstituency('TS', c.acNo);
          if (raw) {
            ctx += `2023 Winner: ${raw.winnerName2023} (${raw.winner2023}) with ${raw.winnerVotes2023.toLocaleString()} votes\n`;
            ctx += `2023 Runner-up: ${raw.runnerUp2023} with margin of ${raw.margin2023.toLocaleString()} votes\n`;
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
            ctx += 'Bundled election record';
            if (r.electionYear != null) ctx += ` (${r.electionYear})`;
            ctx += `: Winner: ${r.winnerName || c.currentMLA} (${r.winner || c.currentParty})`;
            if (r.winnerVotes) ctx += ` with ${r.winnerVotes.toLocaleString()} votes`;
            if (r.margin) ctx += ` (Margin: ${r.margin.toLocaleString()} votes)`;
            ctx += '\n';
          }
        }

        return {
          contextText: ctx,
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
    }

    return {
      contextText: stateCtx,
    };
  }
}
