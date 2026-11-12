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
import { IS_LIVE_ENVIRONMENT } from './environment';

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

class UnavailableOutreachProvider implements OutreachProvider {
  readonly id = 'unavailable';
  readonly label = 'Unavailable (no messaging provider connected)';
  readonly channels = [];

  isConfigured() {
    return false;
  }

  async send(_input: SendBroadcastInput): Promise<SendResult> {
    throw new Error(
      'Broadcast delivery is unavailable until a real messaging provider and consent-based audience service are connected.',
    );
  }
}

const mock = new MockOutreachProvider();
const unavailable = new UnavailableOutreachProvider();

export function getOutreachProvider(): OutreachProvider {
  // Deployed builds must never report simulated acceptance or delivery.
  // Keep the mock only for local/test demos; live delivery requires a real,
  // configured provider and consent-based audience service.
  return IS_LIVE_ENVIRONMENT ? unavailable : mock;
}
