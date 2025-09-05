/**
 * MCP HTTP Endpoint - Streamable HTTP style
 * Provides POST /mcp/ endpoint that mirrors MCP methods
 */

import express from 'express';
import { GHLMCPHttpServer } from './http-server';

// Helper to write one JSON-RPC result chunk over an event stream and close
function writeJsonRpcAndEnd(res: express.Response, payload: any) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  res.end();
}

export function attachMcpHttp(app: express.Application, mcpServer: GHLMCPHttpServer) {
  app.post("/mcp/", express.json({ limit: "2mb" }), async (req, res) => {
    // Respond as an SSE stream (Streamable HTTP style)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");

    const { id, method, params } = req.body ?? {};
    if (!method) {
      return writeJsonRpcAndEnd(res, {
        jsonrpc: "2.0",
        id: id ?? null,
        error: { code: -32600, message: "Invalid Request" },
      });
    }

    try {
      if (method === "tools/list") {
        // Get tools from the existing MCP server
        const tools = await mcpServer.getAllTools();
        
        return writeJsonRpcAndEnd(res, {
          jsonrpc: "2.0",
          id,
          result: { tools },
        });
      }

      if (method === "tools/call") {
        const name = params?.name;
        const args = params?.arguments ?? {};
        
        if (!name) {
          return writeJsonRpcAndEnd(res, {
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Invalid params: name is required" },
          });
        }

        // Execute tool using existing MCP server logic
        const result = await mcpServer.executeTool(name, args);
        
        return writeJsonRpcAndEnd(res, {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
              }
            ]
          },
        });
      }

      if (method === "initialize") {
        return writeJsonRpcAndEnd(res, {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "ghl-mcp-server",
              version: "1.0.0"
            }
          },
        });
      }

      // Method not found
      return writeJsonRpcAndEnd(res, {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      });
    } catch (err: any) {
      console.error(`[MCP HTTP] Error executing ${method}:`, err);
      return writeJsonRpcAndEnd(res, {
        jsonrpc: "2.0",
        id,
        error: { code: -32000, message: err?.message ?? "Internal error" },
      });
    }
  });

  // Handle OPTIONS for CORS
  app.options("/mcp/", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
    res.status(200).end();
  });
}
