// Puts the heavier stone back whole instead of the difference.
function lastStoneWeight(stones) {
  const pile = [...stones];
  while (pile.length > 1) {
    pile.sort((a, b) => b - a);
    const a = pile.shift();
    const b = pile.shift();
    if (a !== b) pile.push(a);
  }
  return pile.length ? pile[0] : 0;
}
