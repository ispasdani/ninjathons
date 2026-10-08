A loop repeats some code, either a fixed number of times or until something changes. It's how a short program handles a list of a million numbers.

## for: going through a collection

The simplest loop visits every item in a list, in order:

```javascript
const scores = [70, 85, 90];
let total = 0;
for (const score of scores) {
  total += score;
}
console.log(total); // 245
```

```python
scores = [70, 85, 90]
total = 0
for score in scores:
    total += score
print(total)  # 245
```

`total += score` is short for `total = total + score`.

This pattern, a variable set up **before** the loop and updated **inside** it, is the most common in programming. It's called an *accumulator*. Counting works the same way: start a counter at 0 and add 1 each time something matches.

## for: counting

To repeat something with a counter, or when you need each item's position:

```javascript
for (let i = 0; i < 5; i++) {
  console.log(i); // 0, 1, 2, 3, 4
}
```

```python
for i in range(5):
    print(i)  # 0, 1, 2, 3, 4
```

Both start at 0 and stop **before** 5. Positions in a list start at 0 too: the first item is `nums[0]` and the last is `nums[nums.length - 1]` (`nums[len(nums) - 1]` in Python).

## while: until something changes

A `while` loop runs as long as its condition is true. Use it when you don't know in advance how many times:

```javascript
let n = 1234;
let digits = 0;
while (n > 0) {
  digits++;
  n = Math.floor(n / 10);
}
// digits is 4
```

```python
n = 1234
digits = 0
while n > 0:
    digits += 1
    n //= 10
# digits is 4
```

Each time round, dividing by 10 drops the last digit: 1234, 123, 12, 1, 0. Make sure something in the loop moves towards the end, or it never stops.

## Off by one

The most common loop bug is going round one time too many or too few: starting at 1 instead of 0 and skipping the first item, or using `<=` where you meant `<`. Check your loop on the smallest cases: an empty list, a list with one item, the number 0, a one-digit number.
