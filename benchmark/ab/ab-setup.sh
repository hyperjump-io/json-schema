#!/bin/sh
# ab-setup.sh <rev for A>: A is that commit's src/, B is the working tree's.
# The copies live in AB_DIR (required), next to a symlink to
# the repo's node_modules, so they import the same packages.
set -e
repo="$(cd "$(dirname "$0")/../.." && pwd)"
dir="${AB_DIR:?Set AB_DIR to a directory for the copies}"
mkdir -p "$dir"
ln -sfn "$repo/node_modules" "$dir/node_modules"
rm -rf "$dir/a" "$dir/b" && mkdir -p "$dir/a" "$dir/b"
# package.json too, for its "imports"
git -C "$repo" archive "${1:-HEAD}" src package.json | tar -x -C "$dir/a"
cp -r "$repo/src" "$repo/package.json" "$dir/b/"
