---
name: search-the-codebase
description: Answer questions about a MisarDev project from its indexed code, citing the files used. Use when asked how something works, where code lives, or to explain part of a MisarDev project.
---

# Search the codebase

## Steps

1. `get_code_index_stats` — confirm the project is indexed. If it is not, say
   so and **ask before** running `index_project_code`: indexing is metered.
2. `search_project_code` with the question in plain language.
3. `get_project_files` to read what the search points at in full.

## Rules

Answer only from what you actually retrieved, and name the files you used.

If the index does not cover the question, say so. A confident answer assembled
from general knowledge about a framework — rather than from this codebase — is
the failure mode here, and it is hard for the user to detect.

`search_workspace` is a different tool: it finds projects, templates and
gallery items by name, never code inside files. `web_search` answers from the
public web with citations — use it for library or API questions, and label what
came from the web versus from the user's code.

`clear_code_index` wipes the index; suggest it only when results are clearly
stale, and re-index straight after.
