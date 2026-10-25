# Vocabularies

- `$vocabulary` was removed in v1 but is still supported for 2019-09 and
  2020-12. The core doesn't know about it or about vocabularies. The
  `$vocabulary` keyword (`src/keywords/vocabulary.js`) knows a map of
  vocabulary URIs to vocabularies (`{ keywords, formats, assertFormats }`).
  Its hook merges the listed vocabularies into one dialect, with unknown
  keywords as annotations. Formats assert if any listed vocabulary says so,
  which is how 2020-12's format-assertion vocabulary works. A required
  vocabulary the keyword doesn't know is a problem with the meta-schema,
  reported on the vocabulary's URI, so the meta-schema can't be used.
- `addVocabulary(jsonSchema, uri, vocabulary)`, defined with the keyword, adds
  a vocabulary by replacing the `JsonSchema`'s `$vocabulary` keyword with one
  whose map has it too. Keyword definitions never change, so it's still per
  instance. 2019-09 and 2020-12 share the keyword, because `$vocabulary`
  means the same thing in both and their vocabulary URIs don't overlap. So a
  vocabulary is added once and works in every dialect that has
  `$vocabulary`, and vocabularies added by different code compose. The
  presets add their vocabularies with it too, and they export it. Users get
  it from a preset, not from the keyword's module, which isn't public.
