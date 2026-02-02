import requests
import os
import random
from datetime import datetime

# SEARCH QUERY: Python or AI projects with high stars
QUERY = "topic:python+topic:ai+stars:>1000"
TOKEN = os.getenv("GH_TOKEN")

def fetch_discoveries():
    url = f"https://api.github.com/search/repositories?q={QUERY}&sort=updated&order=desc"
    headers = {"Authorization": f"token {TOKEN}"} if TOKEN else {}
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        # Pick a random repo from the top 10 to keep the list unique
        items = response.json().get('items', [])[:10]
        return random.choice(items) if items else None
    return None

def update_readme(repo):
    date_str = datetime.now().strftime("%Y-%m-%d")
    
    # Format the row for the Markdown table
    name = repo['full_name']
    url = repo['html_url']
    desc = repo['description'] or "No description provided."
    stars = repo['stargazers_count']
    
    new_entry = f"| {date_str} | [{name}]({url}) | {desc} | ⭐ {stars:,} |\n"
    
    with open("README.md", "a", encoding="utf-8") as f:
        f.write(new_entry)

if __name__ == "__main__":
    discovery = fetch_discoveries()
    if discovery:
        update_readme(discovery)
        print(f"Successfully logged: {discovery['full_name']}")
    else:
        print("No new discoveries found today.")
