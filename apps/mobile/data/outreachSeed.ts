import type { AudienceSegment, MessageTemplate, Broadcast } from '../lib/outreachTypes';

export const SEED_SEGMENTS: AudienceSegment[] = [
  { id: 'seg-all', name: 'All registered voters', description: 'Everyone on the rolls in your constituency', type: 'all', size: 214560 },
  { id: 'seg-const', name: 'My constituency', description: 'Voters mapped to your home constituency', type: 'constituency', size: 198340 },
  { id: 'seg-booth', name: 'Priority booths', description: 'High-impact / swing booths flagged in strategy', type: 'booth', size: 42180 },
  { id: 'seg-vol', name: 'Volunteers', description: 'Registered campaign volunteers & karyakartas', type: 'volunteers', size: 1240 },
  { id: 'seg-sup', name: 'Confirmed supporters', description: 'Contacts marked as supporters during canvassing', type: 'supporters', size: 58720 },
  { id: 'seg-und', name: 'Undecided voters', description: 'Fence-sitters identified in surveys', type: 'undecided', size: 31450 },
];

export const SEED_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl-invite', name: 'Rally invitation', channel: 'whatsapp',
    body: 'Namaste {name} 🙏\nJoin us at the public meeting in {booth} on {date}. Your voice matters!\n— Team {candidate}',
    variables: ['name', 'booth', 'date', 'candidate'],
  },
  {
    id: 'tpl-reminder', name: 'Polling day reminder', channel: 'sms',
    body: 'Dear {name}, please vote today at your booth {booth}. Every vote counts. - {candidate}',
    variables: ['name', 'booth', 'candidate'], dltTemplateId: 'DLT_1107xxxxxxx',
  },
  {
    id: 'tpl-thanks', name: 'Thank you', channel: 'whatsapp',
    body: 'Thank you {name} for your support! Together we will build a better {constituency}. 🙏',
    variables: ['name', 'constituency'],
  },
  {
    id: 'tpl-voice', name: 'Candidate voice appeal', channel: 'voice',
    body: 'Automated voice message: a 30-second recorded appeal from the candidate.',
    variables: [], audioNote: 'appeal_v1.mp3',
  },
];

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const SEED_BROADCASTS: Broadcast[] = [
  {
    id: 'bc-1', name: 'Booth rally invite — Ward 12', channel: 'whatsapp',
    segmentId: 'seg-booth', segmentName: 'Priority booths', templateId: 'tpl-invite',
    body: SEED_TEMPLATES[0].body, createdAt: hoursAgo(30), status: 'sent',
    stats: { audience: 42180, queued: 42180, sent: 41320, delivered: 39870, read: 24510, failed: 860 },
  },
  {
    id: 'bc-2', name: 'Manifesto highlights', channel: 'sms',
    segmentId: 'seg-und', segmentName: 'Undecided voters', templateId: 'tpl-reminder',
    body: SEED_TEMPLATES[1].body, createdAt: hoursAgo(6), status: 'sent',
    stats: { audience: 31450, queued: 31450, sent: 31010, delivered: 30240, read: 0, failed: 440 },
  },
  {
    id: 'bc-3', name: 'Volunteer standup call', channel: 'voice',
    segmentId: 'seg-vol', segmentName: 'Volunteers', templateId: 'tpl-voice',
    body: SEED_TEMPLATES[3].body, createdAt: hoursAgo(2),
    scheduledAt: new Date(Date.now() + 3600_000).toISOString(), status: 'scheduled',
    stats: { audience: 1240, queued: 0, sent: 0, delivered: 0, read: 0, failed: 0 },
  },
];
