# Google Workspace MCP Server

MCP server for Google Docs API and Google Drive Comments API integration.

## Tools

### Google Docs API

| Tool | Description |
|------|-------------|
| `docs_get_document` | Get document content by ID |
| `docs_create_document` | Create a new document |
| `docs_batch_update` | Insert/update/delete text, formatting, images, tables |

### Google Drive API (Comments)

| Tool | Description |
|------|-------------|
| `drive_list_comments` | List comments on a document |
| `drive_create_comment` | Add a comment (anchored or unanchored) |
| `drive_reply_to_comment` | Reply to an existing comment |
| `drive_resolve_comment` | Mark comment as resolved |
| `drive_delete_comment` | Delete a comment |

## Setup

### 1. Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select existing)
3. Enable Google Docs API and Google Drive API
4. Create OAuth 2.0 credentials (Desktop app type)
5. Download the credentials

### 2. Get Refresh Token

Use the OAuth 2.0 Playground or a script to obtain a refresh token with these scopes:
- `https://www.googleapis.com/auth/documents`
- `https://www.googleapis.com/auth/drive`

### 3. Environment Variables

```bash
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export GOOGLE_REFRESH_TOKEN="your-refresh-token"
```

### 4. Build & Run

```bash
npm install
npm run build
npm start
```

## Claude Code Configuration

Add to your MCP settings:

```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": ["/path/to/google-workspace-mcp-server/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id",
        "GOOGLE_CLIENT_SECRET": "your-client-secret",
        "GOOGLE_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```
