import type { OpenApi31Schema, OpenApi31VocabularyKeywords } from "./index.d.ts";
import discriminatorKeyword from "../../keywords/oas/3.1/discriminator.js";
import exampleKeyword from "../../keywords/oas/3.2/example.js";
import externalDocsKeyword from "../../keywords/oas/3.2/externalDocs.js";
import xmlKeyword from "../../keywords/oas/3.1/xml.js";

// The types of the keywords are the types of their definitions
({
  discriminator: discriminatorKeyword,
  example: exampleKeyword,
  externalDocs: externalDocsKeyword,
  xml: xmlKeyword
}) satisfies OpenApi31VocabularyKeywords;

({
  $schema: "https://spec.openapis.org/oas/3.1/dialect/base",
  type: ["string", "null"],
  discriminator: { propertyName: "kind" },
  externalDocs: { url: "https://example.com/docs" },
  xml: { name: "pet" },
  example: "Fido"
}) satisfies OpenApi31Schema;

({ $schema: "https://spec.openapis.org/oas/3.1/dialect/2024-11-10" }) satisfies OpenApi31Schema;

// Unknown keywords are annotations
({ nullable: true }) satisfies OpenApi31Schema;

// @ts-expect-error `discriminator` needs a `propertyName`
({ discriminator: {} }) satisfies OpenApi31Schema;

// @ts-expect-error Another dialect
({ $schema: "https://spec.openapis.org/oas/3.2/dialect/2026-02-26" }) satisfies OpenApi31Schema;
