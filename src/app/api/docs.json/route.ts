/**
 * OpenAPI JSON Route
 * GET /api/docs.json
 */

import { NextResponse } from "next/server";
import { apiDocumentation } from "@/lib/swagger";

export async function GET() {
  return NextResponse.json(apiDocumentation);
}

export const dynamic = "force-dynamic";
