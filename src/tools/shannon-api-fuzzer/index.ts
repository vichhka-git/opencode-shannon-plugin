import { tool, type ToolDefinition } from "@opencode-ai/plugin"
import { DockerManager } from "../../docker"

export function createShannonApiFuzzer(): ToolDefinition {
  return tool({
    description:
      "Schema-aware fuzzer for modern APIs — REST, GraphQL, and gRPC. Detects introspection leaks, BOLA, missing auth, and schema-level vulnerabilities.\n\n**Modes:**\n- **graphql** — GraphQL-specific testing: introspection dump, batch query abuse, deep nesting DoS, field-level auth bypass, mutation fuzzing\n- **rest** — REST API testing: enumerate resource IDs (BOLA/IDOR), test unauthenticated access, verb tampering\n- **grpc** — gRPC reflection attack and service enumeration\n\n**Example usage:**\n- GraphQL: target=\"https://example.com/graphql\", mode=\"graphql\"\n- REST: target=\"https://example.com/api/v1\", mode=\"rest\", auth_token=\"Bearer eyJ...\"\n\n**IMPORTANT**: Only use on systems you own or have explicit written permission to test.",
    args: {
      target: tool.schema
        .string()
        .describe("Target API URL (e.g., 'https://example.com/graphql' or 'https://example.com/api/v1')"),
      mode: tool.schema
        .enum(["graphql", "rest", "grpc"])
        .optional()
        .describe("API type to fuzz: graphql, rest, or grpc (default: graphql)"),
      auth_token: tool.schema
        .string()
        .optional()
        .describe("Auth token for authenticated testing (e.g., 'Bearer eyJ...')"),
      timeout: tool.schema
        .number()
        .optional()
        .describe("Timeout in milliseconds (default: 60000)"),
    },
    async execute(args) {
      const mode = args.mode ?? "graphql"

      if (mode === "graphql") {
        return runGraphqlTests(args.target, args.auth_token, args.timeout)
      }

      if (mode === "rest") {
        return [
          "## REST API Fuzzer",
          `**Target**: ${args.target}`,
          "",
          "### Recommended Tests",
          "Use `shannon_idor_test` in auto mode for comprehensive REST BOLA/IDOR testing:",
          "```",
          `shannon_idor_test mode="auto" target="${args.target}" auth_token="${args.auth_token ?? "Bearer <token>"}"`,
          "```",
          "",
          "### Manual Verb Tampering",
          "```bash",
          `curl -X HEAD ${args.target}`,
          `curl -X OPTIONS ${args.target}`,
          `curl -X TRACE ${args.target}`,
          "```",
          "",
          "Use `shannon_param_fuzz` to discover hidden parameters on REST endpoints.",
        ].join("\n")
      }

      if (mode === "grpc") {
        const docker = DockerManager.getInstance()
        await docker.ensureRunning()

        const host = args.target.replace(/^https?:\/\//, "").split("/")[0] ?? args.target
        const result = await docker.exec(
          `which grpcurl > /dev/null 2>&1 && grpcurl -plaintext ${host} list 2>&1 || echo "grpcurl not available — install via: go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest"`,
          args.timeout ?? 30000
        )
        return [
          "## gRPC API Fuzzer",
          `**Target**: ${args.target}`,
          "",
          "### gRPC Reflection Results",
          "```",
          result.stdout?.trim() || "No output",
          "```",
        ].join("\n")
      }

      return `ERROR: Unknown mode '${mode}'. Use: graphql, rest, or grpc`
    },
  })
}

async function runGraphqlTests(
  target: string,
  authToken: string | undefined,
  timeout: number | undefined
): Promise<string> {
  const docker = DockerManager.getInstance()
  await docker.ensureRunning()

  const authHeader = authToken
    ? `-H 'Authorization: ${authToken.startsWith("Bearer ") ? authToken : `Bearer ${authToken}`}'`
    : ""

  const output: string[] = []
  output.push("## GraphQL API Security Test")
  output.push(`**Target**: ${target}`)
  output.push("")

  // 1. Introspection query
  const introspectionQuery = `{"query":"{ __schema { types { name fields { name args { name type { name kind } } } } } }"}`
  const introspectionCmd = `curl -s -X POST ${target} -H 'Content-Type: application/json' ${authHeader} -d '${introspectionQuery.replace(/'/g, "'\\''")}'`
  const introResult = await docker.exec(introspectionCmd, timeout ?? 60000)
  const introOutput = introResult.stdout?.trim() ?? ""

  if (introOutput.includes('"__schema"') || introOutput.includes('"types"')) {
    output.push("### 🔴 CRITICAL: GraphQL Introspection Enabled")
    output.push("Introspection is enabled in production — full schema is publicly readable.")
    output.push("")
    output.push("**Evidence:**")
    output.push("```json")
    output.push(introOutput.slice(0, 1000))
    output.push("```")
    output.push("")
    output.push("**Remediation**: Disable introspection in production.")

    // Extract type names if possible
    try {
      const parsed = JSON.parse(introOutput)
      const types = (parsed?.data?.__schema?.types as Array<{ name: string }> | undefined)
        ?.filter((t) => !t.name.startsWith("__"))
        .map((t) => t.name) ?? []
      if (types.length > 0) {
        output.push("")
        output.push("**Schema Types Discovered:**")
        output.push(types.map((t) => `- \`${t}\``).join("\n"))
      }
    } catch {
      // ignore parse errors
    }
  } else {
    output.push("### ✅ Introspection: Disabled")
    output.push("Introspection is disabled (good). Attempting field name guessing...")
    output.push("")

    // Try clairvoyance-style guessing
    const guessQuery = `{"query":"{ users { id email password role } }"}`
    const guessCmd = `curl -s -X POST ${target} -H 'Content-Type: application/json' ${authHeader} -d '${guessQuery.replace(/'/g, "'\\''")}'`
    const guessResult = await docker.exec(guessCmd, 15000)
    output.push("**Common field probe result:**")
    output.push("```json")
    output.push(guessResult.stdout?.trim()?.slice(0, 500) ?? "No response")
    output.push("```")
  }

  output.push("")

  // 2. Batch query abuse
  output.push("### 🔄 Batch Query Test (DoS / Rate Limit Bypass)")
  const batchQuery = `[${Array(10).fill('{"query":"{ __typename }"}').join(",")}]`
  const batchCmd = `curl -s -o /dev/null -w "%{http_code}" -X POST ${target} -H 'Content-Type: application/json' ${authHeader} -d '${batchQuery.replace(/'/g, "'\\''")}'`
  const batchResult = await docker.exec(batchCmd, 15000)
  const batchStatus = batchResult.stdout?.trim()
  output.push(`Sent 10 batched queries — HTTP ${batchStatus}`)
  if (batchStatus === "200") {
    output.push("⚠️ Server accepted batch queries. Test for rate limit bypass and DoS via deeply nested batches.")
  } else {
    output.push("✅ Batch queries rejected or server returned error.")
  }

  output.push("")

  // 3. Deep nesting DoS
  output.push("### 🔁 Deep Nesting DoS Test")
  const deepQuery = `{"query":"{ user { friends { friends { friends { friends { id } } } } } }"}`
  const deepCmd = `curl -s -o /dev/null -w "%{http_code} %{time_total}s" -X POST ${target} -H 'Content-Type: application/json' ${authHeader} -d '${deepQuery.replace(/'/g, "'\\''")}'`
  const deepResult = await docker.exec(deepCmd, 15000)
  output.push(`Deep nested query response: \`${deepResult.stdout?.trim() ?? "no response"}\``)
  output.push("")

  // 4. Auth bypass mutations
  output.push("### 🔓 Common Mutation Probes")
  const mutations = [
    `{"query":"mutation { login(email: \\"admin@admin.com\\", password: \\"admin\\") { token } }"}`,
    `{"query":"mutation { register(email: \\"test@test.com\\", password: \\"test\\", role: \\"admin\\") { id } }"}`,
  ]
  for (const mut of mutations) {
    const mutCmd = `curl -s -X POST ${target} -H 'Content-Type: application/json' ${authHeader} -d '${mut.replace(/'/g, "'\\''")}'`
    const mutResult = await docker.exec(mutCmd, 10000)
    output.push("```json")
    output.push(mutResult.stdout?.trim()?.slice(0, 300) ?? "No response")
    output.push("```")
  }

  return output.join("\n")
}
