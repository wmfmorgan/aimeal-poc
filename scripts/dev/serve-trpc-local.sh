#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/../.."

exec supabase functions serve trpc --env-file supabase/functions/.env --no-verify-jwt
