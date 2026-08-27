#!/usr/bin/env bash
# 레벨을 한 판씩 따로 굽는다.
#
# 한 프로세스에서 수십 판을 이어 구우면 node가 세그폴트로 죽는다(원인 미상,
# 다른 작업이 같이 돌 때 특히 잘 난다). 판마다 프로세스를 새로 띄우면
# 그 문제가 없고, 중간에 죽어도 이미 구운 판은 JSON에 남아 이어서 할 수 있다.
#
#   scripts/bake-jewel-levels.sh 1 60
set -u
FROM=${1:-1}
TO=${2:-60}
for ((n=FROM; n<=TO; n++)); do
  npx tsx scripts/generate-jewel-levels.ts "$n" "$n" 2>&1 | grep -E "^ +[0-9]+ |실패" || echo "   $n  프로세스 중단"
done
