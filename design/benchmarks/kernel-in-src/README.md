# The kernel in `src/`

First recorded 2026-10-24.

`benchmark/claude/kernel/check-src.ts` checks `src/` against the last
commit before the kernel moved into it (a worktree at
`../json-schema-kernel-baseline`), on the corpora, the corpora changed to
2020-12, and the test suites. It checks `validate`, a restored validator,
annotations, BASIC, and DETAILED, and every hook call from an evaluator
built without optimizations. Through `Validator`, which optimizes for what
plugins can see, every hook call has to be one the baseline makes too, in
the same order. It found no differences, about 8 million hook calls. The
expected BASIC differences (58) are errors the baseline reports for
keywords the kernel says explain their failure (`conditional`,
`dependencies` with only schemas, `anyOf` and `oneOf` of one schema), and
BASIC is exactly the baseline's without them.

Results from 2026-10-24, one run on a quiet machine (baseline time divided
by `src/`'s, so more than 1 is faster; ranges are over a corpus and its
2020-12 version, or over the suites). BASIC output only runs its plugin on
instances that fail. "Every hook" is a plugin with every hook that does
nothing, on every instance.

| | FLAG | BASIC output | Every hook | First `validate` |
| --- | --- | --- | --- | --- |
| `package.json`, small | 1.64–1.80× | 1.57–1.64× | 0.95× | 0.82× |
| `package.json`, medium | 1.42–1.47× | 1.44–1.50× | 0.94–0.98× | 0.83–0.84× |
| `package.json`, large | 3.01–3.23× | 3.02–3.27× | 1.11× | 0.77–0.85× |
| `tsconfig.json`, small | 1.88–2.00× | 1.84–1.95× | 0.92–0.94× | 0.61× |
| `tsconfig.json`, medium | 1.32–1.36× | 1.54–1.57× | 0.85–0.86× | 0.62–0.84× |
| OpenAPI 3.0, medium | 1.99× | 1.92× | 1.03× | 0.88× |
| Test suites | 1.28–1.57× | 0.88–1.05× | 0.87–0.96× | 0.89–0.93× |

- FLAG and BASIC are faster on every real-world group. FLAG on the suites
  is faster than in the prototype (0.94–1.23×).
- BASIC on the suites, where most instances fail, is about the same as
  the baseline.
- `check-src.ts` times everything at the end of one long process, which
  has already evaluated ASTs, annotated, and run other plugins, so its
  "Every hook" is worse than in a process of its own.
- Its "First `validate`" isn't a fair comparison. `cases.ts` compiles every
  case with the baseline while loading them, so the baseline's compiling is
  already optimized by V8 when it's timed, and `src/`'s isn't. Timed round
  by round, `src/` takes 21–27 ms on small `tsconfig.json` files at first,
  and 12 ms, the same as the baseline, from about the 16th round on, so 7
  rounds catch it warming up. Measured fairly, `src/` takes 1.03–1.2 times
  as long, well within the 1.5 times the plan allowed. That was before the
  optimizer changes below, which made it 1.09–1.18 on these. Lowering
  each thing once (below) made `src/` faster than the baseline when both
  are warm (0.83–0.95 times as long), and about the same cold (0.93–1.05):

  | First `validate` | Cold, at first | Optimizer changes | Lowering once | Both warm, at first | Optimizer changes | Lowering once |
  | --- | --- | --- | --- | --- | --- | --- |
  | `tsconfig.json` | 0.84× | 0.88× | 0.95× | 0.87–0.89× | 0.91–0.92× | 1.05–1.10× |
  | `package.json` | 0.82× | 0.87× | 1.01× | 0.83–0.87× | 0.87–0.90× | 1.09–1.21× |
  | OpenAPI 3.0 | 0.86× | 0.88× | 1.08× | 0.86–0.88× | 0.85–0.89× | 1.21× |

  Cold is the very first compile in a fresh process, nothing compiled
  before (`cold-first-validate.ts`, median of 5 processes: 44.7 ms for the
  baseline on `tsconfig.json`, 53.0 ms for `src/`, then 50.7, then 48.3
  against 45.8 for the baseline). Both warm is `first-validate.ts` with
  `WARM_SRC=1`, which compiles every case with `src/` too, then alternates
  the two (median of 15 rounds).
