# Vocabularies

- `$vocabulary` was removed in v1 but is still supported for 2019-09 and
  2020-12. The core doesn't know about it or about vocabularies. The
  `$vocabulary` keyword (`src/keywords/vocabulary.js`) finds the
  vocabularies it lists (`{ keywords, formats, assertFormats }`) with
  `vocabulary(uri)` in its resolve context. Rejected: the whole config in
  the context, when finding a vocabulary is all a resolving keyword needs
  it for.
  Its hook merges the listed vocabularies into one dialect, with unknown
  keywords as annotations. Formats assert if any listed vocabulary says so,
  which is how 2020-12's format-assertion vocabulary works. A required
  vocabulary the keyword doesn't know is a problem with the meta-schema,
  reported on the vocabulary's URI, so the meta-schema can't be used. A
  vocabulary URI that isn't an IRI is reported by the keyword's `check`
  and skipped by its hook, so the rest of the dialect is still built.
- Vocabularies are definitions, like keywords, so they're in the config:
  a dialect carries the vocabularies its meta-schemas use (2019-09's and
  2020-12's, in their `vocabularies`), and the config's `vocabularies` adds
  more by URI. A vocabulary's keywords and formats are definitions or URIs,
  like a dialect's, and are registered the same way. Every dialect that has
  `$vocabulary` sees every vocabulary, because `$vocabulary` means the same
  thing in 2019-09 and 2020-12 and their vocabulary URIs don't overlap. One
  in the config replaces a dialect's with the same URI.
- Vocabularies are in the config, and the keyword finds them in the
  resolve context (`ResolveContext.vocabulary`), which keeps the keyword
  stateless. Rejected: `addVocabulary(config, uri, vocabulary)`, which
  replaces the `$vocabulary` keyword with one whose map has the vocabulary
  too. With definitions only in the config, that would be a keyword
  factory passed in `keywords`, and two libraries adding vocabularies
  would have to chain each other's.
