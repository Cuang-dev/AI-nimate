#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "==> [1/3] Building AI-nimate Portal & Manifests..."
node "${PROJECT_ROOT}/motion-canvas/scripts/build_portal.mjs"

echo "==> [2/3] Syncing projects to docker-host:/home/agent/orca/AI-nimate/projects/..."
ssh docker-host "mkdir -p /home/agent/orca/AI-nimate/projects /home/agent/orca/AI-nimate/public/projects/ainimate"
rsync -az --delete "${PROJECT_ROOT}/projects/" "docker-host:/home/agent/orca/AI-nimate/projects/"

echo "==> [3/3] Syncing projects to docker-host:/home/agent/orca/AI-nimate/public/projects/ainimate/..."
rsync -az --delete "${PROJECT_ROOT}/projects/" "docker-host:/home/agent/orca/AI-nimate/public/projects/ainimate/"

# Ensure readable permissions for container nginx worker process
ssh docker-host "chmod -R u=rwX,go=rX /home/agent/orca/AI-nimate/public/projects/ainimate"

echo "==> AI-nimate deployment completed successfully!"
