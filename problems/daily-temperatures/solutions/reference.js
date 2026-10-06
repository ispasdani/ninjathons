function dailyTemperatures(temperatures) {
  const answer = new Array(temperatures.length).fill(0);
  const stack = [];
  temperatures.forEach((t, i) => {
    while (stack.length && temperatures[stack[stack.length - 1]] < t) {
      const day = stack.pop();
      answer[day] = i - day;
    }
    stack.push(i);
  });
  return answer;
}
