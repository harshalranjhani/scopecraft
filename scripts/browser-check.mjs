import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { writeFile, readFile, mkdir } from "node:fs/promises";
await mkdir(".local/browser-check", { recursive: true });
const browser = await chromium.launch({
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : {}),
  headless: true,
  args: ["--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.APP_URL ?? "http://127.0.0.1:3001";
await page.route("**/api/health", (route) =>
  route.fulfill({
    json: {
      available: false,
      model: "qwen3-0.6b",
      tokenRequired: false,
      busy: false,
    },
  }),
);
await page.goto(base);
await page.evaluate(() => {
  localStorage.clear();
  sessionStorage.clear();
});
await page.reload();
await page.getByRole("heading", { name: /Good work starts/ }).waitFor();
await page.screenshot({ path: ".local/browser-check/overview.png", fullPage: true });
const axeOverview = await new AxeBuilder({ page }).analyze();
await page
  .getByRole("textbox", { name: "Search proposals" })
  .fill("Little Fern");
assert.equal(await page.locator(".proposal-row").count(), 1);
await page.getByRole("button", { name: "Clear search" }).click();
await page.getByRole("button", { name: "Ready to share", exact: true }).click();
await page
  .getByRole("heading", { name: "No proposals match just yet." })
  .waitFor();
await page.getByRole("button", { name: "Clear filters" }).click();
await page.locator(".proposal-row").first().click();
await page
  .getByRole("heading", { name: "A clear plan for good work" })
  .waitFor();
const totalBefore = await page.locator(".quote-card h2").innerText();
await page.getByRole("spinbutton", { name: "Deliverable 1 hours" }).fill("10");
assert.notEqual(await page.locator(".quote-card h2").innerText(), totalBefore);
await page
  .getByRole("textbox", { name: "Project name", exact: true })
  .fill("Little Fern launch proposal");
await page.getByLabel("Proposal status").selectOption("ready");
await page.screenshot({ path: ".local/browser-check/editor.png", fullPage: true });
await page.getByRole("tab", { name: /Scope check/ }).click();
await page
  .getByText(
    "Risk notes stay out of the client export. Questions are included.",
  )
  .waitFor();
await page.screenshot({ path: ".local/browser-check/scope-check.png", fullPage: true });
await page.getByRole("button", { name: "Preview & export" }).click();
const dialog = page.getByRole("dialog");
await dialog.waitFor();
const axeExport = await new AxeBuilder({ page }).analyze();
const privateRisk = "A deadline without final content";
assert.equal(await dialog.getByText(privateRisk).count(), 0);
const dl = page.waitForEvent("download");
await page.getByRole("button", { name: "Download Markdown" }).click();
const download = await dl;
await download.saveAs(".local/browser-check/example-proposal.md");
const text = await readFile(".local/browser-check/example-proposal.md", "utf8");
assert(!text.includes(privateRisk));
assert(text.includes("Little Fern launch proposal"));
await page.emulateMedia({ media: "print" });
await page.pdf({
  path: ".local/browser-check/example-proposal.pdf",
  format: "A4",
  printBackground: true,
});
await page.emulateMedia({ media: "screen" });
await page.getByRole("button", { name: "Close dialog" }).click();
await page.getByRole("button", { name: "All proposals", exact: true }).click();
await page.reload();
await page
  .locator(".proposal-row")
  .filter({ hasText: "Little Fern launch proposal" })
  .waitFor();
assert.equal(await page.locator(".proposal-row").count(), 3);
await page
  .getByRole("button", { name: "Workspace settings", exact: true })
  .click();
await page
  .getByRole("textbox", { name: "Studio or business name" })
  .fill("Fern Design Co.");
const backupDownload = page.waitForEvent("download");
await page.getByRole("button", { name: "Export workspace backup" }).click();
await (await backupDownload).saveAs(".local/browser-check/example-backup.json");
await page
  .locator("input[type=file]")
  .setInputFiles(".local/browser-check/example-backup.json");
await page
  .getByRole("status")
  .getByText(/Imported 0 proposals/)
  .waitFor();
await page.getByRole("button", { name: "Overview", exact: true }).click();
await page.getByRole("button", { name: "New proposal", exact: true }).click();
await page.getByRole("button", { name: /The independent maker/ }).click();
await page.getByRole("button", { name: "Explore an editable example" }).click();
await page
  .getByRole("heading", { name: "A storefront for handcrafted ceramics" })
  .waitFor();
await page
  .getByRole("button", { name: "Delete proposal", exact: true })
  .click();
await page.getByRole("button", { name: "Keep proposal" }).click();
await page
  .getByRole("heading", { name: "A storefront for handcrafted ceramics" })
  .waitFor();
const axeEditor = await new AxeBuilder({ page }).analyze();
await page.setViewportSize({ width: 390, height: 844 });
assert(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);
await page.getByRole("button", { name: "Open navigation" }).click();
await page.getByRole("button", { name: "Overview", exact: true }).click();
await page.getByRole("status").waitFor({ state: "hidden" });
await page.screenshot({ path: ".local/browser-check/mobile.png", fullPage: true });
assert(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
);
const axeMobile = await new AxeBuilder({ page }).analyze();
await page.getByRole("button", { name: "New proposal", exact: true }).click();
await page.getByRole("dialog").waitFor();
const axeNew = await new AxeBuilder({ page }).analyze();
assert(
  await page.evaluate(
    () =>
      document.querySelector("dialog").scrollWidth <=
      document.querySelector("dialog").clientWidth,
  ),
);
await page.keyboard.press("Escape");
assert.equal(await page.getByRole("dialog").count(), 0);
await page.setViewportSize({ width: 1440, height: 1000 });
await page.reload();
await page.getByRole("button", { name: "New proposal", exact: true }).click();
await page
  .getByRole("button", { name: "Explore the recorded Qwen draft" })
  .click();
await page
  .getByRole("heading", { name: "A thoughtful pottery brand" })
  .waitFor();
await page.getByText(/Recorded qwen3-0.6b response/).waitFor();
await page.getByRole("status").waitFor({ state: "hidden" });
await page.screenshot({ path: ".local/browser-check/recorded-draft.png", fullPage: true });
const violations = [
  ...axeOverview.violations,
  ...axeEditor.violations,
  ...axeMobile.violations,
  ...axeExport.violations,
  ...axeNew.violations,
].map((v) => ({
  id: v.id,
  impact: v.impact,
  nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
}));
await writeFile(
  ".local/browser-check/browser-verification.json",
  JSON.stringify(
    {
      checks: [
        "search",
        "filters",
        "scope editing",
        "pricing update",
        "status",
        "autosave reload",
        "private export",
        "Markdown download",
        "PDF generation",
        "profile settings",
        "backup export",
        "backup merge",
        "example creation",
        "delete confirmation",
        "mobile layout",
        "mobile dialog",
        "keyboard Escape",
        "recorded model replay",
      ],
      pageErrors: errors,
      violations,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ pageErrors: errors, violations, checks: 18 }));
await browser.close();
assert.equal(errors.length, 0);
assert.equal(violations.length, 0);
