function activityBadge(itemFirstSeenIso, lastViewedAtMs) {
  const now = Date.now();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  
  const firstSeen = new Date(itemFirstSeenIso).getTime();
  
  console.log({
    now: new Date(now).toISOString(),
    firstSeen: new Date(firstSeen).toISOString(),
    lastViewedAt: new Date(lastViewedAtMs).toISOString(),
    isNewerThanViewed: firstSeen > lastViewedAtMs,
    isWithin2h: (now - firstSeen < twoHoursMs),
    diffMs: now - firstSeen
  });
  
  if (firstSeen > lastViewedAtMs && (now - firstSeen < twoHoursMs)) {
    return 'JUST FOUND';
  }
  return 'NO BADGE';
}

const mockNow = Date.now();
const itemFound = new Date(mockNow - 5 * 60 * 1000).toISOString(); // 5 min ago
const oldVisit = mockNow - 10 * 60 * 1000; // 10 min ago

console.log('Test 1 (New item since last visit):', activityBadge(itemFound, oldVisit));
