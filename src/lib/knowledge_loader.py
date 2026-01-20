import os
from functools import lru_cache

# Define the base directory for knowledge files
KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), '../knowledge')

@lru_cache(maxsize=1)
def load_knowledge():
    """
    Load all .md files from the knowledge directory and combine their contents.
    Uses caching to avoid re-reading files on every request.

    Returns:
        str: Combined knowledge base content.
    """
    combined_content = ["# Snipr Knowledge Base"]

    for filename in sorted(os.listdir(KNOWLEDGE_DIR)):
        if filename.endswith('.md'):
            file_path = os.path.join(KNOWLEDGE_DIR, filename)
            with open(file_path, 'r') as file:
                content = file.read()
                combined_content.append(f"## {filename}\n{content}")

    return '\n\n'.join(combined_content)

def get_knowledge():
    """
    Helper function to get the combined knowledge base content.

    Returns:
        str: Combined knowledge base content.
    """
    return load_knowledge()