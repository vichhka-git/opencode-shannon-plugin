# Contributing to OpenCode Shannon Plugin

Thank you for your interest in contributing to the OpenCode Shannon Plugin! This guide will help you get started.

## Development Setup

### Prerequisites

- **Bun** v1.3.0 or higher (NOT npm or yarn)
- **OpenCode** v1.0.150 or higher
- **Git** for version control

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/opencode-shannon-plugin.git
   cd opencode-shannon-plugin
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Build the plugin**:
   ```bash
   bun run build
   ```

4. **Run tests**:
   ```bash
   bun test
   ```

## Architecture Overview

This plugin follows the **oh-my-opencode modular architecture pattern**:

### Directory Structure

```
src/
├── index.ts              # Plugin entry point (hook registration, tool wiring)
├── types.ts              # Shared type definitions
├── config/               # Zod schema for Shannon settings
├── shared/               # Reusable modules (executor, adapters, utilities)
├── tools/                # 5 Shannon tools (scan, recon, vuln, exploit, report)
├── hooks/                # 3 lifecycle hooks (auth, progress, session)
├── commands/             # Slash commands (/shannon-scan, /shannon-recon, /shannon-report)
└── skills/               # shannon-pentest.md skill definition
```

### File Organization Rules

**CRITICAL: These rules are MANDATORY and non-negotiable.**

1. **200 LOC Hard Limit**:
   - Every file MUST be under 200 lines (excluding prompt strings)
   - If a file exceeds 200 LOC, split it into smaller modules
   - This is a code smell indicator, not a suggestion

2. **Single Responsibility Principle**:
   - Each file has ONE clear, nameable responsibility
   - No catch-all `utils.ts`, `helpers.ts`, or `service.ts` files
   - Name files by their specific purpose (e.g., `message-adapter.ts`, `provider-detector.ts`)

3. **Module Structure**:
   Each tool/hook follows this 4-file pattern:
   ```
   feature-name/
   ├── types.ts       # Type definitions
   ├── constants.ts   # Constants, configs, default values
   ├── hook.ts        # Hook implementation (tools.ts for tools)
   └── index.ts       # Barrel exports only
   ```

4. **index.ts is ENTRY POINT ONLY**:
   - Only re-exports from submodules
   - Only factory function calls
   - Only wiring/composition logic
   - NO business logic, implementations, or heavy computation

5. **Bun Only**:
   - NEVER use `npm` or `yarn`
   - ALWAYS use `bun` for all operations
   - Use `bun-types` (NOT `@types/node`)

## Code Style

### TypeScript

- **Strict mode** enabled (`strict: true`)
- **No type suppression**: Never use `as any`, `@ts-ignore`, `@ts-expect-error`
- **Explicit return types** for public functions
- **Interface over type** for object shapes

### Testing

- **Test-Driven Development (TDD)** required for new features
- **BDD comments** for test structure:
  ```typescript
  test("should parse provider from model string", () => {
    //#given
    const modelString = "google/gemini-2.0-flash-thinking-exp"
    
    //#when
    const result = parseModelString(modelString)
    
    //#then
    expect(result.provider).toBe("google")
    expect(result.model).toBe("gemini-2.0-flash-thinking-exp")
  })
  ```
- **Co-locate tests**: Place `.test.ts` files alongside source files
- **Test coverage**: Aim for 80%+ coverage on core logic

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `message-adapter.ts`)
- **Directories**: `kebab-case/` (e.g., `shannon-scan/`)
- **Functions**: `camelCase` (e.g., `parseModelString`)
- **Factory functions**: `createXXXHook`, `createXXXTool` pattern
- **Types/Interfaces**: `PascalCase` (e.g., `ShannonExecutorConfig`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `KNOWN_PROVIDERS`)

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Write Tests First (TDD)

```bash
# Create test file
touch src/shared/your-feature.test.ts

# Write failing test
bun test  # Should FAIL (RED)
```

### 3. Implement Feature

```bash
# Write minimum implementation
touch src/shared/your-feature.ts

# Run tests
bun test  # Should PASS (GREEN)
```

### 4. Refactor

```bash
# Clean up code while keeping tests passing
bun test  # Should stay GREEN
```

### 5. Verify Build

```bash
bun run typecheck  # 0 errors
bun run build      # Successful bundle
```

### 6. Commit Changes

```bash
git add .
git commit -m "feat: add your feature description"
```

## Pull Request Guidelines

### PR Checklist

