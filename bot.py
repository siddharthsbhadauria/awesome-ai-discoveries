import requests
import os
import random
import time
import sys
from datetime import datetime

# --- CONFIGURATION ---
QUERY = "topic:python+topic:ai+stars:>1000"
TOKEN = os.getenv("GH_TOKEN")

def fetch_discoveries():
    """Fetches trending repos from GitHub API."""
    url = f"https://api.github.com/search/repositories?q={QUERY}&sort=updated&order=desc"
    headers = {"Authorization": f"token {TOKEN}"} if TOKEN else {}
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        # Look at top 15 results to provide variety
        items = response.json().get('items', [])[:15]
        return random.choice(items) if items else None
    except Exception as e:
        print(f"API Error: {e}")
        return None

def is_already_logged(repo_name):
    """Checks README to prevent duplicate entries."""
    if not os.path.exists("README.md"):
        return False
    with open("README.md", "r", encoding="utf-8") as f:
        return repo_name in f.read()

def update_readme(repo):
    """Appends the discovery to the README table."""
    repo_name = repo['full_name']
    
    if is_already_logged(repo_name):
        print(f"Skipping {repo_name}, already exists in logs.")
        return False

    date_str = datetime.now().strftime("%Y-%m-%d")
    url = repo['html_url']
    desc = repo['description'] or "No description provided."
    stars = repo['stargazers_count']
    
    # Format as a Markdown table row
    new_entry = f"| {date_str} | [{repo_name}]({url}) | {desc} | ⭐ {stars:,} |\n"
    
    with open("README.md", "a", encoding="utf-8") as f:
        f.write(new_entry)
    return True

if __name__ == "__main__":
    # 1. Stealth Delay: Wait between 0 and 60 minutes
    # This ensures your commits don't happen at the exact same minute every day
    delay = random.randint(0, 3600)
    print(f"Stealth Mode: Sleeping for {delay // 60} minutes...")
    time.sleep(delay)

    # 2. Human Factor: 5% chance to skip a run entirely
    if random.random() < 0.05:
        print("Taking a break to look human. No commit this time!")
        sys.exit(0)

    # 3. Main Logic
    discovery = fetch_discoveries()
    if discovery:
        if update_readme(discovery):
            print(f"Successfully logged: {discovery['full_name']}")
    else:
        print("No new discoveries found.")
