/**
 * Outreach provider adapters.
 *
 * Phase 1 ships the MockOutreachProvider so the admin panel is fully usable.
 * Phase 2: implement Msg91Provider / TwilioProvider / ExotelProvider against
 * the same `OutreachProvider` interface and return it from `getOutreachProvider`.
 */
import type {
  OutreachProvider,
  SendBroadcastInput,
  SendResult,
} from './outreachTypes';

class MockOutreachProvider implements OutreachProvider {
  readonly id = 'mock';
  readonly label = 'Simulated (no messages sent)';
  readonly channels = ['whatsapp', 'sms', 'voice'] as const as OutreachProvider['channels'];

  isConfigured() {
    return true;
  }

  async send(input: SendBroadcastInput): Promise<SendResult> {
    // Simulate network acceptance latency.
    await new Promise((r) => setTimeout(r, 600));
    const audience = input.segment.size;
    // ~2% are unreachable (invalid number / DND).
    const rejected = Math.floor(audience * 0.02);
    return {
      providerRef: `mock_${Date.now().toString(36)}`,
      accepted: audience - rejected,
      rejected,
    };
  }
}

const mock = new MockOutreachProvider();

export function getOutreachProvider(): OutreachProvider {
  // TODO(phase-2): switch on configured credentials, e.g.
  //   if (MSG91_KEY) return new Msg91Provider(...);
  return mock;
}
