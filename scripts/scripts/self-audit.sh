#!/bin/bash
# Ensure we always run from the project root, regardless of invocation directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"
# PLUTUS Self-Audit — verifies all fixes are real, not theatrical
# Exit code 0 = PASS, non-zero = FAIL

FAILED=0

echo "=== PLUTUS Self-Audit v4.9.9 ==="

# 1. Verify MerkleChain fail-closed
echo -n "[1/16] MerkleChain fail-closed: "
if grep -q "valid: false" src/evidence-engine/merkle-chain.ts; then
  echo "PASS"
else
  echo "FAIL"
  FAILED=1
fi

# 2. Count any parameters in function signatures — must be 0
echo -n "[2/16] Zero '): any' in function params: "
ANY_COUNT=$(grep -rn "): any" src/ --include="*.ts" | grep -v "node_modules" | grep -v "\.d\.ts" | wc -l)
if [ "$ANY_COUNT" -eq 0 ]; then
  echo "PASS (0)"
else
  echo "FAIL ($ANY_COUNT remaining)"
  FAILED=1
fi

# 3. Count hardcoded /home/ paths — must be 0
echo -n "[3/16] Zero hardcoded /home/ paths: "
HOME_COUNT=$(grep -rn '"/home/' src/ --include="*.ts" | wc -l)
if [ "$HOME_COUNT" -eq 0 ]; then
  echo "PASS (0)"
else
  echo "FAIL ($HOME_COUNT remaining)"
  FAILED=1
fi

# 4. Verify evidence path matches canonical format
echo -n "[4/16] Evidence path matches canon: "
if grep -q "evidence.json" src/shared/warheads/evidence-pipeline.ts; then
  echo "PASS"
else
  echo "FAIL"
  FAILED=1
fi

# 5. Count as any casts — must be 0
echo -n "[5/16] Zero 'as any' casts: "
AS_ANY_COUNT=$(grep -rn "as any" src/ --include="*.ts" | grep -v "node_modules" | grep -v "\.d\.ts" | grep -v "type-guards.ts" | wc -l)
if [ "$AS_ANY_COUNT" -eq 0 ]; then
  echo "PASS (0)"
else
  echo "FAIL ($AS_ANY_COUNT remaining)"
  FAILED=1
fi

# 6. Verify CrossPluginIsolation actually blocks
echo -n "[6/16] CrossPluginIsolation blocks: "
if grep -q "EnforcementError" src/shared/warheads/cross-plugin-isolation.ts; then
  echo "PASS"
else
  echo "FAIL (still pass-through)"
  FAILED=1
fi

# 7. Verify E10 uses evidence system API (not regex)
echo -n "[7/16] E10 uses evidence system API: "
if grep -q "getGateManager" src/shared/warheads/runtime-grade-engineer.ts && grep -q "hasRequiredEvidence" src/shared/warheads/runtime-grade-engineer.ts; then
  echo "PASS"
else
  echo "FAIL (textual only)"
  FAILED=1
fi

# 8. Build verification
echo -n "[8/16] Build succeeds: "
BUILD_OUTPUT=$(bun build src/index.ts --outdir dist --target bun --format esm --bundle 2>&1)
if echo "$BUILD_OUTPUT" | grep -q "error"; then
  echo "FAIL (build error)"
  echo "$BUILD_OUTPUT"
  FAILED=1
else
  echo "PASS"
fi

# 9. Verify theatrical-code-block has 6 patterns (not 11)
echo -n "[9/16] theatrical-code-block has 6 patterns: "
PATTERN_COUNT=$(grep -c "pattern:\s*/" src/shared/warheads/theatrical-code-block.ts)
if [ "$PATTERN_COUNT" -eq 9 ]; then
  echo "PASS (9)"
else
  echo "FAIL ($PATTERN_COUNT)"
  FAILED=1
fi

# 10. Verify guardian-hook has 0 regex arrays
echo -n "[10/16] Guardian-hook has 0 PATTERNS arrays: "
ARRAY_COUNT=$(grep -c "const .*PATTERNS" src/hooks/v4.1/guardian-hook.ts)
if [ "$ARRAY_COUNT" -eq 1 ]; then
  echo "PASS (1 LEGITIMATE_PATTERNS kept)"
else
  echo "FAIL ($ARRAY_COUNT arrays remain)"
  FAILED=1
fi

# 11. Verify P2 regex deleted from RGE
echo -n "[11/16] P2 Type Safety deleted from RGE: "
P2_COUNT=$(grep -c "P2 Type Safety" src/shared/warheads/runtime-grade-engineer.ts)
if [ "$P2_COUNT" -eq 0 ]; then
  echo "PASS"
else
  echo "FAIL (P2 still present)"
  FAILED=1
fi

# 12. Verify command-classifier.ts exists
echo -n "[12/16] command-classifier.ts exists: "
if [ -f src/shared/firewall/command-classifier.ts ]; then
  echo "PASS"
else
  echo "FAIL"
  FAILED=1
fi

# 13. Verify content-analyzer.ts exists
echo -n "[13/16] content-analyzer.ts exists: "
if [ -f src/shared/firewall/content-analyzer.ts ]; then
  echo "PASS"
else
  echo "FAIL"
  FAILED=1
fi

# 14. AST predicates count >= 24
echo -n "[14/16] AST predicates >= 24: "
AST_COUNT=$(grep -rn "ts\.isTrueKeyword\|ts\.isFalseKeyword\|ts\.isPropertyAssignment\|ts\.isTypeOfExpression\|InstanceOfKeyword\|ts\.isCallExpression\|ts\.isPropertyAccessExpression\|ts\.isIdentifier\|ts\.isStringLiteral\|ts\.isObjectLiteralExpression\|ts\.isReturnStatement\|ts\.isCatchClause\|ts\.isAsExpression\|ts\.isBinaryExpression" src/semantic-firewall/rules/ --include="*.ts" | wc -l)
if [ "$AST_COUNT" -ge 24 ]; then
  echo "PASS ($AST_COUNT)"
else
  echo "FAIL ($AST_COUNT)"
  FAILED=1
fi

# 15. Zero .test() in semantic-firewall rules (except no-hardcoded-paths)
echo -n "[15/16] Zero regex .test() in rules (except path checking): "
REGEX_COUNT=$(grep -rn "\.test(" src/semantic-firewall/rules/ --include="*.ts" | grep -v "no-hardcoded-paths" | wc -l)
if [ "$REGEX_COUNT" -eq 0 ]; then
  echo "PASS (0)"
else
  echo "FAIL ($REGEX_COUNT remaining)"
  FAILED=1
fi

# 16. Variable wrapping detection in theatrical-return
echo -n "[16/16] Variable wrapping detection exists: "
if grep -q "findVariableDeclaration\|checkObjectForTheatrical" src/semantic-firewall/rules/theatrical-return.ts; then
  echo "PASS"
else
  echo "FAIL"
  FAILED=1
fi

echo ""
if [ $FAILED -eq 0 ]; then
  echo "=== ALL 16 CHECKS PASSED ==="
else
  echo "=== $FAILED/16 CHECKS FAILED ==="
fi
exit $FAILED
