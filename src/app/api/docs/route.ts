/**
 * Swagger/OpenAPI Documentation Route
 * GET /api/docs
 */

import { NextRequest, NextResponse } from "next/server";
import { apiDocumentation } from "@/lib/swagger";

export async function GET(request: NextRequest) {
  // Check if requesting Swagger UI
  const acceptHeader = request.headers.get("accept") || "";

  if (acceptHeader.includes("text/html")) {
    // Return Swagger UI HTML
    return new NextResponse(getSwaggerUI(), {
      headers: { "content-type": "text/html" },
    });
  }

  // Return OpenAPI JSON
  return NextResponse.json(apiDocumentation);
}

function getSwaggerUI(): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <title>ASCIT - API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700">
    <style>
      body {
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <redoc spec-url='/api/docs.json'></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script>
  </body>
</html>
  `.trim();
}

export const dynamic = "force-dynamic";
