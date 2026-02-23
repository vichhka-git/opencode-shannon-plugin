import { Tool, ToolExecuteContext, ToolExecuteOutput } from '../../types';

export const shannon_api_fuzzer: Tool = {
  name: 'shannon_api_fuzzer',
  description: 'Schema-aware fuzzer for modern APIs (GraphQL, gRPC, REST). Detects introspection leaks and BOLA.',
  arguments: {
    target: {
      type: 'string',
      description: 'The API endpoint URL.',
      required: true
    },
    schema_type: {
      type: 'string',
      description: 'The API type: "graphql", "grpc", or "rest"',
      required: true
    },
    introspection: {
      type: 'boolean',
      description: 'Attempt to leak schema via introspection.',
      default: true
    }
  },
  execute: async (args: any, context: ToolExecuteContext): Promise<ToolExecuteOutput> => {
    return {
      output: `Fuzzing ${args.schema_type} API at ${args.target} (Introspection: ${args.introspection})...`,
      instructions: 'Analyze schema for sensitive fields (e.g., password, role, is_admin). If found, use shannon_idor_test to test for BOLA.'
    };
  }
};
