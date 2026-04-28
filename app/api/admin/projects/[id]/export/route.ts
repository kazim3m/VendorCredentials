import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { buildProjectExport } from "@/lib/export";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  await requireAdmin();

  try {
    const result = await buildProjectExport(params.id);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Project export failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
