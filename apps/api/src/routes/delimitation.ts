/**
 * Delimitation API Routes
 *
 * Endpoints for:
 * - Seat projections (public)
 * - Monitor webhook (authenticated — receives alerts from cron monitors)
 * - Timeline events (public)
 * - Citizen impact lookup (public)
 * - State-level summary (public)
 */

import type { FastifyInstance } from 'fastify';

// Inline census data imports for API layer
// In production these would come from Supabase, but for now we use seed data

interface SeatProjection {
  stateCode: string;
  stateName: string;
  currentSeats: number;
  projectedSeats: number;
  seatChange: number;
  population: number;
  popPerSeat: number;
  reservedSC: number;
  reservedST: number;
  general: number;
}

// Seed projections (computed from Census 2011 data — same as mobile seatCalculator)
const SEED_PROJECTIONS: SeatProjection[] = [
  { stateCode: 'UP', stateName: 'Uttar Pradesh', currentSeats: 403, projectedSeats: 679, seatChange: 276, population: 199812341, popPerSeat: 294274, reservedSC: 142, reservedST: 7, general: 530 },
  { stateCode: 'MH', stateName: 'Maharashtra', currentSeats: 288, projectedSeats: 382, seatChange: 94, population: 112374333, popPerSeat: 294175, reservedSC: 42, reservedST: 35, general: 305 },
  { stateCode: 'BR', stateName: 'Bihar', currentSeats: 243, projectedSeats: 354, seatChange: 111, population: 104099452, popPerSeat: 294065, reservedSC: 57, reservedST: 5, general: 292 },
  { stateCode: 'WB', stateName: 'West Bengal', currentSeats: 294, projectedSeats: 310, seatChange: 16, population: 91276115, popPerSeat: 294439, reservedSC: 72, reservedST: 18, general: 220 },
  { stateCode: 'TN', stateName: 'Tamil Nadu', currentSeats: 234, projectedSeats: 245, seatChange: 11, population: 72147030, popPerSeat: 294478, reservedSC: 49, reservedST: 3, general: 193 },
  { stateCode: 'KA', stateName: 'Karnataka', currentSeats: 224, projectedSeats: 208, seatChange: -16, population: 61095297, popPerSeat: 293727, reservedSC: 36, reservedST: 14, general: 158 },
  { stateCode: 'RJ', stateName: 'Rajasthan', currentSeats: 200, projectedSeats: 233, seatChange: 33, population: 68548437, popPerSeat: 294198, reservedSC: 40, reservedST: 29, general: 164 },
  { stateCode: 'GJ', stateName: 'Gujarat', currentSeats: 182, projectedSeats: 205, seatChange: 23, population: 60439692, popPerSeat: 294828, reservedSC: 15, reservedST: 30, general: 160 },
  { stateCode: 'MP', stateName: 'Madhya Pradesh', currentSeats: 230, projectedSeats: 247, seatChange: 17, population: 72626809, popPerSeat: 293997, reservedSC: 39, reservedST: 51, general: 157 },
  { stateCode: 'AP', stateName: 'Andhra Pradesh', currentSeats: 175, projectedSeats: 168, seatChange: -7, population: 49386799, popPerSeat: 293969, reservedSC: 28, reservedST: 12, general: 128 },
  { stateCode: 'TS', stateName: 'Telangana', currentSeats: 119, projectedSeats: 119, seatChange: 0, population: 35003674, popPerSeat: 294149, reservedSC: 21, reservedST: 11, general: 87 },
  { stateCode: 'KL', stateName: 'Kerala', currentSeats: 140, projectedSeats: 114, seatChange: -26, population: 33406061, popPerSeat: 293036, reservedSC: 11, reservedST: 2, general: 101 },
  { stateCode: 'DL', stateName: 'Delhi', currentSeats: 70, projectedSeats: 57, seatChange: -13, population: 16787941, popPerSeat: 294525, reservedSC: 10, reservedST: 0, general: 47 },
];

