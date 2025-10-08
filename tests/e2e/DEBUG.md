# E2E Observability Stack Debugging

## Remote Endpoints (metis.prod.rso)

### Tempo - Distributed Tracing
- **Query API**: `https://tempo.rso:3200`
- **OTLP gRPC**: `https://tempo.rso:3217`
- **OTLP HTTP**: `https://tempo.rso:3218`
- **Query trace by ID**: `GET https://tempo.rso:3200/api/traces/{traceId}`
- **Search traces**: `GET https://tempo.rso:3200/api/search?q={traceQL}&start={unixSec}&end={unixSec}`

### Loki - Log Aggregation
- **Query API**: `https://loki.rso:3100`
- **Query logs**: `GET https://loki.rso:3100/loki/api/v1/query_range?query={logQL}&start={nanos}&end={nanos}`
- **Labels**: `GET https://loki.rso:3100/loki/api/v1/labels`
- **Ingestion delay**: 10 seconds (batching window)

### Prometheus - Metrics
- **Query API**: `https://prometheus.rso:9090`
- **Query**: `GET https://prometheus.rso:9090/api/v1/query?query={promQL}`
- **Query range**: `GET https://prometheus.rso:9090/api/v1/query_range?query={promQL}&start={unixSec}&end={unixSec}&step=15s`

## Local OTEL Collector

- **Health check**: `http://localhost:13133/healthz`
- **Metrics endpoint**: `http://localhost:8888/metrics`
- **Trace debug**: `http://localhost:55679/debug/tracez`
- **Pipeline debug**: `http://localhost:55679/debug/pipelinez`
- **Write delay**: 100ms flush (local tests)

### Local OTEL Collector Logs
```bash
docker logs recoverysky-otel-collector
```

### Key Metrics
```bash
# Check export success/failure
curl -s http://localhost:8888/metrics | grep "sent_log_records_total"
curl -s http://localhost:8888/metrics | grep "sent_spans_total"
curl -s http://localhost:8888/metrics | grep "failed"
```

## Network Architecture

### Private DNS via VPN
- **VPN DNS Server**: `10.10.10.10` (connected to AWS VPC)
- **Private Route53 Domain**: `*.rso` (AWS private hosted zone)
- **Remote Host**: `metis.prod.rso` (observability stack)

All `*.rso` domains resolve via private Route53 through the VPN connection. Local development machine connects through VPN to access the remote observability stack.

### Remote Caddy Reverse Proxy (recoverysky-caddy)

The `recoverysky-caddy` container runs on **metis.prod.rso** and provides reverse proxy/load balancing for the observability stack services.

### Remote Caddy Debugging
```bash
# View Caddy container status on remote host
ssh metis.prod.rso "docker ps | grep recoverysky-caddy"

# View Caddy logs (shows proxied requests)
ssh metis.prod.rso "docker logs recoverysky-caddy --tail 100"

# Follow live proxy traffic
ssh metis.prod.rso "docker logs recoverysky-caddy -f"
```

### Debugging Proxy Requests

**Check if proxy is routing requests:**
```bash
# Check recent proxy activity on remote Caddy
ssh metis.prod.rso "docker logs recoverysky-caddy --since 2m | grep -E '(prometheus|tempo|loki)'"

# Watch Caddy logs in real-time while making requests
ssh metis.prod.rso "docker logs recoverysky-caddy -f" &
curl -sk https://prometheus.rso:9090/api/v1/query?query=up
```

**Verify VPN DNS resolution:**
```bash
# Verify private Route53 DNS is working through VPN
dig prometheus.rso +short
dig tempo.rso +short
dig loki.rso +short

# All should resolve to metis.prod.rso IP
```

**Test connectivity to observability endpoints:**
```bash
# Prometheus
curl -sk https://prometheus.rso:9090/-/healthy

# Tempo
curl -sk https://tempo.rso:3200/ready

# Loki
curl -sk https://loki.rso:3100/ready
```

### Network Paths

The observability stack uses two different network paths:

