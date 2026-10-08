A stack is a pile: you add to the top and take from the top. The last thing in is the first thing out. That simple rule fits a surprising number of problems: undo history, the browser's back button, nested structures, and anything where the most recent unfinished thing has to be dealt with first.

## Using a stack

Both languages use a plain list or array as a stack:

```javascript
const stack = [];
stack.push(3);        // add to the top
stack.push(7);
stack[stack.length - 1]; // 7, look at the top
stack.pop();          // 7, take it off
stack.length === 0;   // empty?
```

```python
stack = []
stack.append(3)  # add to the top
stack.append(7)
stack[-1]        # 7, look at the top
stack.pop()      # 7, take it off
not stack        # empty?
```

Both operations are O(1).

## Matching pairs

Nested structures close in the reverse order they open: the most recently opened thing closes first. That's exactly a stack. To check that HTML-style tags are properly nested:

```python
def tags_nested(tags):  # ["<b>", "<i>", "</i>", "</b>"]
    open_tags = []
    for tag in tags:
        if not tag.startswith("</"):
            open_tags.append(tag[1:])  # remember "b>"
        elif not open_tags or open_tags.pop() != tag[2:]:
            return False  # closing something that isn't the latest open tag
    return not open_tags  # anything still open is unbalanced
```

Three ways to fail, and all three need checking: a closing tag with nothing open, a closing tag that doesn't match the latest open one, and tags left open at the end. Brackets work exactly the same way.

## The monotonic stack

The second big use answers "for each item, what's the **next** item that is bigger (or smaller)?" The brute force looks ahead from every item: O(n²). A **monotonic stack** answers all of them in one pass.

Keep a stack of items still *waiting* for their answer, in decreasing order. When a new item arrives, every waiting item smaller than it has just found its answer: pop them and record it. Then push the new item, which now waits too.

For each price, the next price that's **higher**:

```javascript
function nextHigher(prices) {
  const answer = new Array(prices.length).fill(-1);
  const waiting = []; // positions, prices decreasing
  for (let i = 0; i < prices.length; i++) {
    while (waiting.length && prices[waiting[waiting.length - 1]] < prices[i]) {
      answer[waiting.pop()] = prices[i];
    }
    waiting.push(i);
  }
  return answer; // -1 where nothing later is higher
}
```

```python
def next_higher(prices):
    answer = [-1] * len(prices)
    waiting = []  # positions, prices decreasing
    for i, p in enumerate(prices):
        while waiting and prices[waiting[-1]] < p:
            answer[waiting.pop()] = p
        waiting.append(i)
    return answer  # -1 where nothing later is higher
```

Each position is pushed once and popped at most once: O(n) in total, however the loop looks. Storing **positions** rather than values, as here, keeps both the value and where it was.

## When to reach for it

- Things **open and close** in nested order: brackets, tags, function calls.
- You need the **next or previous greater/smaller** item for every position.
- You're processing something left to right and sometimes need to **go back to the most recent** unfinished item.
