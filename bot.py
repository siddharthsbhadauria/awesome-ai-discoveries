import requests
import os
import random
import sys
from datetime import datetime

# --- CONFIGURATION ---
QUERY = "topic:python+topic:ai+stars:>1000"
TOKEN = os.getenv("GH_TOKEN")

def fetch_discoveries():
    url = f"https://api.github.com/search/repositories?q={QUERY}&sort=updated&order=desc"
    headers = {"Authorization": f"token {TOKEN}"} if TOKEN else {}
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        items = response.json().get('items', [])[:15]
        return random.choice(items) if items else None
    except Exception as e:
        print(f"API Error: {e}")
        return None

def update_project_of_the_week():
    """Finds the repo with the most stars in the README and features it."""
    if not os.path.exists("README.md"):
        return
    
    with open("README.md", "r", encoding="utf-8") as f:
        lines = f.readlines()

    # Extract all rows from the table
    repos = []
    for line in lines:
        if line.startswith("| 202"):  # Matches date rows
            parts = line.split("|")
            # Index 2 is [name](url), Index 4 is stars
            repo_link = parts[2].strip()
            try:
                star_count = int(parts[4].replace("⭐", "").replace(",", "").strip())
                repos.append((star_count, repo_link, parts[3].strip()))
            except: continue

    if not repos:
        return

    # Find the winner
    best_repo = max(repos, key=lambda x: x[0])
    
    # Rebuild README with the new featured project
    new_content = []
    skip_mode = False
    
    # We define the "Featured" section area
    new_content.append("# 🚀 Daily AI Discoveries\n\n")
    new_content.append(f"### 🏆 Project of the Week\n")
    new_content.append(f"The most popular discovery lately: **{best_repo[1]}** with {best_repo[0]:,} stars!\n\n")
    new_content.append("---\n\n")
    
    # Find where the old table starts and keep everything after the header
    found_table = False
    for line in lines:
        if "| Date |" in line or "| :--- |" in line:
            found_table = True
        if found_table:
            new_content.append(line)
            
    with open("README.md", "w", encoding="utf-8") as f:
        f.writelines(new_content)

def update_daily_log(repo):
    repo_name = repo['full_name']
    date_str = datetime.now().strftime("%Y-%m-%d")
    url = repo['html_url']
    desc = repo['description'] or "No description provided."
    stars = repo['stargazers_count']
    
    new_entry = f"| {date_str} | [{repo_name}]({url}) | {desc} | ⭐ {stars:,} |\n"
    
    with open("README.md", "a", encoding="utf-8") as f:
        f.write(new_entry)

if __name__ == "__main__":
    # 1. Weekly Logic: If Sunday, update the "Project of the Week"
    if datetime.now().weekday() == 6: # 6 is Sunday
        print("Sunday detected! Updating Project of the Week...")
        update_project_of_the_week()

    # 2. Daily Logic: Standard Discovery
    discovery = fetch_discoveries()
    if discovery:
        update_daily_log(discovery)
        print(f"Logged: {discovery['full_name']}")
