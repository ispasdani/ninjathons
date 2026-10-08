Every web page is an HTML file: text marked up with **elements** that say what each part is. The browser reads that structure and draws the page. CSS, the next lesson, decides how it looks; HTML decides what's there.

## Elements and tags

An element is usually an opening tag, some content, and a closing tag:

```html
<h1>Shopping list</h1>
<p>For Saturday's picnic.</p>
```

`<h1>` opens a top-level heading and `</h1>` closes it. Elements nest inside each other like boxes, and must close in reverse order: `<p><a>…</a></p>`, never `<p><a>…</p></a>`.

## The elements you'll use most

| Element | For |
|---|---|
| `<h1>` … `<h6>` | headings, from the page title (`h1`) down to small sub-headings |
| `<p>` | a paragraph |
| `<ul>` + `<li>` | a bulleted (unordered) list |
| `<ol>` + `<li>` | a numbered (ordered) list |
| `<a href="…">` | a link |
| `<img src="…" alt="…">` | a picture |
| `<strong>`, `<em>` | important and emphasised text, inside a paragraph |

Pick elements for what the content **is**, not how it looks. A heading is an `<h1>` even if you'd like it small; CSS can change the size. Screen readers, search engines and browsers' reader modes all rely on that structure: a screen reader user can jump from heading to heading, and hears "list, 4 items".

## Lists

```html
<ol>
  <li>Bread</li>
  <li>Cheese</li>
</ol>
```

Use `<ol>` when the order matters (steps, rankings) and `<ul>` when it doesn't. Every item is its own `<li>`.

## Attributes

Extra information goes in **attributes** inside the opening tag: `name="value"`.

```html
<a href="https://example.com/pixel">Read her adoption story</a>
<img src="pixel.jpg" alt="A grey cat asleep on a keyboard" width="240" height="160">
```

- `href` is where a link goes. A full address starts with `https://`; without it, `example.com/pixel` would be treated as a file next to the current page.
- `src` is the picture's address. `<img>` has no closing tag: it has no content, only attributes.
- `alt` describes the picture for people who can't see it, and shows when it fails to load. Describe what matters in the picture, not "image of".
- `width` and `height` reserve the space before the picture loads, so the page doesn't jump around.

## A whole page

A complete file wraps everything in a little standard structure. The exercises add it for you, so you only write what goes in the body, but this is what a real page file looks like:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Our cat, Pixel</title>
  </head>
  <body>
    <h1>Our cat, Pixel</h1>
  </body>
</html>
```

In these exercises the checks compare your page's elements with the target's: which elements are there, in what order, their text, and their important attributes. Use the side-by-side view to compare as you go.
