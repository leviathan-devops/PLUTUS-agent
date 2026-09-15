#!/bin/bash
# Theatrical Code Detector — FAILS build if theatrical patterns found
set -euo pipefail

PATTERNS=(
    "return { success: true }"
    "return { blocked: false }"
    "return { ok: true }"
    "return { passed: true }"
    "return { verified: true }"
    "const mockGuardian"
    "OVERHAUL PENDING"
)

# Files that legitimately use these patterns get excluded:
# - T0 strings describe anti-patterns (theatrical-code-block.ts, runtime-grade-engineer.ts)
# - Test/diagnostic tools create mocks for real integration tests (plutus-diagnose.ts, plutus-test-runner.ts)
# - Layer engine returns { blocked: false } as "no layer blocked" result (layer-engine.ts)
# - Scaffold generator contains code example strings in test fixtures (scaffold-generator.ts)
EXCLUDE="node_modules|\.test\.|\.d\.ts|dist|layer-engine\.ts|theatrical-code-block\.ts|runtime-grade-engineer\.ts|plutus-diagnose\.ts|plutus-test-runner\.ts|scaffold-generator\.ts|theatrical-layer\.ts|identity-layer\.ts|container-layer\.ts"

ERRORS=0

for pattern in "${PATTERNS[@]}"; do
    matches=$(grep -rn "$pattern" src/ --include="*.ts" 2>/dev/null | grep -vE "$EXCLUDE" || true)
    if [ -n "$matches" ]; then
        echo "[THEATRICAL] Found: $pattern"
        echo "$matches"
        ERRORS=1
    fi
done

if [ $ERRORS -eq 1 ]; then
    echo ""
    echo "FAILED: Theatrical code detected. Each pattern above is a return value that"
    echo "always succeeds, making enforcement theatrical. Fix each one by replacing with"
    echo "real logic or a thrown error. Then re-run this script."
    exit 1
fi

echo "PASSED: No theatrical code detected."
exit 0
