#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

function run_test() {
  echo -e "\n${GREEN}===== $1 =====${NC}"
  eval "$2"
}

run_test "Python Log Analyzer Tests" "cd python-services/log_analyzer && pytest && cd - > /dev/null"
run_test "Python Root Cause Predictor Tests" "cd python-services/root_cause_predictor && pytest && cd - > /dev/null"
run_test "Python Action Recommender Tests" "cd python-services/action_recommender && pytest && cd - > /dev/null"
run_test "Python Knowledge Base/Vector Search Tests" "cd python-services/knowledge_base && pytest && cd - > /dev/null"
run_test "Go Backend Tests" "cd go-backend && go test -v && cd - > /dev/null"

# End-to-end tests (assumes services are running)
echo -e "\n${GREEN}===== End-to-End Tests =====${NC}"
python3 test_e2e.py

echo -e "\n${GREEN}ALL TESTS PASSED!${NC}" 