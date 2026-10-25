# Modes

First recorded 2026-10-19.

`benchmarks/modes.bench.ts` times every mode of a
`Validator` against the others, without other implementations. It runs on
the v1 test cases v2 gets right. Each instance is a JS value,
its JSON text, or a JSON AST built from it with browser's `fromJs` before
the timed part. Annotating a node adds to the annotations already on it, so
`annotateNode` gets new nodes before each run, which isn't timed. Error modes
go through every error.

Results from 2026-10-21 (mean time per run of the suite, the range over
five runs):

| Mode | JS value | JSON text | JSON AST |
| --- | --- | --- | --- |
| FLAG | 0.21–0.22 ms | 2.27–2.72 ms | 0.33–0.35 ms |
| BASIC | 0.72–0.74 ms | 3.00–3.43 ms | 0.86–1.02 ms |
| DETAILED | 0.72–0.82 ms | 3.15–3.66 ms | 0.88–1.01 ms |
| Annotations | 0.84–1.21 ms | 2.62–2.89 ms | 0.70–0.78 ms |

- Parsing JSON text costs more than evaluating in every mode. FLAG on text
  is about 10–13 times slower than on a value, and about 2–2.5 ms of every
  text row is parsing. The text rows and `annotate` vary the most between
  runs, by up to 20% and 44%.
- FLAG on an AST is about 1.6 times slower than on a value. An AST is
  evaluated by its own specialization, which reads values through the nodes
  (see [Compile and evaluate](../components/kernel/README.md)). It was about 2 times slower
  until `Validator` stopped building a string key to find the
  specialization on every call.
- DETAILED costs about the same as BASIC now that both collect errors in
  one list (see [Output formats](../components/kernel/output-formats.md)). It was 1.08–1.16 times
  slower.
- BASIC and DETAILED are less than half what they were (1.70 ms and
  1.98 ms for a value before errors became plain objects and the changes
  in [Plugins](plugins.md)). BASIC is now faster than annotating a value, but
  `annotateNode` is still faster than BASIC on an AST. `annotate` is slower
  than `annotateNode` because it builds the AST from the value itself.
- 2020-12 gives results within a few percent of v1. The suite's test cases
  mostly don't have `$schema`, so both run nearly the same test cases with
  mostly the same keywords.
