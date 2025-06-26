# run.py
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import time
import os
import sys

visual = os.getenv("VISUAL_BROWSER", "false") == "true"
seleniumUrl = os.getenv("SELENIUM_REMOTE_URL", "http://localhost:4444/wd/hub")

options = webdriver.ChromeOptions()
if not visual:
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")

try:
    print("🚀 Opening browser...")
    driver = webdriver.Remote(
        command_executor=seleniumUrl,
        options=options
    )
    driver.get("https://www.google.com")
    time.sleep(2)

    search_box = driver.find_element(By.NAME, "q")
    search_box.send_keys("hello world1111111111111")
    search_box.send_keys(Keys.RETURN)
    time.sleep(2)

    print("✅ Python Test Passed")
    driver.quit()
    sys.exit(0)
except Exception as e:
    print(f"❌ Python Test Failed: {e}")
    try:
        driver.quit()
    except:
        pass
    sys.exit(1)