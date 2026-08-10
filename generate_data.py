import os
import json
import re
from datetime import datetime, timezone

def parse_markdown_table_file(filepath):
    entries = []
    if not os.path.exists(filepath):
        return entries

    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("| 20"):
                parts = [p.strip() for p in line.split("|")]
                # Handle 6-col format: ['', Date, Repo, Language, Category, Desc, Stars, ''] -> len == 8
                # Handle 4-col format: ['', Date, Repo, Desc, Stars, ''] -> len == 6
                if len(parts) >= 6:
                    date_val = parts[1]
                    repo_link = parts[2]
                    
                    # Extract name and url from markdown link
                    match = re.search(r'\[([^\]]+)\]\(([^\)]+)\)', repo_link)
                    if not match:
                        continue
                    repo_name = match.group(1).strip()
                    repo_url = match.group(2).strip()

                    if len(parts) == 8:
                        language = parts[3]
                        category = parts[4]
                        desc = parts[5]
                        stars_raw = parts[6]
                    else: # 4-col legacy
                        language = "Python"
                        category = "💡 AI Tool"
                        desc = parts[3]
                        stars_raw = parts[4]

                    # Parse stars count
                    stars_clean = stars_raw.replace("⭐", "").replace(",", "").strip()
                    try:
                        stars_num = int(stars_clean)
                    except ValueError:
                        stars_num = 0

                    entries.append({
                        "date": date_val,
                        "name": repo_name,
                        "url": repo_url,
                        "language": language,
                        "category": category,
                        "description": desc,
                        "stars": stars_num,
                        "stars_formatted": f"{stars_num:,}"
                    })
    return entries

def generate_json_data():
    all_entries = []
    files_to_check = ["README.md"]

    if os.path.exists("archive"):
        for fname in sorted(os.listdir("archive"), reverse=True):
            if fname.endswith(".md"):
                files_to_check.append(os.path.join("archive", fname))

    for filepath in files_to_check:
        entries = parse_markdown_table_file(filepath)
        all_entries.extend(entries)

    # Sort entries by date descending, then stars descending
    all_entries.sort(key=lambda x: (x["date"], x["stars"]), reverse=True)

    # Deduplicate entries by repo name keeping the newest / highest star entry
    unique_entries = []
    seen_repos = set()
    total_stars = 0

    for item in all_entries:
        repo_key = item["name"].lower()
        if repo_key not in seen_repos:
            seen_repos.add(repo_key)
            unique_entries.append(item)
            total_stars += item["stars"]

    # Featured Project of the Week (highest star count)
    featured = max(unique_entries, key=lambda x: x["stars"]) if unique_entries else None

    # Collect categories and languages count
    categories_count = {}
    languages_count = {}
    for item in unique_entries:
        cat = item["category"]
        lang = item["language"]
        categories_count[cat] = categories_count.get(cat, 0) + 1
        languages_count[lang] = languages_count.get(lang, 0) + 1

    site_data = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "stats": {
            "total_discoveries": len(unique_entries),
            "total_stars": total_stars,
            "total_stars_formatted": f"{total_stars:,}",
            "categories_count": categories_count,
            "languages_count": languages_count
        },
        "featured": featured,
        "discoveries": unique_entries
    }

    os.makedirs("data", exist_ok=True)
    out_path = os.path.join("data", "discoveries.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(site_data, f, indent=2, ensure_ascii=False)

    print(f"Generated {out_path} with {len(unique_entries)} unique discoveries (Total Stars: {total_stars:,}).")

if __name__ == "__main__":
    generate_json_data()
