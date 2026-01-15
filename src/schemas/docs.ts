import { z } from "zod";
import { ResponseFormat } from "../constants.js";

export const GetDocumentSchema = z.object({
  document_id: z.string()
    .min(1, "Document ID is required")
    .describe("The ID of the Google Doc to retrieve (found in the URL)"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for structured data")
}).strict();

export type GetDocumentInput = z.infer<typeof GetDocumentSchema>;

export const CreateDocumentSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(500, "Title must not exceed 500 characters")
    .describe("The title for the new document"),
  body_content: z.string()
    .optional()
    .describe("Optional initial text content for the document body")
}).strict();

export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>;

export const BatchUpdateSchema = z.object({
  document_id: z.string()
    .min(1, "Document ID is required")
    .describe("The ID of the Google Doc to update"),
  requests: z.array(z.record(z.unknown()))
    .min(1, "At least one request is required")
    .describe("Array of batch update request objects (see Google Docs API batchUpdate documentation)")
}).strict();

export type BatchUpdateInput = z.infer<typeof BatchUpdateSchema>;
