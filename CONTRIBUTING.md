# Contributing to Star Logger

Thank you for your interest in contributing to Star Logger! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

- Node.js 18.x, 20.x, or 22.x
- pnpm 8.x or later
- Git

### Setting Up Your Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/star-logger.git
   cd star-logger
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Build the project:
   ```bash
   pnpm build
   ```

5. Run the test suite:
   ```bash
   pnpm test:unit
   pnpm test:integration
   ```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

### Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards (see below)

3. Write or update tests for your changes

4. Ensure all tests pass:
   ```bash
   pnpm test:unit
   pnpm test:integration
   ```

5. Build the project to check for TypeScript errors:
   ```bash
   pnpm build
   ```

6. Commit your changes with a descriptive commit message:
   ```bash
   git commit -m "feat: add new feature description"
   ```

### Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions or modifications
- `chore:` - Build process or tooling changes

Example:
```
feat: add Prometheus push gateway support

- Implement push gateway exporter
- Add configuration options
- Update documentation
```

### Pull Request Process

1. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Open a Pull Request against the `main` branch

3. Fill out the PR template with:
   - Description of changes
   - Related issue numbers
   - Testing performed
   - Breaking changes (if any)

4. Wait for CI checks to pass

5. Address review feedback if requested

6. Once approved, a maintainer will merge your PR

## Coding Standards

### TypeScript

- Use strict TypeScript settings
- Provide proper type definitions
- Avoid `any` types unless absolutely necessary
- Use explicit return types for public APIs

### Code Style

- Follow the existing code style
- Use meaningful variable and function names
- Keep functions small and focused
- Add comments for complex logic
- Export types and interfaces for public APIs

### Testing

- **Unit tests**: Test individual functions and modules with mocks
- **Integration tests**: Test full pipelines with real behavior
- **E2E tests**: Only for testing against production infrastructure (requires special setup)

Write tests for:
- New features
- Bug fixes
- Edge cases
- Error handling

Test file locations:
- `tests/unit/` - Unit tests
- `tests/integration/` - Integration tests
- `tests/e2e/` - E2E tests (infrastructure required)

## Project Structure

```
src/
├── utils/
│   ├── otel/          # OpenTelemetry implementation
│   │   ├── index.ts   # Main factory
│   │   ├── types.ts   # TypeScript interfaces
│   │   ├── exporters/ # Trace and metric exporters
│   │   └── utils/     # Helper utilities
│   └── logger/        # Pino logging implementation
│       ├── index.ts   # Main logger factory
│       ├── types.ts   # TypeScript interfaces
│       ├── transports/ # Console, file, OTEL transports
│       └── plugins/   # Trace context, Morgan adapter
```

## Adding New Features

### Adding a New Exporter

1. Create exporter builder in `src/utils/otel/exporters/{tracing|metrics}/`
2. Add to factory in `src/utils/otel/index.ts`
3. Update types in `src/utils/otel/types.ts`
4. Add unit tests in `tests/unit/otel/exporters/`
5. Update documentation

### Adding a New Logger Transport

1. Create transport in `src/utils/logger/transports/`
2. Export from `src/utils/logger/index.ts`
3. Update types in `src/utils/logger/types.ts`
4. Add unit tests (mocked streams)
5. Add integration tests (real streams)
6. Update documentation

## Documentation

- Update relevant documentation in `src/utils/{otel|logger}/README.md`
- Add JSDoc comments to public APIs
- Update CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/)
- Update examples if adding new features

## Questions or Need Help?

- Open an issue with the `question` label
- Check existing issues and discussions
- Review documentation in the `src/utils/` directories

## License

By contributing to Star Logger, you agree that your contributions will be licensed under the MIT License.
