// Correct but compares every pair: must time out on the large tests.
function canAttendAll(meetings) {
  for (let i = 0; i < meetings.length; i++) {
    for (let j = i + 1; j < meetings.length; j++) {
      if (meetings[i][0] < meetings[j][1] && meetings[j][0] < meetings[i][1]) return false;
    }
  }
  return true;
}
