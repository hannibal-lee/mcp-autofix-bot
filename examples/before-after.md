# Before / After Examples

These examples show the style of changes `mcp-autofix-bot` should propose. The bot should generate small diffs that a maintainer can quickly accept, edit, or reject.

## 1. Vague Tool Description

Before:

```json
{
  "name": "read_file",
  "description": "Read file",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string"
      }
    }
  }
}
```

After:

```json
{
  "name": "read_file",
  "description": "Read a UTF-8 text file from the configured workspace and return its contents. Parent-directory traversal and absolute paths are rejected.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Workspace-relative path to the text file to read."
      }
    },
    "required": ["path"]
  }
}
```

## 2. Missing Parameter Semantics

Before:

```json
{
  "name": "search_docs",
  "description": "Search project docs.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "q": {
        "type": "string"
      },
      "limit": {
        "type": "number"
      }
    }
  }
}
```

After:

```json
{
  "name": "search_docs",
  "description": "Search indexed project documentation and return ranked snippets with source paths.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "q": {
        "type": "string",
        "description": "Natural-language search query. Use specific symbols, filenames, or concepts when available."
      },
      "limit": {
        "type": "integer",
        "minimum": 1,
        "maximum": 20,
        "description": "Maximum number of ranked snippets to return."
      }
    },
    "required": ["q"]
  }
}
```

## 3. Destructive Tool Without Confirmation

Before:

```json
{
  "name": "delete_file",
  "description": "Delete file",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string"
      }
    },
    "required": ["path"]
  }
}
```

After:

```json
{
  "name": "delete_file",
  "description": "Delete a single file inside the configured workspace. This tool does not delete directories and requires explicit confirmation before execution.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Workspace-relative file path. Absolute paths and parent-directory traversal are rejected."
      },
      "confirm": {
        "type": "boolean",
        "description": "Must be true to perform the deletion after the caller has shown the target path to the user."
      }
    },
    "required": ["path", "confirm"]
  }
}
```
