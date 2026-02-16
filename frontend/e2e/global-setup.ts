import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { storage } from "./fixtures/test-data";

export default async function globalSetup() {
  console.log("[e2e] globalSetup starting…");

  const outPath = path.resolve(storage.authStatePath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const email = process.env.E2E_AUTH_EMAIL;
  const password = process.env.E2E_AUTH_PASSWORD;
  if (!email || !password) {
    throw new Error("Missing E2E_AUTH_EMAIL or E2E_AUTH_PASSWORD in environment (.env is fine).");
  }

  if (fs.existsSync(outPath)) {
    console.log("[e2e] Deleting existing auth state");
    fs.unlinkSync(outPath);
  }

  console.log("[e2e] Generating fresh auth state...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://kleff.io/dashboard", { waitUntil: "domcontentloaded" });

  await page.waitForURL(/auth\.kleff\.io\/if\/flow\//, { timeout: 120_000 });

  const userField = page
    .getByLabel(/username|email/i)
    .or(page.locator('input[name="uid"], input[name="username"], input[type="email"]').first());

  const passField = page
    .getByLabel(/password/i)
    .or(page.locator('input[name="password"], input[type="password"]').first());

  await userField.first().fill(email);
  await passField.first().fill(password);

  await page.getByRole("button", { name: /continue|log in|sign in|next/i }).click();

  await Promise.race([
    page.waitForURL(/https:\/\/kleff\.io\/auth\/callback/i, { timeout: 180_000 }),
    page.waitForURL(/explicit-consent|authorization/i, { timeout: 180_000 })
  ]);

  if (/explicit-consent|authorization/i.test(page.url())) {
    const allow = page.getByRole("button", { name: /allow|authorize|accept|continue/i }).first();
    if (await allow.count()) await allow.click();
  }

  await page.waitForURL(/https:\/\/kleff\.io\/(auth\/callback|dashboard)/i, {
    timeout: 180_000
  });
  await page.waitForURL(/https:\/\/kleff\.io\/dashboard/i, { timeout: 180_000 });

  const state = await context.storageState();

  const tmp = outPath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(tmp, outPath);

  await browser.close();

  console.log("[e2e] globalSetup wrote storageState:", outPath);
}
