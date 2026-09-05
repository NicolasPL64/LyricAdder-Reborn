import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "light"))
})

test("opens the lyrics editor from the root route", async ({ page }) => {
    await page.goto("/")

    await expect(page).toHaveURL(/\/lyricsinput$/)
    await expect(page.getByRole("heading", { name: "Lyrics Input" })).toBeVisible()
    await expect(page.getByRole("button", { name: /Load chart/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Save chart/i })).toBeVisible()
})

test("navigates to settings", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "Settings" }).click()

    await expect(page).toHaveURL(/\/settings$/)
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible()
    await expect(page.getByText("Max amount of section separators:")).toBeVisible()
})