- [ ] Tests added/updated (TDD followed)
- [ ] All tests passing (`bun test`)
- [ ] TypeScript compiles with 0 errors (`bun run typecheck`)
- [ ] Build succeeds (`bun run build`)
- [ ] Files under 200 LOC limit (excluding prompt strings)
- [ ] No catch-all utility files created
- [ ] README updated (if applicable)
- [ ] CHANGELOG updated with changes

### PR Description Template

```markdown
## What does this PR do?

Brief description of the feature/fix.

## Why is this change needed?

Explanation of the problem this solves.

## How was this tested?

- [ ] Unit tests added/updated
- [ ] Manual testing performed
- [ ] Integration tests (if applicable)

## Checklist

- [ ] Tests passing
- [ ] TypeScript compiles
- [ ] Build succeeds
- [ ] Documentation updated
```

## Testing Guidelines

### Unit Tests

- **Location**: Co-locate with source files (e.g., `message-adapter.test.ts`)
- **Structure**: Use BDD comments (`#given`, `#when`, `#then`)
- **Coverage**: Test happy paths, edge cases, and error conditions

### Integration Tests

- **Manual testing**: Test in real OpenCode environment
- **End-to-end workflows**: Test full shannon_scan with all phases
- **Multi-provider testing**: Test with different AI providers

### Test Commands

```bash
bun test                    # Run all tests
bun test src/shared/        # Run tests in directory
bun test message-adapter    # Run tests matching pattern
```

## Adding New Features

### Adding a New Tool

1. **Create tool directory**:
   ```bash
   mkdir src/tools/your-tool
   ```

2. **Create 4-file structure**:
   ```bash
   touch src/tools/your-tool/{types,constants,tools,index}.ts
   ```

3. **Implement tool**:
   - `types.ts`: Input/output types
   - `constants.ts`: Default values, configs
   - `tools.ts`: Tool implementation
   - `index.ts`: Barrel export

4. **Register in plugin**:
   - Add to `src/index.ts` tool registry
   - Export from `src/tools/index.ts`

5. **Write tests**:
   ```bash
   touch src/tools/your-tool/tools.test.ts
   ```

### Adding a New Hook

1. **Create hook directory**:
   ```bash
   mkdir src/hooks/your-hook
   ```

2. **Create 4-file structure**:
   ```bash
   touch src/hooks/your-hook/{types,constants,hook,index}.ts
   ```

3. **Implement hook**:
   - `types.ts`: Hook input/output types
   - `constants.ts`: Hook constants
   - `hook.ts`: Hook factory function
   - `index.ts`: Barrel export

4. **Register in plugin**:
   - Import in `src/index.ts`
   - Add to hook chain in plugin interface

5. **Write tests**:
   ```bash
   touch src/hooks/your-hook/hook.test.ts
   ```

## Common Tasks

### Run Type Checking

```bash
bun run typecheck
```

### Build Plugin

```bash
bun run build
```

### Clean Build

```bash
rm -rf dist/
bun run build
```

### Run Specific Test

```bash
bun test message-adapter.test.ts
```

## Debugging

### Enable Debug Logging

Set environment variable:
```bash
export DEBUG=shannon:*
```

### Common Issues

1. **Build fails with module errors**:
   - Check `tsconfig.json` paths
   - Verify all imports use relative paths
   - Run `bun install` to refresh dependencies

2. **Tests fail after refactor**:
   - Verify exports in `index.ts` files
   - Check for circular dependencies
   - Run `bun run typecheck` first

3. **Hook not executing**:
   - Verify hook is imported in `src/index.ts`
   - Check hook is registered in plugin interface
   - Ensure hook handler signature matches OpenCode API

## Code Review Process

### What Reviewers Look For

1. **Architecture compliance**:
   - 200 LOC limit enforced
   - Single responsibility maintained
   - No catch-all files

2. **Type safety**:
   - No `any` types
   - No type suppressions
   - Explicit return types

3. **Test coverage**:
   - Tests exist for new code
   - TDD process followed
   - Edge cases covered

4. **Documentation**:
   - README updated
   - Code comments for complex logic
   - Type definitions documented

## License

This project is licensed under **GNU AGPL-3.0**. All contributions must:

1. Be compatible with AGPL-3.0
2. Include source code attribution
3. Maintain AGPL-3.0 license for derivative works

See [LICENSE](./LICENSE) for full text.

## Attribution

This plugin builds upon [Shannon](https://github.com/KeygraphHQ/shannon) by KeygraphHQ, licensed under AGPL-3.0.

## Questions?

- Open an issue for bugs or feature requests
- Tag maintainers for urgent questions
- Check existing issues before creating new ones

## Code of Conduct

- Be respectful and professional
- Provide constructive feedback
- Follow the architecture guidelines
- Test your code before submitting
- Document complex logic

Thank you for contributing! 🚀
