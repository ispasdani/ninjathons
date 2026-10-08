Programs need to do different things in different situations: charge postage only under a certain order size, say "Good morning" before noon. That's what `if` is for.

## Comparisons

A comparison gives `true` or `false`:

| Means | JavaScript | Python |
|---|---|---|
| equal | `a === b` | `a == b` |
| not equal | `a !== b` | `a != b` |
| less, less or equal | `a < b`, `a <= b` | same |
| greater, greater or equal | `a > b`, `a >= b` | same |

In JavaScript, use the three-character `===` and `!==`. The two-character `==` converts types first (`"1" == 1` is `true`), which hides mistakes.

## if, else if, else

```javascript
function shipping(total) {
  if (total >= 50) {
    return 0;
  } else if (total >= 20) {
    return 3;
  } else {
    return 5;
  }
}
```

```python
def shipping(total):
    if total >= 50:
        return 0
    elif total >= 20:
        return 3
    else:
        return 5
```

The checks run from top to bottom and the **first** one that's true wins; the rest are skipped. That's why the order matters: if `total >= 20` came first, an order of 60 would pay 3.

Python marks what belongs to the `if` by **indentation** (four spaces); JavaScript uses `{ }`. Indent JavaScript the same way anyway, so it's easy to read.

## Combining conditions

- **and**: both must be true. `&&` in JavaScript, `and` in Python.
- **or**: at least one must be true. `||` in JavaScript, `or` in Python.
- **not**: flips it. `!` in JavaScript, `not` in Python.

```javascript
const isWeekend = day === "Sat" || day === "Sun";
const canVote = age >= 18 && isCitizen;
```

```python
is_weekend = day == "Sat" or day == "Sun"
can_vote = age >= 18 and is_citizen
```

## Divisible by

"Divisible by 3" means "dividing by 3 leaves no remainder": `n % 3 === 0`. You'll use this constantly: even numbers, every 4th year, every 15th item.

## Watch the edges

Most bugs in `if` code are at the boundaries. If a rule says "90 and above is an A", test 89, 90 and 91. Is it `>` or `>=`? Write down the edge values before you write the code, and check each one in your head.

In FizzBuzz below, which check has to come first? A number divisible by 15 is also divisible by 3 and by 5.
