import requests
import os
import random
from datetime import datetime

# SEARCH QUERY
QUERY = "topic:python+topic:ai+stars:>1000"
TOKEN = os.getenv("GH_TOKEN")

def fetch_discoveries():
    url = f"https://api.github.com/search/repositories?q={QUERY}&sort=updated&order=desc"
    headers = {"Authorization": f"token {TOKEN}"} if TOKEN else {}
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        items = response.json().get('items', [])[:15] # Look at top 15
        return random.choice(items) if items else None
    return None

def is_already_logged(repo_name):
    """Check if the repo is already in the README to avoid duplicates."""
    if not os.path.exists("README.md"):
        return False
    with open("README.md", "r", encoding="utf-8") as f:
        content = f.read()
        return repo_name in content

def update_readme(repo):
    repo_name = repo['full_name']
    
    if is_already_logged(repo_name):
        print(f"Skipping {repo_name}, already in logs.")
        return False

    date_str = datetime.now().strftime("%Y-%m-%d")
    url = repo['html_url']
    desc = repo['description'] or "No description provided."
    stars = repo['stargazers_count']
    
    # The \n at the start ensures it always starts on a new line
    new_entry = f"| {date_str} | [{repo_name}]({url}) | {desc} | ⭐ {stars:,} |\n"
    
    with open("README.md", "a", encoding="utf-8") as f:
        f.write(new_entry)
    return True

if __name__ == "__main__":
    discovery = fetch_discoveries()
    if discovery:
        if update_readme(discovery):
            print(f"Successfully logged: {discovery['full_name']}")
    else:
        print("No discoveries found.")
