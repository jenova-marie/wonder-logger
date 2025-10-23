# 📚 Complete Documentation Guide

Welcome to **Wonder Logger**! This document serves as your comprehensive guide to all documentation available in this package.

## 📖 Quick Start

- **[README.md](./README.md)** - Start here! Installation, quick examples, and feature overview
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history, breaking changes, and migration guides

## 🎯 Core Concepts & Guides

### Essential Reading

1. **[content/CONFIGURATION.md](./content/CONFIGURATION.md)** - YAML configuration system
   - Environment variable interpolation
   - Config-driven factory functions
   - Schema validation with Zod
   - Multi-environment setup

2. **[content/ERROR_HANDLING.md](./content/ERROR_HANDLING.md)** - Type-safe error handling
   - Result types with ts-rust-result
   - ConfigResult and JSONResult patterns
   - Error pattern matching
   - Observability integration

3. **[content/LOGGING.md](./content/LOGGING.md)** - Structured logging with Pino
   - Logger creation and configuration
   - Transports (console, file, OTEL, memory)
   - Plugins (trace context, Morgan HTTP)
   - RxJS streaming and real-time monitoring

4. **[content/TRACING.md](./content/TRACING.md)** - Distributed tracing with OpenTelemetry
   - Trace exporters (OTLP, Jaeger, console)
   - Auto-instrumentation setup
   - Manual instrumentation with `withSpan`
   - Trace-log correlation

5. **[content/METRICS.md](./content/METRICS.md)** - Metrics collection and export
   - Prometheus exporter (pull/scrape)
   - OTLP exporter (push/remote write)
   - Custom metrics creation
   - Integration with Grafana

6. **[content/PATTERNS.md](./content/PATTERNS.md)** - Common usage patterns
   - Factory patterns
   - Config-driven initialization
   - Error handling patterns
   - Testing strategies

7. **[content/TESTING.md](./content/TESTING.md)** - Testing your observability setup
   - Unit testing loggers and telemetry
   - Integration testing
   - E2E testing with real backends
   - Mock strategies

## 📂 Module-Specific Documentation

### Configuration System
- **[src/utils/config/README.md](./src/utils/config/README.md)** - Detailed config system documentation

### Logger
- **[src/utils/logger/README.md](./src/utils/logger/README.md)** - Complete Pino logger documentation

### OpenTelemetry
- **[src/utils/otel/README.md](./src/utils/otel/README.md)** - Telemetry instrumentation guide

## 🧪 Testing Documentation

- **[tests/integration/README.md](./tests/integration/README.md)** - Integration test guide
- **[tests/e2e/README.md](./tests/e2e/README.md)** - E2E test guide with production stack
- **[tests/e2e/DEBUG.md](./tests/e2e/DEBUG.md)** - Infrastructure debugging guide

## 🔍 API Reference

### TypeDoc HTML Documentation

The **[docs/](./docs/)** directory contains complete TypeDoc-generated API documentation:

- **[docs/index.html](./docs/index.html)** - Full API reference (open in browser)
  - All functions with detailed signatures
  - Type definitions and generics
  - Usage examples for every function
  - Source code links

### Browsing API Docs

To view the HTML documentation locally:

```bash
# From your project using this package
cd node_modules/@jenova-marie/wonder-logger
open docs/index.html  # macOS
xdg-open docs/index.html  # Linux
start docs/index.html  # Windows
```

Or use a local server:

```bash
cd node_modules/@jenova-marie/wonder-logger/docs
npx http-server -p 8080
# Open http://localhost:8080 in your browser
```

## 📂 Documentation Structure

```
@jenova-marie/wonder-logger/
├── README.md                       # Quick start & overview
├── CHANGELOG.md                    # Version history & migration
├── DOCUMENTATION.md                # This file (documentation index)
│
├── content/                        # Deep-dive guides
│   ├── CONFIGURATION.md            # YAML configuration system
│   ├── ERROR_HANDLING.md           # Result types & error handling
│   ├── LOGGING.md                  # Structured logging guide
│   ├── TRACING.md                  # OpenTelemetry tracing
│   ├── METRICS.md                  # Metrics collection
│   ├── PATTERNS.md                 # Common usage patterns
│   ├── TESTING.md                  # Testing guide
│   └── SECURITY.md                 # Security best practices
│
├── src/utils/config/README.md      # Config system details
├── src/utils/logger/README.md      # Logger details
├── src/utils/otel/README.md        # OTEL details
│
├── tests/integration/README.md     # Integration testing
├── tests/e2e/README.md             # E2E testing
├── tests/e2e/DEBUG.md              # Infrastructure debugging
│
└── docs/                           # TypeDoc API reference (HTML)
    ├── index.html                  # Main API documentation
    ├── modules.html                # Module exports
    ├── functions/                  # Function documentation
    └── types/                      # Type documentation
```

## 🎓 Learning Path

### Beginner

1. Read [README.md](./README.md) for installation and basic usage
2. Review [content/CONFIGURATION.md](./content/CONFIGURATION.md) for YAML config setup
3. Explore [content/LOGGING.md](./content/LOGGING.md) for structured logging basics
4. Check [docs/index.html](./docs/index.html) for API reference

### Intermediate

5. Study [content/ERROR_HANDLING.md](./content/ERROR_HANDLING.md) for type-safe error handling
6. Learn [content/TRACING.md](./content/TRACING.md) for distributed tracing
7. Implement patterns from [content/PATTERNS.md](./content/PATTERNS.md)

### Advanced

8. Deep dive into module-specific READMEs (config, logger, otel)
9. Set up metrics with [content/METRICS.md](./content/METRICS.md)
10. Review [content/TESTING.md](./content/TESTING.md) for testing strategies
11. Debug production issues with [tests/e2e/DEBUG.md](./tests/e2e/DEBUG.md)

## 🆘 Getting Help

- **Issues**: [GitHub Issues](https://github.com/jenova-marie/wonder-logger/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jenova-marie/wonder-logger/discussions)
- **API Reference**: [docs/index.html](./docs/index.html)

## 📝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## 📜 License

MIT - See [LICENSE](./LICENSE) for details.

---

**Version**: 2.0.0
**Last Updated**: October 2025
**Maintained by**: jenova-marie
