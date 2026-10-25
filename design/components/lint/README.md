# Linting

The reason for building on unified is its linting ecosystem: rules that are
plugins, configured per project, with presets, like remark-lint.

## Contents

- [Validity and lint](validity.md): what's an error and what's lint
- [Rules](rules.md): how rules are made, exported, and configured
- [The rule catalogue](catalogue.md): porting rules, and rules of our own
- [Configuration comments](configuration-comments.md)
- [Other schemas](other-schemas.md): rules that follow references
- [Linting from code](lint-api.md): `lint(uri)`
- [What a keyword group does](effect.md): `effect.js`, and the rules on it
- [Schema groups](schema-groups.md)

Each rule is documented for users in
[`website/linting/rules/`](../../../website/linting/rules/README.md).
