# Plugins (`src/kernel/evaluation-plugin.d.ts`)

Plugins only observe evaluation. Nothing built in needs to change it. They're
passed per call (`ValidationOptions.plugins`) and are usually stateful
objects the caller reads results from afterwards.

- Hooks are `beforeSchema`, `afterSchema`, `beforeKeyword`,
  `afterKeyword`, and `annotation`. State is passed explicitly instead of through v1's shared
  context object: each `before` hook returns the plugin's state for that
  evaluation, which the core gives to the matching `after` hook and to what's
  evaluated inside it (a schema's state to its keywords, a keyword's state to
  the subschemas it applies). The core keeps the stack. That's enough to
  build nested results like DETAILED without touching shared objects.
- Plugins see keyword groups, never operations. An error is reported for a
  keyword, never for an operation inside it.
- Hook calls nest: everything between a group's `beforeKeyword` and
  `afterKeyword` is that group's. Output formats depend on it (BASIC's state
  is where a keyword's errors start in one list), so two groups' subschemas
  are never evaluated interleaved. Across a schema's groups, only matching
  properties is merged: one pass over the properties finds which groups'
  operations each one is for, and each group then evaluates its matches
  between its own hooks.
- `annotation` is called when a keyword annotates, with the keyword's
  state, before `afterKeyword`. It's called for every annotation, even ones
  that aren't kept because the keyword or a schema it was evaluated through
  fails, because the language server needs annotations for invalid
  documents. A plugin that wants the spec's rule can apply it, because
  `afterKeyword` and `afterSchema` say what passed.
- Hooks get a `SchemaInfo` or `KeywordInfo`, created once per evaluator
  so passing it doesn't allocate, with its absolute keyword location.
  `KeywordInfo` has the group's `expression` and `sources`, and what output
  formats need from the expression, computed once: `explainsFailure` and
  `conditions`. Hooks also get an `EvaluationLocation` with the instance
  location, the AST node when there is one, and a lazy `value()`.
- With any plugin, the instance is evaluated once and nothing stops early.
  A plugin never sees an instance twice (coverage counts) and always sees
  every keyword that applies. That makes plugins slower, which is the
  trade-off.
- Without optimizations, the hook calls are the same as before the kernel.
  With them, each hook call is one the unoptimized evaluation makes too, in
  the same order.
- Plugins are an important path (the language server evaluates with them),
  so what the core does for them is kept small:
  - Several plugins are combined into one plugin whose states are arrays.
    The evaluator calls one plugin's hooks with plain states, so the
    usual case of one plugin doesn't loop or allocate arrays.
  - An `EvaluationLocation` is only about where in the instance, so every
    schema and keyword evaluated on the same instance (through `allOf`,
    `$ref`, …) shares one. It's created when evaluation moves to a property
    or item, not for every hook call, and it doesn't change, so a plugin
    can keep it. Its `instanceLocation` is built from its parent's the
    first time it's read, because building a JSON Pointer for every schema
    evaluated on a child was 13–25% of evaluating with plugins, and most
    plugins only read it for a few hook calls, like an error's. A plugin
    that reads it in every hook is no slower (−1% to +2%).
  - It's an instance of one class shared by every evaluator, with
    `value()` as a method, so it's one allocation and hooks always see the
    same shape.
  - An array index is appended to the instance location without escaping.
  - An AST's instance locations are built the same way as a JS value's,
    even though each node has its location from parsing. Taking it from
    the node (the part after the root node's location, percent-decoded)
    wasn't faster with plugins that don't read it, and was up to 10%
    slower with ones that do.
  - Plugins need to be easy to write, so expensive parts aren't made lazy
    in ways plugins have to know about. A shared location that's only valid
    during the hook, with pointers built when they're read, was about as
    fast for most plugins but made them harder to write, and didn't help
    BASIC, which reads locations for every failing keyword. Recording a
    trace of integers instead of calling hooks was slower than calling
    them.

There's no keyword location that follows references (the output spec's
`keywordLocation`), only the absolute keyword location. It cost every
evaluation with plugins a string for every keyword, and a step from each
keyword to its subschemas recorded in the compiled schema, for something
that's rarely useful. A plugin that wants it can build it from
`beforeSchema` and `afterSchema`.
