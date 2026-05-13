import { NextResponse } from "next/server";
import { z } from "zod";

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(request: Request, schema: TSchema) {
  try {
    return { data: schema.parse(await request.json()) as z.infer<TSchema> };
  } catch (error) {
    const issues = error instanceof z.ZodError ? error.issues : undefined;
    return {
      response: NextResponse.json(
        {
          error: "Invalid request body",
          issues
        },
        { status: 400 }
      )
    };
  }
}
