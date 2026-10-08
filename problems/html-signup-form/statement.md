Write the HTML for a sign-up form so it matches the target. The CSS is given.

## What to build

Inside a `<form>`, in this order:

1. A text field for the **Name**, with the id `name`.
2. An email field for the **Email**, with the id `email`.
3. A password field for the **Password**, with the id `password`, that must be at least 8 characters (`minlength`).
4. A checkbox, id `newsletter`, labelled **Send me the weekly newsletter**.
5. A button that submits the form: **Create account**.

Name, email and password are `required`. Every field has a `<label>` tied to it with `for`, so clicking the label focuses the field, and screen readers read it out. The checks compare the labels' text and `for`, and each field's `type`, `id`, `required` and `minlength`.
