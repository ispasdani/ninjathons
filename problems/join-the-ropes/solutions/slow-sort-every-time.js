// Correct but re-sorts after every tie: must time out on the large tests.
function joinCost(ropes) {
  const left = [...ropes];
  let cost = 0;
  while (left.length > 1) {
    left.sort((a, b) => b - a);
    const tied = left.pop() + left.pop();
    cost += tied;
    left.push(tied);
  }
  return cost;
}
