import { getMPConstituencyTimeline } from '../madhya-pradesh-political-timeline';
import { getGAConstituencyTimeline } from '../goa-political-timeline';

describe('Political Timeline Populated Data Verification', () => {
  it('should return Scindia-era defections for MP AC 120', () => {
    const events = getMPConstituencyTimeline(120);
    expect(events.length).toBeGreaterThan(0);
    const defection = events.find(e => e.date === '2020-03-10');
    expect(defection).toBeDefined();
    expect(defection?.legislatorName).toBeDefined();
  });

  it('should return Goa merger events for GA AC 15', () => {
    const events = getGAConstituencyTimeline(15);
    expect(events.length).toBeGreaterThan(0);
    const defection = events.find(e => e.date === '2022-09-14');
    expect(defection).toBeDefined();
    expect(defection?.legislatorName).toBeDefined();
  });
});
