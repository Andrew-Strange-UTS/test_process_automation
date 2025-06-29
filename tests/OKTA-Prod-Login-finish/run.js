const { Builder } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

(async () => {
  console.log("🧼 OKTA-Prod-Login-finish — closing session...");
  const seleniumUrl = process.env.SELENIUM_REMOTE_URL || "http://localhost:4444/wd/hub";

  // Use the same user-data-dir if you’re storing session here
  const options = new chrome.Options();
  if (process.env.VISUAL_BROWSER !== "true") {
    options.addArguments("--headless=new", "--disable-gpu", "--no-sandbox", "--window-size=1920,1080");
  }

  try {
    const driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .usingServer(seleniumUrl)
      .build();

    await driver.sleep(1000); // Optional wait before closing
    await driver.quit();

    console.log("✅ Browser session closed by OKTA-Prod-Login-finish.");
  } catch (e) {
    console.error("❌ Error during cleanup:", e.message);
    process.exit(1);
  }
})();