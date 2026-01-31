import test from "node:test";
import assert from "node:assert/strict";
import { metadata } from "../../src/app/share/layout";

test("share metadata disables indexing", () => {
  const robots = metadata.robots as {
    index?: boolean;
    follow?: boolean;
    noarchive?: boolean;
    nocache?: boolean;
  };

  assert.equal(robots.index, false);
  assert.equal(robots.follow, false);
  assert.equal(robots.noarchive, true);
  assert.equal(robots.nocache, true);
});
