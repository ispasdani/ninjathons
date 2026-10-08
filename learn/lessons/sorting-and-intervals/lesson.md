Intervals are pairs `[start, end]`: meetings, bookings, ranges of numbers. Questions about them (do any overlap? how many at once? which can be combined?) are hard while the intervals are in random order and easy once they're **sorted by start**. Sorting costs O(n log n), and afterwards a single pass usually does the rest.

## Sorting pairs

```javascript
intervals.sort((a, b) => a[0] - b[0]); // by start
```

```python
intervals.sort(key=lambda iv: iv[0])  # by start (sorting pairs directly also works)
```

JavaScript needs the comparison function; without it, arrays are sorted as text. Sorting copies nothing in either language: the list is reordered in place.

## Overlaps become neighbours

After sorting by start, an interval can only overlap the ones **next to it** in the order that are still running. To check whether a list of bookings fits in a single room, compare each one with the one before it:

```python
def fits_one_room(bookings):
    bookings = sorted(bookings)
    for prev, cur in zip(bookings, bookings[1:]):
        if cur[0] < prev[1]:  # starts before the previous one ends
            return False
    return True
```

The comparison at the edge decides what "touching" means. Is a meeting from 9 to 10 in conflict with one from 10 to 11? Each problem says, and it decides `<` versus `<=`. Read it carefully.

## Merging

To merge overlapping intervals, keep a *current* interval and grow it while the next one overlaps; when one doesn't, the current interval is finished:

```javascript
function totalCovered(intervals) {
  // How much of the number line the intervals cover, counting overlaps once.
  intervals.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [start, end] = intervals[0];
  for (const [s, e] of intervals.slice(1)) {
    if (s <= end) {
      end = Math.max(end, e); // overlaps: extend
    } else {
      total += end - start;   // a gap: the current block is finished
      [start, end] = [s, e];
    }
  }
  return total + (end - start);
}
```

`Math.max` matters: an interval can sit entirely inside the current one, like `[1, 10]` then `[2, 3]`, and must not shrink it.

## Counting what's happening at once: the sweep line

*How many meetings are on at the same time, at most?* Turn every interval into two **events**: +1 at its start and −1 at its end. Sort all the events by time and walk through them, keeping a running count. The largest count is the answer:

```python
def most_at_once(meetings):
    events = []
    for start, end in meetings:
        events.append((start, 1))
        events.append((end, -1))
    events.sort()  # at the same time, -1 sorts before +1: one ends, then the next starts
    on = best = 0
    for _, change in events:
        on += change
        best = max(best, on)
    return best
```

The order of events at the **same time** is the touching rule again: here an end at minute 10 is processed before a start at minute 10, so back-to-back meetings don't count as overlapping. Swap the order and they would.

## Greedy choices on intervals

Some interval problems ask you to *choose* intervals: the most meetings you can attend, the fewest arrows to burst every balloon. These are solved by sorting too, but often by **end** rather than start, and choosing greedily. That's covered in the Greedy tutorial.
