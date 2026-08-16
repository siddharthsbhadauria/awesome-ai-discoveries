import requests
import os
import random
import sys
import re
from datetime import datetime, timedelta

# --- CONFIGURATION ---
SEARCH_QUERIES = [
    "topic:python+topic:ai+stars:>1000",
    "topic:agentic-ai+stars:>300",
    "topic:llm+topic:python+stars:>1000",
    "topic:rag+stars:>500",
    "topic:mcp+stars:>300",
    "topic:multi-agent+stars:>300",
    "topic:vector-database+stars:>500",
    "topic:deep-learning+topic:python+stars:>1000",
]

TOKEN = os.getenv("GH_TOKEN")

def get_existing_repos():
    """Reads README.md and archive files to build a set of already logged repo full names."""
    logged_repos = set()
    files_to_check = ["README.md"]
    
    if os.path.exists("archive"):
        for fname in os.listdir("archive"):
            if fname.endswith(".md"):
                files_to_check.append(os.path.join("archive", fname))

    for filepath in files_to_check:
        if not os.path.exists(filepath):
            continue
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("| 20"):
                    # Extract repository name from markdown link e.g. [owner/repo](https://...)
                    match = re.search(r'\[([^\]]+)\]\(https://github\.com/[^\)]+\)', line)
                    if match:
                        logged_repos.add(match.group(1).lower().strip())
    return logged_repos

def determine_category(repo):
    """Categorizes the repository based on topics and description."""
    topics = [t.lower() for t in repo.get('topics', [])]
    desc = (repo.get('description') or "").lower()
    combined = " ".join(topics) + " " + desc

    if any(k in combined for k in ['agent', 'autonomous', 'multi-agent', 'swarm', 'agentic']):
        return "🤖 Agents"
    elif any(k in combined for k in ['rag', 'retrieval', 'embedding', 'vector-search']):
        return "🔍 RAG & Search"
    elif any(k in combined for k in ['vector-database', 'chroma', 'qdrant', 'milvus', 'pinecone', 'pgvector']):
        return "🗄️ Vector DB"
    elif any(k in combined for k in ['mcp', 'model-context-protocol', 'tool-calling']):
        return "🔌 MCP & Tools"
    elif any(k in combined for k in ['observability', 'eval', 'evaluation', 'tracing', 'telemetry', 'logfire']):
        return "⚡ Observability"
    elif any(k in combined for k in ['vision', 'multimodal', 'diffusion', 'audio', 'speech', 'comfyui', 'ocr']):
        return "🎨 Multimodal"
    elif any(k in combined for k in ['llm', 'langchain', 'llama', 'transformer', 'prompt', 'fine-tuning', 'sft']):
        return "🧠 LLM & Frameworks"
    return "💡 AI Tool"

def fetch_discoveries():
    """Fetches a random repository matching one of the search queries, excluding existing ones."""
    headers = {"User-Agent": "Awesome-AI-Discoveries-Bot"}
    if TOKEN:
        headers["Authorization"] = f"token {TOKEN}"

    existing_repos = get_existing_repos()
    print(f"Loaded {len(existing_repos)} existing repositories to avoid duplicates.")

    # Shuffle queries for rotation
    queries = list(SEARCH_QUERIES)
    random.shuffle(queries)

    for query in queries:
        url = f"https://api.github.com/search/repositories?q={query}&sort=updated&order=desc"
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            items = response.json().get('items', [])[:20]
            
            # Filter out already logged repositories
            unseen = [item for item in items if item['full_name'].lower().strip() not in existing_repos]
            
            if unseen:
                selected = random.choice(unseen)
                print(f"Selected new discovery '{selected['full_name']}' using query: {query}")
                return selected
            else:
                print(f"All items for query '{query}' already logged. Trying next query...")
        except Exception as e:
            print(f"API Error for query '{query}': {e}")
            continue

    print("API Warning: No new repositories found across all search queries.")
    return None

def update_project_of_the_week():
    """Finds the repo with the most stars discovered in the past 7 days and features it using HTML comment markers."""
    if not os.path.exists("README.md"):
        return
    
    # --- SUNDAY RANDOM SKIP ---
    if random.random() < 0.20:
        print("Sunday Stealth: Skipping the Featured update this week!")
        return

    with open("README.md", "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.splitlines(keepends=True)
    all_repos = []
    weekly_candidates = []
    one_week_ago_str = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

    for line in lines:
        if line.startswith("| 20"): 
            parts = line.split("|")
            try:
                date_str = parts[1].strip()
                repo_link = parts[2].strip()
                star_count = int(parts[-2].replace("⭐", "").replace(",", "").strip())
                entry = (star_count, repo_link, date_str)
                all_repos.append(entry)
                if date_str >= one_week_ago_str:
                    weekly_candidates.append(entry)
            except:
                continue

    if not all_repos:
        return

    # Select from discoveries in last 7 days, fallback to the 7 newest discoveries
    target_pool = weekly_candidates if weekly_candidates else all_repos[-7:]
    best_repo = max(target_pool, key=lambda x: x[0])
    featured_block = f"<!-- FEATURED_START -->\n### 🏆 Project of the Week\nThe most popular discovery lately: **{best_repo[1]}**\n<!-- FEATURED_END -->\n"

    # Replace content between markers if present
    if "<!-- FEATURED_START -->" in content and "<!-- FEATURED_END -->" in content:
        pattern = r"<!-- FEATURED_START -->.*?<!-- FEATURED_END -->"
        new_content = re.sub(pattern, featured_block.strip(), content, flags=re.DOTALL)
        with open("README.md", "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated Project of the Week to '{best_repo[1]}' ({best_repo[0]:,} stars).")
    else:
        print("Featured markers not found in README.md; skipping inline marker update.")

def update_daily_log(repo):
    repo_name = repo['full_name']
    date_str = datetime.now().strftime("%Y-%m-%d")
    url = repo['html_url']
    language = repo.get('language') or "Python"
    category = determine_category(repo)
    raw_desc = repo['description'] or "No description provided."
    desc = raw_desc.replace("\n", " ").replace("\r", "").replace("|", "-").strip()
    stars = repo['stargazers_count']
    
    new_entry = f"| {date_str} | [{repo_name}]({url}) | {language} | {category} | {desc} | ⭐ {stars:,} |\n"
    
    with open("README.md", "a", encoding="utf-8") as f:
        f.write(new_entry)

if __name__ == "__main__":
    if datetime.now().weekday() == 6:
        update_project_of_the_week()

    discovery = fetch_discoveries()
    if discovery:
        update_daily_log(discovery)
        try:
            from generate_data import generate_json_data
            generate_json_data()
        except Exception as e:
            print(f"Warning: Failed to update site data JSON: {e}")
        print("Successfully updated README.md and data/discoveries.json with new discovery.")
    else:
        print("Failed to fetch discovery from GitHub API.")
        sys.exit(1)


