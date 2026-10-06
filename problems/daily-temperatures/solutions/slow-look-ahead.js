// Correct but O(n^2) when temperatures fall: must time out.
function dailyTemperatures(temperatures) {
  return temperatures.map((t, i) => {
    for (let j = i + 1; j < temperatures.length; j++) if (temperatures[j] > t) return j - i;
    return 0;
  });
}
