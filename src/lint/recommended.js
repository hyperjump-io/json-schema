import thenElseWithoutIf from "./rules/then-else-without-if.js";
import ifWithoutThenElse from "./rules/if-without-then-else.js";
import duplicateEnumValues from "./rules/duplicate-enum-values.js";
import emptyEnum from "./rules/empty-enum.js";
import emptyType from "./rules/empty-type.js";
import duplicateOneOfSchemas from "./rules/duplicate-one-of-schemas.js";
import contradictoryLimits from "./rules/contradictory-limits.js";
import additionalItemsWithoutItemsArray from "./rules/additional-items-without-items-array.js";
import ignoredRefSiblings from "./rules/ignored-ref-siblings.js";
import constAndEnum from "./rules/const-and-enum.js";
import contentSchemaWithoutMediaType from "./rules/content-schema-without-media-type.js";
import dependencyOnRequiredProperty from "./rules/dependency-on-required-property.js";
import keywordForDisallowedType from "./rules/keyword-for-disallowed-type.js";
import minPropertiesCoveredByRequired from "./rules/min-properties-covered-by-required.js";
import typeImpliedByConstOrEnum from "./rules/type-implied-by-const-or-enum.js";
import constOrEnumValueForDisallowedType from "./rules/const-or-enum-value-for-disallowed-type.js";
import requiredPropertyNotAllowed from "./rules/required-property-not-allowed.js";
import requiredPropertyNotDefined from "./rules/required-property-not-defined.js";
import keywordWithoutType from "./rules/keyword-without-type.js";
import readOnlyAndWriteOnly from "./rules/read-only-and-write-only.js";
import minMaxContainsWithoutContains from "./rules/min-max-contains-without-contains.js";
import referenceWithoutTarget from "./rules/reference-without-target.js";

/**
 * @import { Preset } from "unified"
 */

/** @type Preset */
const recommended = {
  plugins: [
    [thenElseWithoutIf, ["warn"]],
    [ifWithoutThenElse, ["warn"]],
    [duplicateEnumValues, ["warn"]],
    [emptyEnum, ["warn"]],
    [emptyType, ["warn"]],
    [duplicateOneOfSchemas, ["warn"]],
    [contradictoryLimits, ["warn"]],
    [additionalItemsWithoutItemsArray, ["warn"]],
    [ignoredRefSiblings, ["warn"]],
    [constAndEnum, ["warn"]],
    [contentSchemaWithoutMediaType, ["warn"]],
    [dependencyOnRequiredProperty, ["warn"]],
    [keywordForDisallowedType, ["warn"]],
    [minPropertiesCoveredByRequired, ["warn"]],
    [typeImpliedByConstOrEnum, ["warn"]],
    [constOrEnumValueForDisallowedType, ["warn"]],
    [requiredPropertyNotAllowed, ["warn"]],
    [requiredPropertyNotDefined, ["warn"]],
    [keywordWithoutType, ["warn"]],
    [readOnlyAndWriteOnly, ["warn"]],
    [minMaxContainsWithoutContains, ["warn"]],
    [referenceWithoutTarget, ["error"]]
  ]
};

export default recommended;
