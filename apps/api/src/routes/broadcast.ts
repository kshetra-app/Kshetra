import type { FastifyInstance } from 'fastify';
import { STATES } from '@kshetra/shared';
import { TELANGANA_CONSTITUENCIES } from '../../../../data/seed/telangana-constituencies';
import { AP_CONSTITUENCIES } from '../../../../data/seed/andhra-pradesh-constituencies';
import { KA_CONSTITUENCIES } from '../../../../data/seed/karnataka-constituencies';

interface BroadcastConstituency {
  acNo: number;
  name: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  status: 'WON' | 'LEADING';
  winnerParty: string;
  winnerName: string;
  winnerVotes: number;
  runnerUpParty: string;
  margin: number;
}

function getDetailedConstituencies(stateCode: string): BroadcastConstituency[] {
  switch (stateCode.toUpperCase()) {
    case 'TS':
      return TELANGANA_CONSTITUENCIES.map((c) => ({
        acNo: c.acNo,
        name: c.name,
        district: c.district,
        type: c.type,
        status: 'WON',
        winnerParty: c.winner2023,
        winnerName: c.winnerName2023,
        winnerVotes: c.winnerVotes2023,
        runnerUpParty: c.runnerUp2023,
        margin: c.margin2023,
      }));
    case 'AP':
      return AP_CONSTITUENCIES.map((c) => ({
        acNo: c.acNo,
        name: c.name,
        district: c.district,
        type: c.type,
        status: 'WON',
        winnerParty: c.winner2024,
        winnerName: c.winnerName2024,
        winnerVotes: c.winnerVotes2024,
        runnerUpParty: c.runnerUp2024,
        margin: c.margin2024,
      }));
    case 'KA':
      return KA_CONSTITUENCIES.map((c) => ({
        acNo: c.acNo,
        name: c.name,
        district: c.district,
        type: c.type,
        status: 'WON',
        winnerParty: c.winner2023,
        winnerName: c.winnerName2023,
        winnerVotes: c.winnerVotes2023,
        runnerUpParty: c.runnerUp2023,
        margin: c.margin2023,
      }));
    default:
      return [];
  }
}

export async function broadcastRoutes(app: FastifyInstance) {
  /** GET /api/v1/broadcast/summary */
  app.get('/api/v1/broadcast/summary', async () => {
    const summary: Record<string, number> = {};
    for (const state of Object.values(STATES)) {
      const p = state.rulingParty;
      if (p) {
        summary[p] = (summary[p] ?? 0) + 1;
      }
    }

    const statesList = Object.values(STATES).map((s) => ({
      code: s.code,
      name: s.name,
      rulingParty: s.rulingParty,
      assemblySeats: s.assemblySeats,
      parliamentarySeats: s.parliamentarySeats,
    }));

    return {
      summary,
      states: statesList,
    };
  });

  /** GET /api/v1/broadcast/state/:code */
  app.get('/api/v1/broadcast/state/:code', async (request, reply) => {
    const { code } = request.params as { code: string };
    const stateInfo = STATES[code.toUpperCase()];

    if (!stateInfo) {
      return reply.code(404).send({ error: `State ${code} not found` });
    }

    const constituencies = getDetailedConstituencies(code);

    // Compute standings
    const partyCounts: Record<string, { won: number; leading: number }> = {};
    for (const c of constituencies) {
      const p = c.winnerParty;
      if (!partyCounts[p]) {
        partyCounts[p] = { won: 0, leading: 0 };
      }
      if (c.status === 'WON') {
        partyCounts[p].won += 1;
      } else {
        partyCounts[p].leading += 1;
      }
    }

    const standings = Object.entries(partyCounts)
      .map(([party, counts]) => ({
        party,
        won: counts.won,
        leading: counts.leading,
        total: counts.won + counts.leading,
      }))
      .sort((a, b) => b.won - a.won);

    return {
      stateCode: stateInfo.code,
      stateName: stateInfo.name,
      totalSeats: stateInfo.assemblySeats,
      standings,
      constituencies,
    };
  });

  /** GET /api/v1/broadcast/state/:code/constituency/:acNo */
  app.get('/api/v1/broadcast/state/:code/constituency/:acNo', async (request, reply) => {
    const { code, acNo } = request.params as { code: string; acNo: string };
    const stateInfo = STATES[code.toUpperCase()];

    if (!stateInfo) {
      return reply.code(404).send({ error: `State ${code} not found` });
    }

    const constituencies = getDetailedConstituencies(code);
    const parsedAcNo = parseInt(acNo, 10);
    const constituency = constituencies.find((c) => c.acNo === parsedAcNo);

    if (!constituency) {
      return reply.code(404).send({ error: `Constituency #${acNo} not found in state ${code}` });
    }

    return constituency;
  });
}
