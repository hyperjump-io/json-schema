import anchorKeyword from "../../keywords/anchor.js";
import commentKeyword from "../../keywords/comment.js";
import definitionsKeyword from "../../keywords/definitions.js";
import dynamicAnchorKeyword from "../../keywords/dynamicAnchor.js";
import dynamicRefKeyword from "../../keywords/draft-2020-12/dynamicRef.js";
import idKeyword from "../../keywords/id.js";
import refKeyword from "../../keywords/ref.js";
import additionalPropertiesKeyword from "../../keywords/draft-2020-12/additionalProperties.js";
import allOfKeyword from "../../keywords/allOf.js";
import anyOfKeyword from "../../keywords/anyOf.js";
import containsKeyword from "../../keywords/contains.js";
import dependentSchemasKeyword from "../../keywords/dependentSchemas.js";
import ifKeyword from "../../keywords/if.js";
import thenKeyword from "../../keywords/then.js";
import elseKeyword from "../../keywords/else.js";
import itemsKeyword from "../../keywords/items.js";
import notKeyword from "../../keywords/not.js";
import oneOfKeyword from "../../keywords/oneOf.js";
import patternPropertiesKeyword from "../../keywords/draft-2020-12/patternProperties.js";
import prefixItemsKeyword from "../../keywords/prefixItems.js";
import propertiesKeyword from "../../keywords/properties.js";
import propertyNamesKeyword from "../../keywords/propertyNames.js";
import unevaluatedItemsKeyword from "../../keywords/unevaluatedItems.js";
import unevaluatedPropertiesKeyword from "../../keywords/unevaluatedProperties.js";
import constKeyword from "../../keywords/const.js";
import dependentRequiredKeyword from "../../keywords/dependentRequired.js";
import enumKeyword from "../../keywords/enum.js";
import exclusiveMaximumKeyword from "../../keywords/exclusiveMaximum.js";
import exclusiveMinimumKeyword from "../../keywords/exclusiveMinimum.js";
import maxContainsKeyword from "../../keywords/maxContains.js";
import maxItemsKeyword from "../../keywords/maxItems.js";
import maxLengthKeyword from "../../keywords/maxLength.js";
import maxPropertiesKeyword from "../../keywords/maxProperties.js";
import maximumKeyword from "../../keywords/maximum.js";
import minContainsKeyword from "../../keywords/minContains.js";
import minItemsKeyword from "../../keywords/minItems.js";
import minLengthKeyword from "../../keywords/minLength.js";
import minPropertiesKeyword from "../../keywords/minProperties.js";
import minimumKeyword from "../../keywords/minimum.js";
import multipleOfKeyword from "../../keywords/multipleOf.js";
import patternKeyword from "../../keywords/draft-2020-12/pattern.js";
import requiredKeyword from "../../keywords/required.js";
import typeKeyword from "../../keywords/draft-2020-12/type.js";
import uniqueItemsKeyword from "../../keywords/uniqueItems.js";
import defaultKeyword from "../../keywords/default.js";
import deprecatedKeyword from "../../keywords/deprecated.js";
import descriptionKeyword from "../../keywords/description.js";
import examplesKeyword from "../../keywords/examples.js";
import readOnlyKeyword from "../../keywords/readOnly.js";
import titleKeyword from "../../keywords/title.js";
import writeOnlyKeyword from "../../keywords/writeOnly.js";
import formatKeyword from "../../keywords/format.js";
import contentEncodingKeyword from "../../keywords/contentEncoding.js";
import contentMediaTypeKeyword from "../../keywords/contentMediaType.js";
import contentSchemaKeyword from "../../keywords/contentSchema.js";
import dateTimeFormat from "../../formats/draft-2020-12/date-time.js";
import dateFormat from "../../formats/date.js";
import timeFormat from "../../formats/time.js";
import durationFormat from "../../formats/duration.js";
import emailFormat from "../../formats/email.js";
import ipv4Format from "../../formats/ipv4.js";
import ipv6Format from "../../formats/ipv6.js";
import uriFormat from "../../formats/uri.js";
import uriReferenceFormat from "../../formats/uri-reference.js";
import iriFormat from "../../formats/iri.js";
import iriReferenceFormat from "../../formats/iri-reference.js";
import uuidFormat from "../../formats/uuid.js";
import uriTemplateFormat from "../../formats/uri-template.js";
import jsonPointerFormat from "../../formats/json-pointer.js";
import relativeJsonPointerFormat from "../../formats/relative-json-pointer.js";
import regexFormat from "../../formats/regex.js";
import vocabularyKeyword from "../../keywords/vocabulary.js";

/**
 * @import { VocabularyConfig } from "../../dialect.d.ts"
 * @import * as API from "./index.d.ts"
 */

/** @type typeof API.draft202012DialectUri */
export const draft202012DialectUri = "https://json-schema.org/draft/2020-12/schema";

