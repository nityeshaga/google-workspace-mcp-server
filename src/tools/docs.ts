import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDocsClient, handleGoogleError } from "../services/google-auth.js";
import {
  GetDocumentSchema,
  CreateDocumentSchema,
  BatchUpdateSchema,
  type GetDocumentInput,
  type CreateDocumentInput,
  type BatchUpdateInput
} from "../schemas/docs.js";
import { ResponseFormat, CHARACTER_LIMIT } from "../constants.js";
import type { docs_v1 } from "googleapis";

function extractTextFromBody(body: docs_v1.Schema$Body | null | undefined): string {
  if (!body?.content) return "";

  const textParts: string[] = [];

  for (const element of body.content) {
    if (element.paragraph?.elements) {
      for (const elem of element.paragraph.elements) {
        if (elem.textRun?.content) {
          textParts.push(elem.textRun.content);
        }
      }
    }
    if (element.table) {
      textParts.push("[TABLE]");
    }
  }

  return textParts.join("");
}

export function registerDocsTools(server: McpServer): void {
  server.registerTool(
    "docs_get_document",
    {
      title: "Get Google Document",
      description: `Retrieve the content of a Google Doc by its ID.

Args:
  - document_id (string): The ID of the Google Doc (found in the URL after /d/)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Document title, content, and metadata. For JSON format:
  {
    "documentId": string,
    "title": string,
    "textContent": string,
    "revisionId": string
  }

Examples:
  - Get doc content: document_id="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"`,
      inputSchema: GetDocumentSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetDocumentInput) => {
      try {
        const docs = getDocsClient();
        const response = await docs.documents.get({
          documentId: params.document_id
        });

        const doc = response.data;
        const textContent = extractTextFromBody(doc.body);

        const output = {
          documentId: doc.documentId || params.document_id,
          title: doc.title || "Untitled",
          textContent,
          revisionId: doc.revisionId
        };

        let textOutput: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          textOutput = [
            `# ${output.title}`,
            "",
            `**Document ID**: ${output.documentId}`,
            `**Revision ID**: ${output.revisionId || "N/A"}`,
            "",
            "## Content",
            "",
            textContent.length > CHARACTER_LIMIT
              ? textContent.substring(0, CHARACTER_LIMIT) + "\n\n[Content truncated...]"
              : textContent
          ].join("\n");
        } else {
          textOutput = JSON.stringify(output, null, 2);
        }

        return {
          content: [{ type: "text", text: textOutput }],
          structuredContent: output
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleGoogleError(error) }]
        };
      }
    }
  );

  server.registerTool(
    "docs_create_document",
    {
      title: "Create Google Document",
      description: `Create a new Google Doc with an optional initial body.

Args:
  - title (string): The title for the new document
  - body_content (string, optional): Initial text content for the document body

Returns:
  {
    "documentId": string,
    "title": string,
    "revisionId": string
  }

Examples:
  - Create empty doc: title="Meeting Notes"
  - Create with content: title="Draft", body_content="Hello World"`,
      inputSchema: CreateDocumentSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: CreateDocumentInput) => {
      try {
        const docs = getDocsClient();

        const createResponse = await docs.documents.create({
          requestBody: {
            title: params.title
          }
        });

        const documentId = createResponse.data.documentId;
        if (!documentId) {
          throw new Error("Failed to create document: no document ID returned");
        }

        if (params.body_content) {
          await docs.documents.batchUpdate({
            documentId,
            requestBody: {
              requests: [
                {
                  insertText: {
                    location: { index: 1 },
                    text: params.body_content
                  }
                }
              ]
            }
          });
        }

        const output = {
          documentId,
          title: createResponse.data.title || params.title,
          revisionId: createResponse.data.revisionId
        };

        return {
          content: [{
            type: "text",
            text: `Document created successfully.\n\n**Document ID**: ${output.documentId}\n**Title**: ${output.title}`
          }],
          structuredContent: output
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleGoogleError(error) }]
        };
      }
    }
  );

  server.registerTool(
    "docs_batch_update",
    {
      title: "Batch Update Google Document",
      description: `Apply batch updates to a Google Doc (insert/update/delete text, formatting, images, tables).

Args:
  - document_id (string): The ID of the Google Doc to update
  - requests (array): Array of batch update request objects

Common request types:
  - insertText: { insertText: { location: { index: 1 }, text: "Hello" } }
  - deleteContentRange: { deleteContentRange: { range: { startIndex: 1, endIndex: 10 } } }
  - updateTextStyle: { updateTextStyle: { range: {...}, textStyle: {...}, fields: "bold" } }
  - insertInlineImage: { insertInlineImage: { location: {...}, uri: "https://..." } }
  - insertTable: { insertTable: { rows: 3, columns: 3, location: {...} } }

See Google Docs API batchUpdate documentation for full request schema.

Returns:
  {
    "documentId": string,
    "replies": array,
    "writeControl": object
  }`,
      inputSchema: BatchUpdateSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: BatchUpdateInput) => {
      try {
        const docs = getDocsClient();

        const response = await docs.documents.batchUpdate({
          documentId: params.document_id,
          requestBody: {
            requests: params.requests as docs_v1.Schema$Request[]
          }
        });

        const output = {
          documentId: response.data.documentId || params.document_id,
          replies: response.data.replies || [],
          writeControl: response.data.writeControl
        };

        return {
          content: [{
            type: "text",
            text: `Batch update applied successfully to document ${output.documentId}.\n\n${output.replies.length} operation(s) completed.`
          }],
          structuredContent: output
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: handleGoogleError(error) }]
        };
      }
    }
  );
}
