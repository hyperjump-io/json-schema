# Plugins see what was evaluated

What plugins and output formats see can depend on how a schema was
optimized. A coverage plugin that reports what was evaluated is reporting
something true. What can't change, and what can never be wrong:

- Results, marks, and annotations are the same with or without
  optimizations, including for values that couldn't be parsed.
- Every hook call is about what it says: an error is never reported at a
  keyword that didn't fail, and conditions stay recognizable.
- Nothing stops early when a plugin needs every error. Leaving out what
  can't pass the instance's type or tag isn't stopping early, because it's
  decided before anything is evaluated.

So optimizations are judged with plugins by correctness, not by whether
the hook calls match the unoptimized ones. Optimizations like dispatch run
with plugins too (see [Optimizer](../specs/kernel/optimizer.md) and
[Plugins](../components/kernel/plugins.md)).
