#!/bin/bash
set -e

# Install exactly what package-lock.json specifies (reproducible, hash-verified,
# and fails loudly if package.json and the lock disagree). This is the build
# equivalent of `mvn -o clean install` against a fully pinned repo.
echo "Installing dependencies from lockfile (npm ci)..."
npm ci

# Ensure public_html exists and is empty
rm -rf public_html/
mkdir public_html

npm run build:prod