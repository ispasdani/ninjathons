// Tests every number by trial division: correct, but must time out for large n.
const n = Number(require("fs").readFileSync(0, "utf8").trim());
let count = 0;
for (let x = 2; x <= n; x++) {
  let prime = true;
  for (let d = 2; d * d <= x; d++) if (x % d === 0) { prime = false; break; }
  if (prime) count++;
}
console.log(count);
