# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Wonder Logger seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Where to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **[security@jenova-marie.com]** (replace with your actual security contact email)

You should receive a response within 48 hours. If for some reason you do not, please follow up to ensure we received your original message.

### What to Include

Please include the following information in your report:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability, including how an attacker might exploit it

### Response Process

1. **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
2. **Investigation**: We will investigate and validate the vulnerability
3. **Fix Development**: If confirmed, we will develop a fix
4. **Disclosure**: We will coordinate the disclosure timeline with you
5. **Release**: We will release a security patch and public advisory

### Disclosure Policy

- We aim to fully disclose vulnerabilities once a patch is available
- We will credit researchers who responsibly disclose vulnerabilities (unless you prefer to remain anonymous)
- We request that you do not publicly disclose the vulnerability until we have released a fix

## Security Best Practices

When using Wonder Logger in production:

### 1. Keep Dependencies Updated

Regularly update Wonder Logger and its dependencies:

```bash
pnpm update @wonder-logger/core
```

### 2. Secure Configuration

- **API Keys**: Never hardcode API keys or sensitive credentials
- **Environment Variables**: Use environment variables for sensitive configuration
- **TLS/SSL**: Always use HTTPS/TLS for OTLP endpoints in production
- **Access Control**: Restrict access to observability backends

### 3. Log Content Security

- **PII Data**: Never log personally identifiable information (PII)
- **Credentials**: Never log passwords, tokens, or API keys
- **Sanitization**: Sanitize user input before logging
- **Redaction**: Use log redaction for sensitive fields

Example of safe logging:

```typescript
// Bad - logs sensitive data
logger.info({ password: user.password, apiKey: config.apiKey })

// Good - excludes sensitive data
logger.info({ userId: user.id, action: 'login' })
```

### 4. OpenTelemetry Security

- **Attribute Content**: Be careful what you include in span/metric attributes
- **Resource Attributes**: Avoid including sensitive information in resource attributes
- **Sampling**: Use appropriate sampling rates to avoid excessive data collection

### 5. Transport Security

When using file or OTLP transports:

- **File Permissions**: Set appropriate file permissions for log files
- **Network Security**: Use TLS for remote OTLP endpoints
- **Authentication**: Configure authentication for observability backends

## Known Security Considerations

### 1. File Transport

The file transport writes logs to disk. Ensure:
- Appropriate file permissions are set
- Disk space is monitored to prevent DoS via disk exhaustion
- Log rotation is configured

### 2. OTLP Transport

When sending telemetry to remote endpoints:
- Use TLS/SSL in production
- Validate server certificates (`NODE_TLS_REJECT_UNAUTHORIZED=1`)
- Use authentication headers when available

### 3. Auto-Instrumentation

Auto-instrumentation may capture request/response data:
- Review captured HTTP attributes
- Configure custom hooks to filter sensitive data
- Use `ignoreIncomingPaths` and `ignoreOutgoingUrls` options

## Vulnerability Disclosure History

No vulnerabilities have been disclosed yet.

## Security Updates

Security updates will be released as patch versions and documented in [CHANGELOG.md](CHANGELOG.md) with a `Security` section.

Subscribe to releases on GitHub to be notified of security updates.

## Additional Resources

- [OpenTelemetry Security Best Practices](https://opentelemetry.io/docs/concepts/security/)
- [Pino Security Considerations](https://github.com/pinojs/pino/blob/master/docs/security.md)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Contact

For security-related questions or concerns, contact: **[security@jenova-marie.com]**

For general questions, see [CONTRIBUTING.md](CONTRIBUTING.md).