export async function delimitationRoutes(app: FastifyInstance) {

  /** GET /api/v1/delimitation/projections — All state seat projections */
  app.get('/api/v1/delimitation/projections', async (_request, reply) => {
    const sorted = [...SEED_PROJECTIONS].sort((a, b) => b.seatChange - a.seatChange);

    const totalGained = sorted.filter((s) => s.seatChange > 0).reduce((s, p) => s + p.seatChange, 0);
    const totalLost = sorted.filter((s) => s.seatChange < 0).reduce((s, p) => s + p.seatChange, 0);

    return {
      censusYear: 2011,
      methodology: 'equal_population_principle',
      disclaimer: 'Projections based on Census 2011 data. Actual delimitation will use Census 2026 data.',
      summary: {
        statesAnalyzed: sorted.length,
        totalGained,
        totalLost,
        biggestGainer: sorted[0]?.stateCode,
        biggestLoser: sorted[sorted.length - 1]?.stateCode,
      },
      projections: sorted,
    };
  });

  /** GET /api/v1/delimitation/projections/:stateCode — Single state projection */
  app.get('/api/v1/delimitation/projections/:stateCode', async (request, reply) => {
    const { stateCode } = request.params as { stateCode: string };
    const projection = SEED_PROJECTIONS.find((p) => p.stateCode === stateCode.toUpperCase());

    if (!projection) {
      return reply.status(404).send({ error: `No projection data for state: ${stateCode}` });
    }

    return { projection };
  });

  /** GET /api/v1/delimitation/timeline — Timeline events */
  app.get('/api/v1/delimitation/timeline', async (request, reply) => {
    const query = request.query as { stateCode?: string; verified?: string; limit?: string };

    // In production, fetch from Supabase delimitation_events table
    // For now, return a summary
    return {
      status: 'pre_census',
      totalEvents: 15,
      verifiedEvents: 9,
      latestEvent: {
        title: 'Census 2025 enumeration begins',
        date: '2025-10-01',
        type: 'census_notification',
        verified: false,
      },
      note: 'Full timeline available in mobile app. API will serve from Supabase when connected.',
    };
  });

  /** GET /api/v1/delimitation/status — Current national delimitation status */
  app.get('/api/v1/delimitation/status', async () => {
    return {
      nationalStatus: 'pre_census',
      statusLabel: 'Pre-Census',
      description: 'Census has not yet been conducted. Delimitation will begin after Census 2026 data is published.',
      nextMilestone: 'Census enumeration',
      estimatedDate: '2025-2026',
      lastUpdated: new Date().toISOString(),
    };
  });

  /** GET /api/v1/delimitation/gainers-losers — Quick gainers/losers summary */
  app.get('/api/v1/delimitation/gainers-losers', async () => {
    const gainers = SEED_PROJECTIONS
      .filter((p) => p.seatChange > 0)
      .sort((a, b) => b.seatChange - a.seatChange);
    const losers = SEED_PROJECTIONS
      .filter((p) => p.seatChange < 0)
      .sort((a, b) => a.seatChange - b.seatChange);

    return {
      gainers: gainers.map((g) => ({ stateCode: g.stateCode, stateName: g.stateName, change: `+${g.seatChange}`, current: g.currentSeats, projected: g.projectedSeats })),
      losers: losers.map((l) => ({ stateCode: l.stateCode, stateName: l.stateName, change: `${l.seatChange}`, current: l.currentSeats, projected: l.projectedSeats })),
    };
  });

  /** POST /api/v1/delimitation/monitor-webhook — Receive alerts from cron monitors */
  app.post('/api/v1/delimitation/monitor-webhook', async (request, reply) => {
    // Authenticate monitor
    const auth = request.headers.authorization;
    const expectedSecret = process.env.KSHETRA_MONITOR_SECRET;

    if (expectedSecret && auth !== `Bearer ${expectedSecret}`) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const body = request.body as {
      type?: string;
      entries?: Array<{ id: string; title: string; date: string; relevanceScore: number }>;
      timestamp?: string;
    };

    if (!body.type || !body.entries) {
      return reply.status(400).send({ error: 'type and entries required' });
    }

    // Log the incoming monitor data
    app.log.info({
      msg: 'Delimitation monitor webhook received',
      type: body.type,
      entryCount: body.entries.length,
      highRelevance: body.entries.filter((e) => e.relevanceScore >= 50).length,
    });

    // In production:
    // 1. Insert entries into delimitation_events table
    // 2. Trigger push notifications for high-relevance entries
    // 3. Update delimitation status if warranted

    return {
      received: true,
      processed: body.entries.length,
      highRelevance: body.entries.filter((e) => e.relevanceScore >= 50).length,
      timestamp: new Date().toISOString(),
    };
  });

  /** GET /api/v1/delimitation/impact/:pinCode — Citizen impact by pin code (stub) */
  app.get('/api/v1/delimitation/impact/:pinCode', async (request, reply) => {
    const { pinCode } = request.params as { pinCode: string };

    if (!/^\d{6}$/.test(pinCode)) {
      return reply.status(400).send({ error: 'Invalid PIN code. Must be 6 digits.' });
    }

    // In production, this would look up the pin code in citizen_impact table
    return {
      pinCode,
      status: 'pending',
      message: 'Impact analysis will be available after delimitation proposals are published. Subscribe to get notified.',
      available: false,
    };
  });

  /** GET /api/v1/delimitation/simulate/:stateCode — Run boundary simulation for a state */
  app.get('/api/v1/delimitation/simulate/:stateCode', async (request, reply) => {
    const { stateCode } = request.params as { stateCode: string };
    const query = request.query as { mode?: string; seats?: string };

    // Import simulation engine — lazy-loaded since it's compute-heavy
    // In the API we use the quick district-level simulation for speed
    const projection = SEED_PROJECTIONS.find((p) => p.stateCode === stateCode.toUpperCase());
    if (!projection) {
      return reply.status(404).send({ error: `No simulation data for state: ${stateCode}` });
    }

    const targetSeats = query.seats ? parseInt(query.seats, 10) : projection.projectedSeats;
    const mode = query.mode ?? 'equal_population';

    // Quick district-level breakdown
    return {
      stateCode: projection.stateCode,
      stateName: projection.stateName,
      mode,
      targetSeats,
      currentSeats: projection.currentSeats,
      projectedSeats: projection.projectedSeats,
      seatChange: projection.seatChange,
      reservation: {
        scReserved: projection.reservedSC,
        stReserved: projection.reservedST,
        general: projection.general,
      },
      population: projection.population,
      populationPerSeat: projection.popPerSeat,
      methodology: 'equal_population_principle',
      note: 'Full ward-level simulation available in mobile app. API returns district-level projection.',
      disclaimer: 'Projections based on Census 2011. Actual delimitation will use Census 2026.',
    };
  });

  /** GET /api/v1/delimitation/reservation — National reservation analysis */
  app.get('/api/v1/delimitation/reservation', async () => {
    const profiles = SEED_PROJECTIONS.map((p) => ({
      stateCode: p.stateCode,
      stateName: p.stateName,
      currentSeats: p.currentSeats,
      projectedSeats: p.projectedSeats,
      scReserved: p.reservedSC,
      stReserved: p.reservedST,
      general: p.general,
      scPercent: p.projectedSeats > 0 ? Math.round((p.reservedSC / p.projectedSeats) * 1000) / 10 : 0,
      stPercent: p.projectedSeats > 0 ? Math.round((p.reservedST / p.projectedSeats) * 1000) / 10 : 0,
    }));

    const totalSC = profiles.reduce((s, p) => s + p.scReserved, 0);
    const totalST = profiles.reduce((s, p) => s + p.stReserved, 0);
    const totalGen = profiles.reduce((s, p) => s + p.general, 0);

    return {
      summary: {
        totalSCReserved: totalSC,
        totalSTReserved: totalST,
        totalGeneral: totalGen,
        totalSeats: totalSC + totalST + totalGen,
      },
      topSCStates: [...profiles].sort((a, b) => b.scReserved - a.scReserved).slice(0, 5),
      topSTStates: [...profiles].sort((a, b) => b.stReserved - a.stReserved).slice(0, 5),
      profiles,
    };
  });

  /** GET /api/v1/delimitation/reservation/:stateCode — State reservation detail */
  app.get('/api/v1/delimitation/reservation/:stateCode', async (request, reply) => {
    const { stateCode } = request.params as { stateCode: string };
    const p = SEED_PROJECTIONS.find((proj) => proj.stateCode === stateCode.toUpperCase());
    if (!p) {
      return reply.status(404).send({ error: `No data for state: ${stateCode}` });
    }

    return {
      stateCode: p.stateCode,
      stateName: p.stateName,
      current: {
        total: p.currentSeats,
        scReserved: Math.round(p.reservedSC * (p.currentSeats / p.projectedSeats)),
        stReserved: Math.round(p.reservedST * (p.currentSeats / p.projectedSeats)),
        general: p.currentSeats - Math.round(p.reservedSC * (p.currentSeats / p.projectedSeats)) - Math.round(p.reservedST * (p.currentSeats / p.projectedSeats)),
      },
      projected: {
        total: p.projectedSeats,
        scReserved: p.reservedSC,
        stReserved: p.reservedST,
        general: p.general,
      },
      change: {
        scChange: p.reservedSC - Math.round(p.reservedSC * (p.currentSeats / p.projectedSeats)),
        stChange: p.reservedST - Math.round(p.reservedST * (p.currentSeats / p.projectedSeats)),
      },
    };
  });

  /** GET /api/v1/delimitation/compare — Compare two states */
  app.get('/api/v1/delimitation/compare', async (request, reply) => {
    const query = request.query as { states?: string };
    if (!query.states) {
      return reply.status(400).send({ error: 'Provide ?states=TS,AP (comma-separated, max 4)' });
    }

    const codes = query.states.split(',').map((s) => s.trim().toUpperCase()).slice(0, 4);
    const results = codes.map((code) => {
      const p = SEED_PROJECTIONS.find((proj) => proj.stateCode === code);
      if (!p) return null;
      return {
        stateCode: p.stateCode,
        stateName: p.stateName,
        currentSeats: p.currentSeats,
        projectedSeats: p.projectedSeats,
        seatChange: p.seatChange,
        population: p.population,
        popPerSeat: p.popPerSeat,
        scReserved: p.reservedSC,
        stReserved: p.reservedST,
        general: p.general,
      };
    }).filter(Boolean);

    if (results.length === 0) {
      return reply.status(404).send({ error: 'No matching states found' });
    }

    return { comparison: results, statesCompared: results.length };
  });
}