- Evaluating with every hook was 0.77–0.93 times the baseline on most
  groups before `jsInstance` and `astInstance` were instances of classes.
  In a process of its own (`profile-src.ts`), `src/` was faster than the
  baseline, and only slower after the process had also evaluated ASTs.
  `instrumented.js` evaluates plain values and ASTs, and V8 shares type
  feedback between the closures it builds. The two instance operation
  objects were object literals with the same properties, so they had one
  hidden class, and a call like `ops.typeOf` that saw both had no known
  target. The profile showed `typeOf`, `value`, and `get` no longer
  inlined, and plain values with plugins got about 20% slower (1.35 to
  1.64 ms on small `tsconfig.json` files). With a class each, V8 inlines
  both. A second copy of `instrumented.js` for ASTs
  (`./instrumented.js?ast`) did about as well, but needed a module
  specifier with a query, which not every tool supports.

  | Every hook | Alone, before | After ASTs, before | Alone | After ASTs |
  | --- | --- | --- | --- | --- |
  | `tsconfig.json`, small | 1.33× | 0.99× | 1.36× | 1.26× |
  | `tsconfig.json`, medium | 1.22× | 0.94× | 1.21× | 1.06× |
  | `package.json`, small | 1.06× | 1.06× | 1.14× | 1.13× |
  | v1 suite | 0.98× | 0.85× | 0.98× | 1.01× |

  What's left after ASTs (about 10% on small `tsconfig.json` files) is the
  closures themselves seeing two kinds of instance, which only duplicating
  the code would avoid. Evaluating ASTs with plugins (`validateJson`) was
  the same or faster with the change (2.76 to 2.41 ms on the v1 suite).

`time-phases.ts` splits the first `validate` (per case, median of 7
rounds). Compiling is in a new session, so it includes retrieving and
resolving. Lowering is again in a session that has every document, so it's
lowering alone. Building is lazy, so it's timed with the first evaluation.

| | Compile | Lower | Optimize for FLAG | Build fast, first FLAG | Optimize and build with plugins, first evaluation |
| --- | --- | --- | --- | --- | --- |
| `package.json` | 59–71 ms | 15–20 ms | 4.4–8.1 ms | 7.4–9.8 ms | 13–25 ms |
| `tsconfig.json` | 9.4–9.8 ms | 1.3–1.4 ms | 0.72–0.75 ms | 0.64–0.73 ms | 1.4–1.6 ms |
| OpenAPI 3.0 | 6.7 ms | 1.6 ms | 0.54 ms | 0.66 ms | 1.2 ms |
| Test suites | 0.058–0.066 ms | 0.016–0.022 ms | 0.003–0.006 ms | 0.003–0.007 ms | 0.006–0.014 ms |

- Lowering was about 40% of compiling at first: 37–50 ms on
  `package.json`, 3.1–5.2 ms on `tsconfig.json`, 4.6 ms on OpenAPI 3.0.
  Most of it was parsing IRIs (`@hyperjump/uri`'s regular expressions)
  and browser's `get`, for the same few answers. Lowering `package.json`'s
  4,304 schemas called `session.get` 1,824 times for 133 different
  references, `getDialect` 3,840 times (normalizing the IRI three times
  each), and `toAbsoluteIri` for each schema's resource, of which there are
  11 (`count-lower.ts`). `Lowerer` now works each out once per lowering:
  the node a reference refers to, a dialect, and a resource's IRI, by the
  part of a location before the fragment. It caches the node, not the
  handle, because a reference to a schema that's still being lowered would
  wait on itself. Lowering alone (`profile-lower.ts`) went from 38 to
  15 ms on small `package.json` files, and it's about 25% of compiling now
  (one `tsconfig.json` group took 3.2 ms in one run, an outlier). What's
  left is spread out: lowering's own code, `await`s, garbage collection
  (15%), and browser's `get` for the 133 references (10%). The rest of
  compiling is retrieving, parsing, and resolving.
- Optimizing for FLAG took 6.7–10.7 ms on `package.json` and 1.0–1.1 ms on
  `tsconfig.json` at first, about as long as building the evaluator.
  `drop-groups` copied every schema with an annotation, which `fast.js`
  skips anyway (2.1 ms on `package.json`), so it only runs with plugins
  now, and the evaluator for ASTs without plugins skips them too.
  `fold-passing` rebuilt every schema and normalized every expression
  again, though only 290 of `package.json`'s 4,304 schemas change. Keeping
  what doesn't change took it from 4.1 to 3.4 ms.
- Most of what's left is iterating the kernel's `schemas`. An object with
  4,304 URIs as keys is in V8's dictionary mode: building a table of them
  with `for … in` takes 0.74 ms, and checking whether any group reads
  marks takes 1.0 ms, about the same with `readsMarks` written not to
  allocate. Each pass and evaluator that scans the kernel pays that.
  Building `fold-passing`'s table in a `Map` was slower (4.4 ms), because
  the kernel needs an object again afterwards.
