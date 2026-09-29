#!/usr/bin/env sh
# Kept for deploy workflows copied before build.py: the pipeline is build.py.
exec python3 "$(dirname "$0")/build.py" "$@"
