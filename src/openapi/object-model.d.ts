/**
 * What a field of an OpenAPI Object holds: an Object by its name in the
 * model, where `"Schema"` is a Schema Object, or a map or an array of them
 */
export type Field = string | { map: Field } | { array: Field };

/**
 * The Objects of an OpenAPI version that lead to Schema Objects, by name,
 * with the fields that do. `"*"` is every field that isn't one of the
 * Object's fixed fields or an `x-` extension, like the paths in the Paths
 * Object. `OpenAPI` is the root.
 */
export type ObjectModel = Readonly<Record<string, Readonly<Record<string, Field>>>>;
