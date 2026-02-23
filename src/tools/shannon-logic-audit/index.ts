import { Tool, ToolExecuteContext, ToolExecuteOutput } from '../../types';

export const shannon_logic_audit: Tool = {
  name: 'shannon_logic_audit',
  description: 'Execute business logic vulnerability testing using user-defined personas and workflows. Tests for price manipulation, quantity tampering, and state-machine bypasses.',
  arguments: {
    target: {
      type: 'string',
      description: 'The target URL or endpoint to test (e.g., https://target/api/checkout)',
      required: true
    },
    workflow: {
      type: 'string',
      description: 'Description of the workflow to test (e.g., "Add to cart -> Checkout -> Payment")',
      required: true
    },
    persona: {
      type: 'string',
      description: 'The user persona to adopt (e.g., "Standard User", "Unauthenticated User", "Guest")',
      required: true
    },
    payload: {
      type: 'string',
      description: 'The JSON payload or form data to test with manipulation (e.g., {"price": -1, "quantity": 100})',
      required: true
    }
  },
  execute: async (args: any, context: ToolExecuteContext): Promise<ToolExecuteOutput> => {
    // Implementation will be handled by the specialized shannon_exec runner internally
    return {
      output: `Executing logic audit on ${args.target} using workflow "${args.workflow}" as ${args.persona}.\nPayload: ${args.payload}`,
      instructions: 'Analyze the response for successful status codes (2xx) despite invalid payloads. Escalate to Oracle if price manipulation is successful.'
    };
  }
};
