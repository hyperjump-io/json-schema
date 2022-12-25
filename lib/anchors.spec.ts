import { expect } from "chai";
import { Given, When, Then } from "./mocha-gherkin.spec.js";
import "../stable/index.js";
import * as Schema from "./schema.js";
import type { SchemaDocument } from "./schema.js";


describe("Anchors", () => {
  const testDomain = "http://test.jsc.hyperjump.io";

  Given("A schema with an anchor", () => {
    const id = `${testDomain}/just-anchor`;
    beforeEach(() => {
      Schema.add({
        "$id": id,
        "definitions": {
          "foo": {
            "$anchor": "foo",
            "type": "string"
          }
        }
      });
    });

    When("retreiving the schema by anchor", () => {
      let subject: SchemaDocument;
      beforeEach(async () => {
        subject = await Schema.get(`${id}#foo`);
      });

      Then("it's URI should have a JSON Pointer", () => {
        expect(Schema.uri(subject)).to.equal(`${id}#/definitions/foo`);
      });
    });

    When("retreiving the schema by a nonexistent anchor", () => {
      Then("it should throw an error", () => {
        Schema.get(`${id}#bar`)
          .then(() => expect.fail())
          .catch((error) => expect(error).to.be.an("error"));
      });
    });
  });

  Given("A schema with an id with a fragment", () => {
    const id = `${testDomain}/id-with-fragment`;
    beforeEach(() => {
      Schema.add({
        "$id": id,
        "definitions": {
          "foo": {
            "$id": "foo#foo",
            "type": "string"
          }
        }
      });
    });

    When("retreiving the schema by anchor", () => {
      Then("it should throw an error", () => {
        Schema.get(`${testDomain}/foo#foo`)
          .then(() => expect.fail())
          .catch((error) => expect(error).to.be.an("error"));
      });
    });
  });
});
