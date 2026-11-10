#!/bin/zsh
set -euo pipefail

# The API key never enters Git, a dotenv file, shell history, or process output.
export DAYTONA_API_KEY="$(security find-generic-password -s daytona-api-key -w)"
exec /Users/slgarza/.openclaw/venvs/daytona/bin/python "$(dirname "$0")/daytona_runner.py" "$@"
