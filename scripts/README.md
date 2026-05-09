# Code Quality Scripts

This project includes automated code quality checking scripts to maintain TypeScript and lint standards.

## Available Scripts

### `npm run code-quality`
Runs the complete code quality check:
- TypeScript compilation check (`vue-tsc --noEmit`)
- ESLint check for unused variables and lint errors
- Duplicate lint check for thoroughness

### `npm run code-quality:fix`
Automatically fixes fixable issues:
- Runs ESLint with `--fix` flag
- Then runs TypeScript check to ensure no breaking changes

### `npm run type-check`
Checks TypeScript compilation without emitting files:
```bash
npm run type-check
```

### `npm run lint-check`
Runs ESLint with zero warnings tolerance:
```bash
npm run lint-check
```

### `npm run lint-fix`
Automatically fixes ESLint issues:
```bash
npm run lint-fix
```

## Usage

### Before committing changes
```bash
npm run code-quality
```

### Quick fix for lint issues
```bash
npm run code-quality:fix
```

### Continuous Integration
Add these scripts to your CI pipeline:
```yaml
- name: Code Quality Check
  run: npm run code-quality
```

## Configuration

The ESLint configuration is in `eslint.config.js` and includes:
- TypeScript parsing support
- Browser and Node.js globals
- Rules for unused variables, prefer-const, etc.
- Vue files are currently excluded to avoid parser complexity

## What Gets Checked

- **TypeScript errors**: Type mismatches, missing imports, etc.
- **Unused variables**: Variables, imports, and parameters not used
- **Code style**: prefer-const, no-console warnings, etc.
- **Global variables**: Properly defined browser and Node.js globals

## Troubleshooting

If ESLint shows parsing errors for TypeScript:
1. Ensure `@typescript-eslint/parser` is installed
2. Check `eslint.config.js` for correct parser configuration
3. Verify TypeScript files are included in the configuration

For Vue file linting, additional configuration would be needed to handle Vue SFC parsing.
