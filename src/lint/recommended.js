import thenElseWithoutIf from "./rules/then-else-without-if.js";
import ifWithoutThenElse from "./rules/if-without-then-else.js";
import duplicateEnumValues from "./rules/duplicate-enum-values.js";
import duplicateOneOfSchemas from "./rules/duplicate-one-of-schemas.js";
import duplicateAllOfAnyOfSchemas from "./rules/duplicate-all-of-any-of-schemas.js";
import contradictoryLimits from "./rules/contradictory-limits.js";
import impossibleProperty from "./rules/impossible-property.js";
import additionalItemsWithoutItemsArray from "./rules/additional-items-without-items-array.js";
import ignoredRefSiblings from "./rules/ignored-ref-siblings.js";
import contentSchemaWithoutMediaType from "./rules/content-schema-without-media-type.js";
import dependencyOnRequiredProperty from "./rules/dependency-on-required-property.js";
import keywordForDisallowedType from "./rules/keyword-for-disallowed-type.js";
import minPropertiesCoveredByRequired from "./rules/min-properties-covered-by-required.js";
import typeImpliedByConstOrEnum from "./rules/type-implied-by-const-or-enum.js";
import constOrEnumValueForDisallowedType from "./rules/const-or-enum-value-for-disallowed-type.js";
import requiredPropertyNotAllowed from "./rules/required-property-not-allowed.js";
import requiredPropertyNotDefined from "./rules/required-property-not-defined.js";
import keywordWithoutType from "./rules/keyword-without-type.js";
import redundantNumericLimit from "./rules/redundant-numeric-limit.js";
import emptyThenElse from "./rules/empty-then-else.js";
import falseThenElse from "./rules/false-then-else.js";
import minContainsZeroWithoutMaxContains from "./rules/min-contains-zero-without-max-contains.js";
import fractionalLimitForInteger from "./rules/fractional-limit-for-integer.js";
import unsafeIntegerLimit from "./rules/unsafe-integer-limit.js";
import readOnlyAndWriteOnly from "./rules/read-only-and-write-only.js";
import minMaxContainsWithoutContains from "./rules/min-max-contains-without-contains.js";
import referenceWithoutTarget from "./rules/reference-without-target.js";
import referenceByLocation from "./rules/reference-by-location.js";
import nonCanonicalDialectUri from "./rules/non-canonical-dialect-uri.js";
import invalidDialectUri from "./rules/invalid-dialect-uri.js";
import relativeRootId from "./rules/relative-root-id.js";
import implicitDialect from "./rules/implicit-dialect.js";
import keywordWithoutEffect from "./rules/keyword-without-effect.js";
import emptyCatchAllSchema from "./rules/empty-catch-all-schema.js";
import unevaluatedWithoutEffect from "./rules/unevaluated-without-effect.js";
import unknownKeyword from "./rules/unknown-keyword.js";
import multipleOfOne from "./rules/multiple-of-one.js";
import singleTypeArray from "./rules/single-type-array.js";
import mergeableSchemas from "./rules/mergeable-schemas.js";
import misnamedDefinitions from "./rules/misnamed-definitions.js";
import singleValueEnum from "./rules/single-value-enum.js";
import singleValueRange from "./rules/single-value-range.js";
import propertyNamesType from "./rules/property-names-type.js";
import requiredDependentProperty from "./rules/required-dependent-property.js";
import keywordImpliedByConstOrEnum from "./rules/keyword-implied-by-const-or-enum.js";
import constOrEnumValueRejected from "./rules/const-or-enum-value-rejected.js";
import invalidDefaultOrExample from "./rules/invalid-default-or-example.js";
import keywordAllowsNothing from "./rules/keyword-allows-nothing.js";
import misplacedDialect from "./rules/misplaced-dialect.js";
import misplacedVocabulary from "./rules/misplaced-vocabulary.js";
import duplicateArrayItems from "./rules/duplicate-array-items.js";
import emptyArray from "./rules/empty-array.js";

/**
 * @import { Preset } from "unified"
 */

/** @type Preset */
const recommended = {
  plugins: [
    [thenElseWithoutIf, ["warn"]],
    [ifWithoutThenElse, ["warn"]],
    [duplicateEnumValues, ["warn"]],
    [keywordAllowsNothing, ["warn"]],
    [duplicateOneOfSchemas, ["warn"]],
    [duplicateAllOfAnyOfSchemas, ["warn"]],
    [contradictoryLimits, ["warn"]],
    [impossibleProperty, ["warn"]],
    [additionalItemsWithoutItemsArray, ["warn"]],
    [ignoredRefSiblings, ["warn"]],
    [contentSchemaWithoutMediaType, ["warn"]],
    [dependencyOnRequiredProperty, ["warn"]],
    [keywordForDisallowedType, ["warn"]],
    [minPropertiesCoveredByRequired, ["warn"]],
    [typeImpliedByConstOrEnum, ["warn"]],
    [constOrEnumValueForDisallowedType, ["warn"]],
    [requiredPropertyNotAllowed, ["warn"]],
    [requiredPropertyNotDefined, ["warn"]],
    [keywordWithoutType, ["warn"]],
    [redundantNumericLimit, ["warn"]],
    [emptyThenElse, ["warn"]],
    [falseThenElse, ["warn"]],
    [minContainsZeroWithoutMaxContains, ["warn"]],
    [fractionalLimitForInteger, ["warn"]],
    [unsafeIntegerLimit, ["warn"]],
    [readOnlyAndWriteOnly, ["warn"]],
    [minMaxContainsWithoutContains, ["warn"]],
    [nonCanonicalDialectUri, ["warn"]],
    [relativeRootId, ["warn"]],
    [implicitDialect, ["warn"]],
    [referenceByLocation, ["warn"]],
    [keywordWithoutEffect, ["warn"]],
    [emptyCatchAllSchema, ["warn"]],
    [unevaluatedWithoutEffect, ["warn"]],
    [unknownKeyword, ["warn"]],
    [multipleOfOne, ["warn"]],
    [singleTypeArray, ["warn"]],
    [mergeableSchemas, ["warn"]],
    [misnamedDefinitions, ["warn"]],
    [singleValueEnum, ["warn"]],
    [singleValueRange, ["warn"]],
    [propertyNamesType, ["warn"]],
    [requiredDependentProperty, ["warn"]],
    [keywordImpliedByConstOrEnum, ["warn"]],
    [constOrEnumValueRejected, ["warn"]],
    [invalidDefaultOrExample, ["warn"]],
    [invalidDialectUri, ["error"]],
    [misplacedDialect, ["error"]],
    [misplacedVocabulary, ["error"]],
    [duplicateArrayItems, ["error"]],
    [emptyArray, ["error"]],
    [referenceWithoutTarget, ["error"]]
  ]
};

export default recommended;
