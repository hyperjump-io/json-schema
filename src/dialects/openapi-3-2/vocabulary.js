import discriminatorKeyword from "../../keywords/oas/3.2/discriminator.js";
import exampleKeyword from "../../keywords/oas/3.2/example.js";
import externalDocsKeyword from "../../keywords/oas/3.2/externalDocs.js";
import xmlKeyword from "../../keywords/oas/3.2/xml.js";
import int32Format from "../../formats/oas/3.2/int32.js";
import passwordFormat from "../../formats/oas/3.2/password.js";

/**
 * @import * as API from "./index.d.ts"
 */

/** @type typeof API.openApi32VocabularyUri */
export const openApi32VocabularyUri = "https://spec.openapis.org/oas/3.2/vocab/base";

/** @type typeof API.openApi32Vocabulary */
export const openApi32Vocabulary = {
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
