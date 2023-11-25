# Bundler Tests

The testing strategy used by this Test Suite is based on the concept that it
should be indistinguishable whether the user evaluated the schema using the
bundle or using individually loaded schemas. Test Runners should validate each
Test twice, once with all schemas loaded individually and again using just the
bundle. The Test passes if both evaluations produce identical output.

The accuracy of this testing approach is dependent on how detailed the output
is. It's recommended that Test Runner use a validator implementation that
supports the
["verbose"](https://json-schema.org/draft/2020-12/json-schema-core#name-verbose)
official output format or something similarly detailed that can be used for
comparison.

## Supported Dialects

Although the topic of bundling didn't appear in the spec until 2020-12, the
process described is applicable since `id` (now `$id`) was introduced in
draft-03. Test Cases in this Test Suite are designed to be compatible with as
many releases of JSON Schema as possible. They do not include a `$schema`
keyword so that implementations can run the same Test Suite for each dialect
they support. The Test Runner should define what dialect it's using to run the
Test Suite.

Since this Test Suite can be used for a variety of dialects, there are a couple
of options that can be used by Test Runners to filter out Test Cases that don't
apply to the dialect under test.

## Test Case Components

### description

A short description of what behavior the Test Case is covering.

### compatibility

The `compatibility` option allows you to set which dialects the Test Case is
compatible with. Test Runners can use this value to filter out Test Cases that
don't apply the to dialect currently under test. Dialects are indicated by the
number corresponding to their release. Date-based releases use just the year.

If this option isn't present, it means the Test Case is compatible with draft-03
and above.

If this option is present with a number, the number indicates the minimum
release the Test Case is compatible with. This example indicates that the Test
Case is compatible with draft-07 and up.

**Example**: `"compatibility": "7"`

You can use a `<=` operator to indicate that the Test Case is compatible with
releases less then or equal to the given release. This example indicates that
the Test Case is compatible with 2019-09 and under.

**Example**: `"compatibility": "<=2019"`

You can use comma-separated values to indicate multiple constraints if needed.
This example indicates that the Test Case is compatible with releases between
draft-06 and 2019-09.

**Example**: `"compatibility": "6,<=2019"`

For convenience, you can use the `=` operator to indicate a Test Case is only
compatible with a single release. This example indicates that the Test Case is
compatible only with 2020-12.

**Example**: `"compatibility": "=2020"`

### requiredDialects

Since 2020-12, it's been allowed to have bundles that include schemas using
dialects different from the parent schema. In order to test this, it's necessary
to have an external schema that declares a dialect with `$schema`. The
`requiredDialects` option can be included to tell the Test Runner which dialects
are required to run the Test Case other than the dialect under test. This option
is an array of numbers corresponding to release numbers. Date-based releases use
just the year.

**Example**: `"requiredDialects": [2019]`

### schema

The schema that will serve as the entry point of the bundle. This schema
shouldn't include `$schema` or `id`/`$id` because Test Cases should be designed
to work with as many releases as possible.

### externalSchemas

`externalSchemas` is where you define the schemas that the schema in `schema`
references and you expect to get embedded into the bundled schema. The value is
an object where the keys are retrieval URIs and values are schemas. Most
external schemas aren't self identifying (using `id`/`$id`) and rely solely on
the retrieval URI for identification. This is done to increase the number of
dialects that the test is compatible with. Because `id` changed to `$id` in
draft-06, if you use `$id`, the test becomes incompatible with draft-03/4 and in
most cases, that's not necessary.

### tests

`tests` are a collection of Tests to run to verify the Test Case. Tests don't
include an expected pass/fail for the instance because we don't care if the
instance is valid or not, we care only whether the bundle produces the same
results as its unbundled equivalent.

Tests should be designed to expose potential differences between the bundled and
unbundled evaluations. You should have at least one Test that's expected to pass
to ensure that annotations are equivalent and at least one Test that's expected
to fail to ensure errors are equivalent.

## Fixtures

Often we don't care what's in the externally referenced schemas and end up using
the same simple and generic schemas in a lot of tests. In order to reduce
duplication, there are a couple of generic schemas defined that test runners
should load in addition to `externalSchemas` for each Test Case.

Fixtures are expected to be simple, compatible with all dialects, and not
critical to understanding what is being tested. Anything that doesn't meet those
criteria is better off declared in `externalSchemas`.

## Directory Structure

* tests - A directory containing the full Test Suite.
  * tests.json - A Test Suite covering functionality in the latest spec release.
  * legacy-tests.json - A Test Suite covering functionality that was removed in
    a previous release. This is mostly adaptations of Test Cases that use `$id`
    or `$defs` to cover the same functionality for older releases that use `id`
    or `definitions`. Test Cases involving other removed keywords such as
    `dependencies` and `recursiveRef` can be found here as well.
* fixtures - A collection of simple and reusable schemas
  * string.schema.json
  * number.schema.json
  * ... etc
