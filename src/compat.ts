import { z } from "zod"

export type ToolDefinition = any
export type ShannonToolDef = any

export function tool(def: {
  description: string
  args: Record<string, any>
  execute: (args: any) => Promise<string>
}) {
  const shape: Record<string, any> = {}
  for (const [key, val] of Object.entries(def.args)) {
    shape[key] = val
  }
  return {
    description: def.description,
    input: z.object(shape),
    async execute(input: any) {
      const output = await def.execute(input)
      return {
        content: output,
      }
    },
  }
}

export namespace tool {
  export const schema = {
    string: () => z.string(),
    number: () => z.number(),
    boolean: () => z.boolean(),
    enum: <T extends readonly string[]>(values: T) => z.enum(values as unknown as [string, ...string[]]),
    object: <T extends z.ZodRawShape>(shape: T) => z.object(shape),
    record: (valSchema?: any, _opts?: any) => z.record(z.string(), valSchema ?? z.any()),
  }
}
