/**
 * Tests for TUI activity box scroll logic (same as tui-app.tsx).
 * Run: node tests/tui-activity-scroll.test.mjs
 */
const ACTIVITY_VISIBLE_LINES = 6;

function getVisibleSlice(recent, activityScroll) {
  const maxScroll = Math.max(0, recent.length - ACTIVITY_VISIBLE_LINES);
  const start = Math.min(activityScroll, maxScroll);
  return recent.slice(start, start + ACTIVITY_VISIBLE_LINES);
}

const recent8 = ['You: a', 'Agent: 1', 'You: b', 'Agent: 2', 'You: c', 'Agent: 3', 'You: d', 'Agent: 4'];
const maxScroll8 = Math.max(0, recent8.length - ACTIVITY_VISIBLE_LINES);

// With 8 items, maxScroll = 2
if (maxScroll8 !== 2) throw new Error(`expected maxScroll 2, got ${maxScroll8}`);

// start=0 shows first 6
const slice0 = getVisibleSlice(recent8, 0);
if (slice0.length !== 6 || slice0[0] !== 'You: a' || slice0[5] !== 'Agent: 3') {
  throw new Error(`slice(0) wrong: ${JSON.stringify(slice0)}`);
}

// start=2 shows items at indices 2..7
const slice2 = getVisibleSlice(recent8, 2);
if (slice2.length !== 6 || slice2[0] !== 'You: b' || slice2[5] !== 'Agent: 4') {
  throw new Error(`slice(2) wrong: ${JSON.stringify(slice2)}`);
}

// 3 items: maxScroll 0, one slice
const recent3 = ['You: x', 'Agent: y', 'You: z'];
const slice3 = getVisibleSlice(recent3, 0);
if (slice3.length !== 3) throw new Error(`expected 3 visible, got ${slice3.length}`);

// Clamp: activityScroll 10 with 8 items -> start 2 (min(10, maxScroll))
const clamped = getVisibleSlice(recent8, 10);
if (clamped[0] !== 'You: b') throw new Error(`clamp wrong: ${clamped[0]}`);

console.log('TUI activity scroll logic: all tests passed');
