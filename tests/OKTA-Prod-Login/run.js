const { Builder, By } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const log = (...args) => {
  console.log(...args);
};

(async () => {
  log("🧪 OKTA-Prod-Login starting...");

  const visual = process.env.VISUAL_BROWSER === "true";
  const seleniumUrl = process.env.SELENIUM_REMOTE_URL || "http://localhost:4444/wd/hub";
  const timeoutMs = 60000;
  const pollInterval = 2000;

  const profilePath = process.env.CHROME_USER_PROFILE || "/tmp/okta-session";
  log("🗂 Using Chrome profile:", profilePath);

  const options = new chrome.Options()
    .addArguments(`--user-data-dir=${profilePath}`); // 🔐 Persist login session

  if (!visual) {
    options.addArguments("--headless=new", "--disable-gpu", "--no-sandbox", "--window-size=1920,1080");
  }

  let driver;

  try {
    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .usingServer(seleniumUrl)
      .build();

    await driver.manage().setTimeouts({
      implicit: 0,
      pageLoad: 60000,
      script: 30000,
    });

    log("🌐 Navigating to https://login.uts.edu.au...");
    await driver.get("https://login.uts.edu.au");

    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      log("⏳ Waiting for user login...");

      try {
        const logoElements = await driver.findElements(By.css('img.logo[alt="University of Technology Sydney logo"]'));
        if (logoElements.length > 0) {
          log("✅ Login successful: UTS logo detected.");
          await driver.sleep(3000); // Optional delay before returning
          return;
        }
      } catch (err) {
        log("⚠️ Poll error:", err.message);
      }

      await driver.sleep(pollInterval);
    }

    log("❌ Login failed: UTS logo not detected after retrying.");
    process.exit(1);
  } catch (err) {
    log("🔥 Fatal error:", err.message);
    process.exit(1);
  } finally {
    // ❗ Don't quit in login script — session must stay open
    console.error("❌ Error during cleanup:", e.message);
    process.exit(1);
  }
})();