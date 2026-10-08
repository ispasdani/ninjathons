Forms are how a page asks for something: a search box, a sign-in, a checkout. HTML has a field for most kinds of answer, and choosing the right one gives you checking, the right keyboard on phones, and an accessible page for free.

## A form and its fields

```html
<form>
  <p>
    <label for="email">Email</label>
    <input type="email" id="email" required>
  </p>
  <button type="submit">Subscribe</button>
</form>
```

- `<form>` wraps the fields that are sent together.
- `<input>` is a field. It has no closing tag; everything is in attributes.
- `<button type="submit">` sends the form.

## Pick the right type

| `type` | For | What it adds |
|---|---|---|
| `text` | names, short answers | nothing special |
| `email` | email addresses | checks there's an `@`; email keyboard on phones |
| `password` | passwords | hides what's typed |
| `number` | quantities | number keyboard, up and down arrows |
| `checkbox` | yes/no choices | a box to tick |
| `date` | dates | a date picker |

## Labels

Every field needs a `<label>`. Its `for` attribute names the field's `id`:

```html
<label for="name">Name</label>
<input type="text" id="name">
```

Clicking the label then focuses the field (or ticks the checkbox), which makes small targets easier to hit, and screen readers read the label out when the field is focused. A `placeholder` (grey text inside the field) isn't a label: it vanishes as soon as you type, and many screen readers skip it.

For a checkbox, the box usually comes first and the label after it.

## Checking before sending

The browser checks these attributes before it lets the form be sent, and shows a message next to the field:

- `required`: the field can't be empty.
- `minlength="8"` / `maxlength="40"`: limits on the length of text.
- `min` and `max`: limits on numbers and dates.

```html
<input type="password" id="password" minlength="8" required>
```

`required` has no value: writing it is enough. This checking is for the person filling in the form; a real website checks everything again on the server, because anyone can send a form without using the page.
