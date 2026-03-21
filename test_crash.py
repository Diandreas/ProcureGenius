from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        # Listen for console messages and unhandled errors
        page.on("console", lambda msg: print(f"Console {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page error: {err}"))
        
        print("Navigating to login...")
        page.goto("http://localhost:3000/login")
        
        # Login
        page.fill("input[type='email']", "admin@test.com")
        page.fill("input[type='password']", "admin")
        page.click("button[type='submit']")
        
        time.sleep(2)
        
        print("Navigating to contracts...")
        page.goto("http://localhost:3000/contracts")
        time.sleep(2)
        
        print("Opening contract detail...")
        # Find first contract card or row
        try:
            # We don't click, we just get the URL if possible, or click the first card
            cards = page.locator(".MuiCardActionArea-root, tbody tr").all()
            if cards:
                cards[0].click()
                time.sleep(3)
            else:
                print("No contracts found to click")
        except Exception as e:
            print(f"Failed to click contract: {e}")
        
        browser.close()

if __name__ == "__main__":
    run()
