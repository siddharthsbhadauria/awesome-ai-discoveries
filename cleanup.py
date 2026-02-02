import os
from datetime import datetime

def archive_old_entries(limit=100):
    if not os.path.exists("README.md"):
        return

    with open("README.md", "r", encoding="utf-8") as f:
        lines = f.readlines()

    header = []
    table_rows = []
    
    # Separate the header/Project of the Week from the table data
    for line in lines:
        if line.startswith("| 20"): # Matches date rows
            table_rows.append(line)
        else:
            if not table_rows: # Content before the table starts
                header.append(line)

    if len(table_rows) <= limit:
        print(f"Only {len(table_rows)} entries. No cleanup needed.")
        return

    # Split: Keep the newest, archive the oldest
    to_keep = table_rows[-limit:]
    to_archive = table_rows[:-limit]

    # 1. Update README with only the newest entries
    with open("README.md", "w", encoding="utf-8") as f:
        f.writelines(header)
        f.writelines(to_keep)

    # 2. Save old entries to an archive file
    archive_date = datetime.now().strftime("%Y-%m")
    archive_path = f"archive/log_{archive_date}.md"
    
    with open(archive_path, "w", encoding="utf-8") as f:
        f.write(f"# Archive for {archive_date}\n\n")
        f.write("| Date | Repository | Description | Stars |\n")
        f.write("| :--- | :--- | :--- | :--- |\n")
        f.writelines(to_archive)
        
    print(f"Moved {len(to_archive)} entries to {archive_path}")

if __name__ == "__main__":
    archive_old_entries()