/** The formats 2020-12 defines */
const dialectFormats = {
  "date-time": dateTimeFormat,
  "date": dateFormat,
  "time": timeFormat,
  "duration": durationFormat,
  "email": emailFormat,
  "idn-email": "https://json-schema.org/format/idn-email",
  "hostname": "https://json-schema.org/format/draft-2020-12/hostname",
  "idn-hostname": "https://json-schema.org/format/idn-hostname",
  "ipv4": ipv4Format,
  "ipv6": ipv6Format,
  "uri": uriFormat,
  "uri-reference": uriReferenceFormat,
  "iri": iriFormat,
  "iri-reference": iriReferenceFormat,
  "uuid": uuidFormat,
  "uri-template": uriTemplateFormat,
  "json-pointer": jsonPointerFormat,
  "relative-json-pointer": relativeJsonPointerFormat,
  "regex": regexFormat
};

/** @type Record<string, VocabularyConfig> */
const vocabularies = {
  "https://json-schema.org/draft/2020-12/vocab/core": {
    keywords: {
      $anchor: anchorKeyword,
      $comment: commentKeyword,
      $defs: definitionsKeyword,
      $dynamicAnchor: dynamicAnchorKeyword,
      $dynamicRef: dynamicRefKeyword,
      $id: idKeyword,
      $ref: refKeyword,
      $vocabulary: vocabularyKeyword
    }
  },
  "https://json-schema.org/draft/2020-12/vocab/applicator": {
    keywords: {
      additionalProperties: additionalPropertiesKeyword,
      allOf: allOfKeyword,
      anyOf: anyOfKeyword,
      contains: containsKeyword,
      dependentSchemas: dependentSchemasKeyword,
      if: ifKeyword,
      then: thenKeyword,
      else: elseKeyword,
      items: itemsKeyword,
      not: notKeyword,
      oneOf: oneOfKeyword,
      patternProperties: patternPropertiesKeyword,
      prefixItems: prefixItemsKeyword,
      properties: propertiesKeyword,
      propertyNames: propertyNamesKeyword
    }
  },
  "https://json-schema.org/draft/2020-12/vocab/unevaluated": {
    keywords: {
      unevaluatedItems: unevaluatedItemsKeyword,
      unevaluatedProperties: unevaluatedPropertiesKeyword
    }
  },
  "https://json-schema.org/draft/2020-12/vocab/validation": {
    keywords: {
      const: constKeyword,
      dependentRequired: dependentRequiredKeyword,
      enum: enumKeyword,
      exclusiveMaximum: exclusiveMaximumKeyword,
      exclusiveMinimum: exclusiveMinimumKeyword,
      maxContains: maxContainsKeyword,
      maxItems: maxItemsKeyword,
      maxLength: maxLengthKeyword,
      maxProperties: maxPropertiesKeyword,
      maximum: maximumKeyword,
      minContains: minContainsKeyword,
      minItems: minItemsKeyword,
      minLength: minLengthKeyword,
      minProperties: minPropertiesKeyword,
      minimum: minimumKeyword,
      multipleOf: multipleOfKeyword,
      pattern: patternKeyword,
      required: requiredKeyword,
      type: typeKeyword,
      uniqueItems: uniqueItemsKeyword
    }
  },
  "https://json-schema.org/draft/2020-12/vocab/meta-data": {
    keywords: {
      default: defaultKeyword,
      deprecated: deprecatedKeyword,
      description: descriptionKeyword,
      examples: examplesKeyword,
      readOnly: readOnlyKeyword,
      title: titleKeyword,
      writeOnly: writeOnlyKeyword
    }
  },
  "https://json-schema.org/draft/2020-12/vocab/format-annotation": {
    keywords: { format: formatKeyword },
    formats: dialectFormats
  },
  "https://json-schema.org/draft/2020-12/vocab/format-assertion": {
    keywords: { format: formatKeyword },
    formats: dialectFormats,
    assertFormats: true
  },
  "https://json-schema.org/draft/2020-12/vocab/content": {
    keywords: {
      contentEncoding: contentEncodingKeyword,
      contentMediaType: contentMediaTypeKeyword,
      contentSchema: contentSchemaKeyword
    }
  }
};

/** The vocabularies the 2020-12 meta-schema lists */
const dialectVocabularies = [
  "https://json-schema.org/draft/2020-12/vocab/core",
  "https://json-schema.org/draft/2020-12/vocab/applicator",
  "https://json-schema.org/draft/2020-12/vocab/unevaluated",
  "https://json-schema.org/draft/2020-12/vocab/validation",
  "https://json-schema.org/draft/2020-12/vocab/meta-data",
  "https://json-schema.org/draft/2020-12/vocab/format-annotation",
  "https://json-schema.org/draft/2020-12/vocab/content"
];

/** @type typeof API.draft202012Dialect */
export const draft202012Dialect = {
  uri: draft202012DialectUri,
  keywords: Object.assign({}, ...dialectVocabularies.map((uri) => vocabularies[uri].keywords)),
  unknownKeywords: "annotation",
  formats: dialectFormats,
  assertFormats: false,
  vocabularies: vocabularies
};
