import { test } from "node:test";
import assert from "node:assert/strict";
import { backupSchema, defaultSettings } from "../src/domain";
import { examples } from "../src/examples";
import { loadWorkspace, saveWorkspace, STORAGE_KEY } from "../src/storage";

test("draft fields survive a save and reload while being edited", () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  const p = structuredClone(examples[0]);
  p.projectName = "";
  p.scope.deliverables[0].title = "";
  saveWorkspace([p], defaultSettings);
  assert.equal(loadWorkspace().proposals[0].projectName, "");
  assert.equal(loadWorkspace().warning, "");
  values.set(STORAGE_KEY, "invalid-json");
  assert.match(loadWorkspace().warning, /preserved/);
  assert.equal(values.get(STORAGE_KEY), "invalid-json");
});
test("a forged backup cannot introduce negative rates or estimates", () => {
  const p = structuredClone(examples[0]);
  p.hourlyRate = -50;
  assert.equal(
    backupSchema.safeParse({
      version: 1,
      proposals: [p],
      settings: defaultSettings,
    }).success,
    false,
  );
});
