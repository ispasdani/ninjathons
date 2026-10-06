const n = Number(require("fs").readFileSync(0, "utf8").trim());
const composite = new Uint8Array(n + 1);
let count = 0;
for (let i = 2; i <= n; i++) {
  if (composite[i]) continue;
  count++;
  for (let j = i * i; j <= n; j += i) composite[j] = 1;
}
console.log(count);
