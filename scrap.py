import time
import undetected_chromedriver as uc
from pathlib import Path
from git import Repo, InvalidGitRepositoryError, NoSuchPathError, GitCommandError
from bs4 import BeautifulSoup
import json

# === CONFIG ===
URL = "https://www.nationstates.net/page=dispatch/id=1789931"
OUTPUT_FILE = Path("output.html")  # Save in current directory
DELEGATES_JSON = Path("delegates.json")
REPO_PATH = Path.cwd()  # Current directory as Git repo path
COMMIT_MESSAGE = "Update output.html and delegates.json with latest NationStates content"

def scrape():
    options = uc.ChromeOptions()
    options.headless = False  # Change to True if you want headless
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = uc.Chrome(options=options)

    try:
        print("🌐 Navigating to page...")
        driver.get(URL)

        print("⏳ Waiting for Cloudflare challenge (30 seconds)...")
        time.sleep(30)  # Adjust if you need more time to solve challenge

        html = driver.page_source

        # Optional: truncate HTML if you want, based on marker
        marker = "<31>"
        pos = html.find(marker)
        if pos != -1:
            print(f"🔍 Marker '{marker}' found, truncating HTML.")
            html = html[:pos]
        else:
            print(f"⚠️ Marker '{marker}' not found, saving full content.")

        OUTPUT_FILE.write_text(html, encoding="utf-8")
        print(f"✅ Saved HTML to {OUTPUT_FILE.resolve()}")

    finally:
        driver.quit()

def extract_delegates():
    print("🔎 Parsing HTML to extract delegate names and nation IDs...")

    html = OUTPUT_FILE.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    rows = soup.find_all("tr")
    delegates = []

    for row in rows[1:31]:  # Skip header row, get top 30
        cols = row.find_all("td")
        if len(cols) < 3:
            continue

        nation_div = cols[2].find("div", class_="nscodealigncenter")
        if not nation_div:
            continue

        a_tag = nation_div.find("a", class_="nlink")
        if not a_tag:
            continue

        href = a_tag.get("href", "")
        nation_id = None
        if href.startswith("nation="):
            nation_id = href.split("=", 1)[1]

        span = a_tag.find("span", class_="nnameblock")
        display_name = span.text.strip() if span else None

        if display_name and nation_id:
            delegates.append({"name": display_name, "nation_id": nation_id})

    with DELEGATES_JSON.open("w", encoding="utf-8") as f:
        json.dump({"delegates": delegates}, f, indent=2)

    print(f"✅ Saved {len(delegates)} delegates to {DELEGATES_JSON.resolve()}")



def push_to_github():
    try:
        print("📦 Accessing Git repo...")
        repo = Repo(REPO_PATH)
    except (InvalidGitRepositoryError, NoSuchPathError):
        print(f"❌ Error: No Git repository found at {REPO_PATH}")
        return

    try:
        repo.git.add(OUTPUT_FILE.name)
        repo.git.add(DELEGATES_JSON.name)
        repo.index.commit(COMMIT_MESSAGE)
        origin = repo.remote(name="origin")
        print("🚀 Pushing changes to GitHub...")
        origin.push()
        print("✅ Push successful!")
    except GitCommandError as e:
        print(f"❌ Git command error: {e}")

if __name__ == "__main__":
    scrape()
    extract_delegates()
    push_to_github()

