#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { ALL_TOOLS, findTool } from "./tools/index.js";
import { listResources, readResource, RESOURCE_TEMPLATES } from "./resources/index.js";
import { ensureDirs } from "./state/paths.js";
import { formatError } from "./lib/errors.js";

async function main() {
  ensureDirs();

  const server = new Server(
    { name: "pwndoc-mcp", version: "0.1.0" },
    { capabilities: { tools: {}, resources: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = findTool(req.params.name);
    if (!tool) {
      return { content: [{ type: "text", text: `Unknown tool: ${req.params.name}` }], isError: true };
    }
    try {
      const text = await tool.handler(req.params.arguments ?? {});
      return { content: [{ type: "text", text }] };
    } catch (e) {
      return { content: [{ type: "text", text: formatError(e) }], isError: true };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: await listResources(),
  }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: RESOURCE_TEMPLATES,
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    try {
      const r = await readResource(req.params.uri);
      return { contents: [{ uri: r.uri, mimeType: r.mimeType, text: r.text }] };
    } catch (e) {
      return {
        contents: [{ uri: req.params.uri, mimeType: "text/plain", text: formatError(e) }],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr only (stdout is reserved for the MCP protocol).
  process.stderr.write(`pwndoc-mcp running. ${ALL_TOOLS.length} tools registered.\n`);
}

main().catch((e) => {
  process.stderr.write(`fatal: ${e?.stack || e}\n`);
  process.exit(1);
});
