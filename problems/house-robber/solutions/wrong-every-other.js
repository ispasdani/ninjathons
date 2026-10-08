// Takes all the even houses or all the odd ones, never skipping two in a row.
function rob(houses) {
  let even = 0;
  let odd = 0;
  houses.forEach((coins, i) => {
    if (i % 2 === 0) even += coins;
    else odd += coins;
  });
  return Math.max(even, odd);
}
