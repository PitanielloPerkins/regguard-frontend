import asyncio
from playwright.async_api import async_playwright


async def scrape_tdlr():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent="Mozilla/5.0")
        page = await context.new_page()

        # 1. Check Compliance Guide for PDF Links
        print("Scraping TDLR Compliance Guide...")
        await page.goto("https://www.tdlr.texas.gov/electricians/compliance-guide.htm")
        links = await page.locator("a[href$='.pdf']").all()

        tdlr_data = []
        for link in links:
            text = (await link.inner_text()).strip()
            url = await link.get_attribute("href")
            if not url:
                continue
            full_url = (
                f"https://www.tdlr.texas.gov{url}" if url.startswith("/") else url
            )
            tdlr_data.append({"title": text, "url": full_url})

        # 2. Check for Lawful Presence Updates (2026 Requirement)
        print("Checking Lawful Presence News...")
        await page.goto(
            "https://www.tdlr.texas.gov/news/2026/01/26/lawful-presence-documentation-requirement/"
        )
        content = await page.locator("article").inner_text()

        # Output logic (Replace with your database/App upload code)
        print(f"Found {len(tdlr_data)} Compliance PDFs.")
        if "Effective January 26, 2026" in content:
            print("ALERT: Lawful Presence requirement confirmed in news.")

        await browser.close()
        return tdlr_data


if __name__ == "__main__":
    asyncio.run(scrape_tdlr())
