#!/bin/bash
set -e
set -x

if ! command -v gtimeout &> /dev/null; then
  echo "gtimeout could not be found. Please install coreutils: brew install coreutils"
  exit 1
fi

export TEST_MODE=1

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

function run_test() {
  echo -e "\n${GREEN}===== $1 =====${NC}"
  echo "CMD: $2"
  eval "$2"
}

PYTHON_SERVICES_PATH="$(pwd)/backend/python-services"

# Go linter
run_test "Go Linter (golangci-lint)" "cd backend/go-backend && golangci-lint run ./... && cd - > /dev/null"

# Python linter (ruff) and type checker (mypy) per service, matching CI
for service in log_analyzer action_recommender knowledge_base root_cause_predictor; do
  if [ "$service" = "log_analyzer" ]; then
    (cd backend/python-services/log_analyzer && source venv/bin/activate && python -m spacy download en_core_web_sm)
  fi
  run_test "Python Linter (ruff) for $service" "(cd backend/python-services/$service && ruff check .)"
  run_test "Python Type Checker (mypy) for $service" "(cd backend/python-services/$service && mypy --explicit-package-bases app tests)"
  # Optionally, activate venv for mypy/ruff if you want full isolation
  # run_test "Python Linter (ruff) for $service" "(cd backend/python-services/$service && source venv/bin/activate && ruff check .)"
  # run_test "Python Type Checker (mypy) for $service" "(cd backend/python-services/$service && source venv/bin/activate && mypy --explicit-package-bases app tests)"
done

# Python microservices
run_test "Python Log Analyzer Tests" "(cd backend/python-services/log_analyzer && source venv/bin/activate && PYTHONPATH=\"$PYTHON_SERVICES_PATH\" pytest)"
run_test "Python Root Cause Predictor Tests" "(cd backend/python-services/root_cause_predictor && source venv/bin/activate && PYTHONPATH=\"$PYTHON_SERVICES_PATH\" pytest)"
run_test "Python Action Recommender Tests" "(cd backend/python-services/action_recommender && source venv/bin/activate && PYTHONPATH=\"$PYTHON_SERVICES_PATH\" pytest)"
run_test "Python Knowledge Base/Vector Search Tests" "(cd backend/python-services/knowledge_base && source venv/bin/activate && PYTHONPATH=\"$PYTHON_SERVICES_PATH\" pytest)"
run_test "Python Incident Integrator Tests" "(cd backend/python-services/incident_integrator && source venv/bin/activate && PYTHONPATH=\"$PYTHON_SERVICES_PATH\" pytest)"

# Go backend (unit, integration, E2E)
run_test "Go Backend Tests (unit, integration, E2E)" "cd backend/go-backend && gtimeout 5m go test -v ./... && cd - > /dev/null"

# Frontend unit/integration tests
run_test "Frontend Unit/Integration Tests" "cd frontend && npm install && npm test -- --watchAll=false && cd - > /dev/null"

# Frontend Cypress E2E tests (assumes frontend and backend are running)
run_test "Frontend Cypress E2E Tests" "cd frontend && npx cypress install && npx cypress run && cd - > /dev/null"

# End-to-end Python test (legacy)
echo -e "\n${GREEN}===== Python E2E Test (test_e2e.py) =====${NC}"
python3 test_e2e.py

echo -e "\n${GREEN}ALL TESTS PASSED!${NC}" 