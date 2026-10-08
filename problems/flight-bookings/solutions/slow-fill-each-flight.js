// Correct but O(n × bookings): must time out on the large tests.
function seatsBooked(bookings, n) {
  const answer = new Array(n).fill(0);
  for (const [first, last, seats] of bookings) {
    for (let i = first - 1; i < last; i++) answer[i] += seats;
  }
  return answer;
}
