const { Builder, By, Key, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

(async function runTest() {
  let driver;
  let exitCode = 1; // default to failure
  const visual = process.env.VISUAL_BROWSER === "true";

  try {
    const seleniumUrl = process.env.SELENIUM_REMOTE_URL || "http://localhost:4444/wd/hub";

    const options = new chrome.Options();

    if (!visual) {
      options.addArguments("--headless=new");
      options.addArguments("--disable-gpu");
      options.addArguments("--no-sandbox");
      options.addArguments("--window-size=1920,1080");
    }

    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .usingServer(seleniumUrl)
      .build();

    console.log("🚀 Opening Google Australia...");
    await driver.get("https://www.google.com.au");

    // Optional: wait for full page load
    await driver.sleep(2000);

    // Accept cookies if prompted
    try {
      const agreeButton = await driver.wait(
        until.elementLocated(By.xpath("//div[text()='I agree' or text()='Accept all']")),
        3000
      );
      await agreeButton.click();
      console.log("✅ Accepted cookies/privacy popup.");
    } catch (e) {
      console.log("🛑 No privacy popup shown.");
    }

    const searchBox = await driver.wait(until.elementLocated(By.id("APjFqb")), 5000);
    const isSearchBoxVisible = await searchBox.isDisplayed();
    console.log(`🔍 Search box visible: ${isSearchBoxVisible}`);

    if (isSearchBoxVisible) {
      console.log("✅ Typing 'hello world' into search box...");
      await searchBox.sendKeys("hello world", Key.RETURN);
      console.log("🔎 Submitted search.");

      await driver.wait(until.elementLocated(By.id("result-stats")), 5000);
      console.log("✅ Search results loaded.");
      exitCode = 0; // successful
    } else {
      console.log("❌ Search box not visible.");
    }

  } catch (err) {
    console.error("❌ Test failed with error:", err.message);

  } finally {
    if (driver) {
      if (visual) {
        console.log("🕒 Visual mode: waiting 3 seconds before closing browser...");
        await driver.sleep(3000);
      }

      console.log("🧹 Closing browser...");
      try {
        await driver.quit();
        console.log("✅ Browser closed.");
      } catch (error) {
        console.error("⚠️ Browser failed to close properly:", error.message);
      }
    }

    process.exit(exitCode);
  }
})();