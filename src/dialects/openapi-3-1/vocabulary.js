import discriminatorKeyword from "../../keywords/oas/3.1/discriminator.js";
import exampleKeyword from "../../keywords/oas/3.2/example.js";
import externalDocsKeyword from "../../keywords/oas/3.2/externalDocs.js";
import xmlKeyword from "../../keywords/oas/3.1/xml.js";
import int32Format from "../../formats/oas/3.2/int32.js";
import passwordFormat from "../../formats/oas/3.2/password.js";

/**
 * @import * as API from "./index.d.ts"
 */

/** @type typeof API.openApi31VocabularyUri */
export const openApi31VocabularyUri = "https://spec.openapis.org/oas/3.1/vocab/base";

/** @type typeof API.openApi31Vocabulary */
export const openApi31Vocabulary = {
  keywords: {
    discriminator: discriminatorKeyword,
    example: exampleKeyword,
    externalDocs: externalDocsKeyword,
    xml: xmlKeyword
  },
  formats: {
    int32: int32Format,
    password: passwordFormat
  }
};
