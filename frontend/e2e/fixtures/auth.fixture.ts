import * as fs from "node:fs";
import {
  test as base,
  expect as baseExpect,
  type BrowserContext,
  type Page
} from "@playwright/test";
import { storage } from "./test-data";

export { baseExpect as expect };

function hasValidJson(p: string) {
  if (!fs.existsSync(p)) return false;
  const txt = fs.readFileSync(p, "utf8").trim();
  if (!txt) return false;
  try {
    JSON.parse(txt);
    return true;
  } catch {
    return false;
  }
}

type Fixtures = {
  context: BrowserContext;
  page: Page;
};

export const authTest = base.extend<Fixtures>({
  context: async ({ browser }, run) => {
    const p = storage.authStatePath;
    if (!hasValidJson(p)) {
      const exists = fs.existsSync(p);
      const size = exists ? fs.statSync(p).size : 0;
      base.skip(true, `Missing/invalid auth state at ${p} (exists=${exists}, size=${size}).`);
    }

    const context = await browser.newContext({ storageState: p });

    await run(context);
    await context.close();
  },

  page: async ({ context }, run) => {
    const page = await context.newPage();

    await page.addInitScript(() => {
      window.open = (url?: string | URL) => {
        if (url) window.location.href = url.toString();
        return null as unknown as Window;
      };
    });

    await run(page);
    await page.close();
  }
});
