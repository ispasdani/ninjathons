CSS decides how HTML looks: colours, sizes, spacing, and where things go. Two ideas explain most layouts: every element is a **box**, and **flexbox** lines boxes up in a row or a column.

## Rules

A CSS rule picks elements with a **selector** and sets **properties** on them:

```css
.card {
  background: #ffffff;
  padding: 24px;
}
```

| Selector | Picks |
|---|---|
| `p` | every `<p>` |
| `.card` | every element with `class="card"` |
| `#main` | the element with `id="main"` |
| `.links a` | every `<a>` inside an element with class `links` |

## The box model

Every element is a rectangle made of four layers, from the inside out:

1. **content**: the text or picture,
2. **padding**: space inside the border,
3. **border**,
4. **margin**: space outside, between this box and its neighbours.

```css
.card {
  width: 320px;
  padding: 24px;
  border: 1px solid #e5e5e5;
  margin: 0 auto; /* 0 top and bottom, centred left and right */
}
```

By default `width` sets the *content* only, so this card is really 320 + 2 × 24 + 2 × 1 = 370 pixels wide. Almost everyone switches that off:

```css
.card {
  box-sizing: border-box; /* width now includes padding and border */
}
```

`margin: 0 auto` centres a block that has a width: the left and right margins share the space that's left. Add `max-width: 100%` so it shrinks instead of overflowing on a narrow phone.

Shorthands set several sides at once, clockwise from the top: `padding: 16px 24px` is 16 top and bottom, 24 left and right.

## Flexbox

`display: flex` on a parent lays its children out in a row:

```css
.nav {
  display: flex;
  justify-content: space-between; /* along the row: push to the ends */
  align-items: center;            /* across the row: centre vertically */
  gap: 16px;                      /* space between the children */
}
```

- `justify-content` spreads the children along the row: `flex-start` (default), `center`, `space-between`, `flex-end`.
- `align-items` lines them up across it: `stretch` (default), `center`, `flex-start`.
- `gap` puts space between them without margins on each child.
- `flex-direction: column` turns the row into a column.
- `flex-shrink: 0` on a child stops it being squeezed when space runs out.

## Starting from the browser's defaults

Browsers give many elements their own styling: `body` has an 8-pixel margin, lists have bullets and a left indent, links are blue and underlined. Matching a design often starts with removing them:

```css
body { margin: 0; }
ul { list-style: none; margin: 0; padding: 0; }
a { text-decoration: none; color: inherit; }
```

## Colours and rounding

Colours are usually written in hex, `#c4f012`: two digits each for red, green and blue. `border-radius: 12px` rounds the corners; `border-radius: 50%` on a square makes a circle.

In the exercises, use **Overlay** to lay the target over your page: anything in the wrong place shows twice. The checks compare the computed styles and the position and size of each box, at each width the challenge lists.
