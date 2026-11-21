import type { OpenApi32Schema, OpenApi32VocabularyKeywords } from "./index.d.ts";
import discriminatorKeyword from "../../keywords/oas/3.2/discriminator.js";
import exampleKeyword from "../../keywords/oas/3.2/example.js";
import externalDocsKeyword from "../../keywords/oas/3.2/externalDocs.js";
import xmlKeyword from "../../keywords/oas/3.2/xml.js";

// The types of the keywords are the types of their definitions
({
  discriminator: discriminatorKeyword,
  example: exampleKeyword,
  externalDocs: externalDocsKeyword,
  xml: xmlKeyword
}) satisfies OpenApi32VocabularyKeywords;

({
  $schema: "https://spec.openapis.org/oas/3.2/dialect/2026-02-26",
  type: "object",
  discriminator: { propertyName: "kind", defaultMapping: "#/components/schemas/Pet" },
  xml: { nodeType: "element", name: "pet" }
}) satisfies OpenApi32Schema;

// @ts-expect-error Not a node type
({ xml: { nodeType: "comment" } }) satisfies OpenApi32Schema;

// @ts-expect-error There's no undated 3.2 dialect
({ $schema: "https://spec.openapis.org/oas/3.2/dialect" }) satisfies OpenApi32Schema;
