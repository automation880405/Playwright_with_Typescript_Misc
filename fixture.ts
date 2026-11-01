import {test as base,expect} from "@playwright/test";
export const test = base.extend({page: async ({ page }, use) => {
  await page.goto('https://the-internet.herokuapp.com/');
   page.setDefaultTimeout(30000);
  await use(page);
}});

export {expect};