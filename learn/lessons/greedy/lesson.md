A greedy algorithm makes the choice that looks best **right now**, never reconsiders it, and moves on. When it works, it's the simplest and fastest solution there is, usually one pass, maybe after a sort. The catch: it often doesn't work, and the skill is telling the difference.

## When greedy fails

Paying 6 with coins of 1, 3 and 4: greedy takes the biggest coin that fits, so 4 + 1 + 1, three coins. The best is 3 + 3, two coins. Taking the 4 *looked* best but blocked a better combination. That problem needs dynamic programming.

So before trusting a greedy rule, try to break it with a small example. If you can't, try to argue why it's safe.

## The argument: exchanging

The standard proof that a greedy choice is safe is an **exchange argument**: take any best solution that doesn't make the greedy choice, swap in the greedy choice, and show the result is at least as good. Then some best solution makes the greedy choice, and you can make it too.

## Example: how far can you get?

Each item of `jumps` says how many positions you may jump forward from there, at most. Starting at position 0, can you reach the last position? Trying every sequence of jumps is exponential. Greedy keeps one number, the **furthest** position reachable so far, and walks forward while it can:

```javascript
function canReachEnd(jumps) {
  let furthest = 0;
  for (let i = 0; i < jumps.length; i++) {
    if (i > furthest) return false; // stuck: nothing reaches i
    furthest = Math.max(furthest, i + jumps[i]);
  }
  return true;
}
```

```python
def can_reach_end(jumps):
    furthest = 0
    for i, j in enumerate(jumps):
        if i > furthest:
            return False  # stuck: nothing reaches i
        furthest = max(furthest, i + j)
    return True
```

One pass, O(1) memory. The same shape (one running value, updated as you walk) solves the stock exercise: what matters on each day is the **lowest price before it**. Mind the order of the two updates inside the loop, so you never buy and sell on the same day.

## Example: when to start over

For the largest sum of a **contiguous** run, walk left to right keeping the best sum of a run that **ends here**. At each number the choice is: extend the run, or drop it and start again at this number. A running sum that has gone negative can only drag the next number down. This is *Kadane's algorithm*: DP with a state of one number, which is why greedy and DP often blur together.

## Example: choosing intervals

You're invited to many meetings and want to attend as many as possible, one at a time. Which do you pick first? The shortest? The earliest to start? Both fail on small examples (try it). The safe rule is to pick the one that **ends first**: it leaves the most time for everything after. The exchange argument: any best schedule's first meeting can be swapped for the earliest-ending one without clashing with anything that follows.

The same sort-by-end idea solves a cousin: the fewest pins that pierce every interval on a line, where a pin at `x` pierces every interval with `start <= x <= end`. Put a pin at the end of the earliest-ending interval: it pierces as many as any pin could. Skip everything it pierces, and repeat:

```javascript
function fewestPins(intervals) {
  intervals.sort((a, b) => a[1] - b[1]); // by end
  let pins = 0;
  let last = -Infinity;
  for (const [start, end] of intervals) {
    if (start > last) {
      pins++;
      last = end;
    }
  }
  return pins;
}
```

Whether `>` or `>=` belongs in that test is the touching rule again: here an interval starting exactly at the pin is pierced by it. For meetings, read the statement: can one start at the minute the previous one ends?

## Spotting greedy

- The problem has a natural **order** (time, position, size) and a choice at each step that you can argue never needs undoing.
- Sorting by the right key is half the work. Which key is the question.
- Always test the rule against a few tiny cases first. If one breaks it, reach for DP.
