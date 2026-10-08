// Sorts the whole pile again every turn: O(n² log n).
function lastStoneWeight(stones) {
  const pile = [...stones];
  while (pile.length > 1) {
    pile.sort((a, b) => a - b);
    const a = pile.pop();
    const b = pile.pop();
    if (a !== b) pile.push(a - b);
  }
  return pile.length ? pile[0] : 0;
}
