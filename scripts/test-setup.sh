#!/bin/bash
# Test environment setup script
#
# This script starts a Docker Jira instance and waits for it to be ready
#
# Usage:
#   ./scripts/test-setup.sh start   # Start Jira and wait for ready
#   ./scripts/test-setup.sh stop    # Stop and clean up
#   ./scripts/test-setup.sh status  # Check if Jira is ready

set -e

COMPOSE_FILE="docker-compose.test.yml"
JIRA_URL="http://localhost:8080"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

wait_for_jira() {
    local max_attempts=60
    local attempt=1

    log_info "Waiting for Jira to be ready at ${JIRA_URL}..."

    while [ $attempt -le $max_attempts ]; do
        if curl -s "${JIRA_URL}/status" | grep -q "RUNNING"; then
            log_info "Jira is ready!"
            return 0
        fi

        echo -n "."
        sleep 10
        attempt=$((attempt + 1))
    done

    log_error "Jira did not become ready in time"
    return 1
}

start() {
    log_info "Starting Jira test environment..."

    # Start containers
    docker-compose -f "$COMPOSE_FILE" up -d jira postgres

    # Wait for Jira to be ready
    wait_for_jira

    # Run setup container to create test data
    log_info "Setting up test data..."
    docker-compose -f "$COMPOSE_FILE" up setup

    log_info "Test environment is ready!"
    log_info "Jira URL: ${JIRA_URL}"
    log_info ""
    log_info "To run tests:"
    log_info "  JIRA_BASE_URL=${JIRA_URL} \\"
    log_info "  JIRA_API_TOKEN=<your-token> \\"
    log_info "  JIRA_USER_EMAIL=admin@example.com \\"
    log_info "  yarn test"
}

stop() {
    log_info "Stopping Jira test environment..."
    docker-compose -f "$COMPOSE_FILE" down -v
    log_info "Test environment stopped and cleaned up"
}

status() {
    if curl -s "${JIRA_URL}/status" 2>/dev/null | grep -q "RUNNING"; then
        log_info "Jira is running at ${JIRA_URL}"
        return 0
    else
        log_warn "Jira is not running"
        return 1
    fi
}

# Main
case "${1:-}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: $0 {start|stop|status}"
        echo ""
        echo "Commands:"
        echo "  start   Start Jira Docker environment and wait for ready"
        echo "  stop    Stop and clean up Docker environment"
        echo "  status  Check if Jira is running"
        exit 1
        ;;
esac