1. **Local → Remote (VPN + HTTPS via Caddy)**
   - Local OTEL collector (Mac) → VPN → `https://prometheus.rso:9090/api/v1/write`
   - Used by local development and E2E tests
   - Goes through VPN tunnel and Caddy reverse proxy

2. **Remote Internal (Docker network)**
   - Tempo container → `http://recoverysky-prometheus:9090/api/v1/write`
   - Direct container-to-container communication on metis.prod.rso
   - No Caddy proxy involved

**Debugging remote write failures:**
```bash
# Check if local OTEL can reach Prometheus
curl -sk -X POST https://prometheus.rso:9090/api/v1/write \
  -H "Content-Type: application/x-protobuf" \
  --data-binary @/dev/null

# Should return HTTP 204 (empty write) or 400 (invalid protobuf)
# HTTP 405 = remote write not enabled
# Connection error = network/VPN issue

# Compare: Check remote Tempo's successful remote writes
curl -sk "https://prometheus.rso:9090/api/v1/query?query=prometheus_remote_storage_samples_total"
# Should show Tempo as a remote write source

# Check if Caddy is receiving/routing the requests
ssh metis.prod.rso "docker logs recoverysky-caddy --since 1m | grep 'api/v1/write'"

# Check local OTEL network
docker inspect recoverysky-otel | jq '.[0].NetworkSettings.Networks | keys'
# Should show "otel-collector_default" (local bridge network)
```

## Remote Container Debugging

### View Logs
```bash
ssh metis.prod.rso "docker logs recoverysky-loki --tail 100"
ssh metis.prod.rso "docker logs recoverysky-tempo --tail 100"
ssh metis.prod.rso "docker logs recoverysky-prometheus --tail 100"
```

### View Configs (READ-ONLY)
```bash
ssh metis.prod.rso "cat /opt/containers/recoverysky-loki/etc/config.yaml"
ssh metis.prod.rso "cat /opt/containers/recoverysky-tempo/etc/config.yaml"
ssh metis.prod.rso "cat /opt/containers/recoverysky-prometheus/etc/prometheus.yml"
```

### Container Status
```bash
ssh metis.prod.rso "docker ps | grep recoverysky"
```

## E2E Test Timing

- **SDK → Local OTEL**: 100ms flush (local write delay)
- **OTEL → Loki**: 10s batch window (Loki ingestion delay)
- **OTEL → Tempo**: Tail sampling decision latency (~5-10s)
- **OTEL → Prometheus**: 15s scrape interval
- **Recommended wait**:
  - Loki: 12s (batching)
  - Tempo: 20s (tail sampling + ingestion)
  - Prometheus: 15s (scrape interval)

## Common Issues

### Traces not appearing in Tempo
1. Check OTEL export: `curl -s http://localhost:8888/metrics | grep tempo`
2. Check tail sampling: `curl -s http://localhost:8888/metrics | grep tail_sampling`
   - Test traces need `test.type="tempo-integration"` attribute
   - Allow 20s for sampling decision + ingestion
3. Check Tempo logs: `ssh metis.prod.rso "docker logs recoverysky-tempo --tail 50"`
4. Verify trace exists: `curl -k https://tempo.rso:3200/api/traces/{traceId}`
5. Note: Tempo returns base64-encoded trace/span IDs, not hex

### Logs not appearing in Loki
1. Check OTEL export: `curl -s http://localhost:8888/metrics | grep loki`
2. Check indexed labels: `curl -k https://loki.rso:3100/loki/api/v1/labels`
3. Use text filters `|=` not label selectors for non-indexed fields
4. Verify 12s wait time for batching

### Metrics not appearing in Prometheus
1. Check OTEL export: `curl -s http://localhost:8888/metrics | grep prometheus`
2. Query Prometheus: `curl -k 'https://prometheus.rso:9090/api/v1/query?query={metric}'`
3. Check scrape targets: `curl -k https://prometheus.rso:9090/api/v1/targets`

## TLS Configuration

All remote endpoints use self-signed certificates. Set:
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
```
Or use `curl -k` for insecure requests.
