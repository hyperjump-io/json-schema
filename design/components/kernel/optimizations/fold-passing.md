# `fold-passing.js`

A schema that passes every instance and has no effect
anything in the mode can see (`true`, `{}`, or only annotations when
nothing sees them) is `pass` wherever it's applied. An operation that
applies `pass` to children is `pass` too, unless something reads marks,
because it marks what it evaluates. It's what `alwaysPasses` did before
the kernel, and it was worth 10–20% on `package.json`.
