#!/usr/bin/env bash
# Non-destructive security check (no login, creates no orders). Usage: bash scripts/security-check.sh https://your-site
# Note: the last test triggers the order rate limit for your own IP for 10 minutes.
B="$1"; H=$(echo "$B" | sed -E 's#https?://##')
pass=0; fail=0
ok(){ printf "  PASS  %s\n" "$1"; pass=$((pass+1)); }
no(){ printf "  FAIL  %s  [%s]\n" "$1" "$2"; fail=$((fail+1)); }
code(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }
IP="203.0.113.$((RANDOM%250+1))"

echo "== Security headers"
HDR=$(curl -sI "$B/")
for h in "content-security-policy" "x-frame-options: DENY" "x-content-type-options: nosniff" "referrer-policy" "permissions-policy" "strict-transport-security" "cross-origin-opener-policy"; do
  echo "$HDR" | grep -qi "^$h" && ok "header $h" || no "header $h" "missing"; done
echo "$HDR" | grep -qi "^x-powered-by" && no "no X-Powered-By" "present" || ok "no X-Powered-By"
CSP=$(echo "$HDR" | grep -i "^content-security-policy" | tr -d '\r')
echo "$CSP" | grep -q "nonce-" && ok "CSP uses per-request nonce" || no "CSP nonce" "$CSP"
echo "$CSP" | grep -q "frame-ancestors 'none'" && ok "CSP blocks framing" || no "CSP frame-ancestors" ""
echo "$CSP" | grep -q "unsafe-inline" | grep -q script && no "CSP script unsafe-inline" "" || ok "CSP scripts not unsafe-inline"
N1=$(curl -sI "$B/" | grep -io "nonce-[^']*" | head -1); N2=$(curl -sI "$B/" | grep -io "nonce-[^']*" | head -1)
[ -n "$N1" ] && [ "$N1" != "$N2" ] && ok "nonce changes per request" || no "nonce per request" "$N1 / $N2"
PAGE=$(curl -s "$B/"); NONCE=$(curl -sI "$B/" >/dev/null; echo)
echo "$PAGE" | grep -o '<script[^>]*>' | grep -vc 'nonce=' | grep -q '^0$' && ok "every <script> tag carries a nonce" || no "scripts without nonce" "$(echo "$PAGE" | grep -o '<script[^>]*>' | grep -v nonce= | head -2)"

echo "== Exposed files"
for p in /.env /.env.local /.env.vercel.local /.git/config /data/db.json /package.json /README.md /assets-src/bear.png /scripts/reset-admin.mjs /next.config.mjs "/api/media/..%2F..%2F.env" "/api/media/..%2Fdb.json" /_next/static/chunks/app/page.js.map; do
  c=$(code "$B$p"); [[ "$c" =~ ^(404|403|400)$ ]] && ok "$p → $c" || no "$p" "$c"; done

echo "== Health check reveals nothing publicly"
HB=$(curl -s "$B/api/health"); [ "$HB" = '{"ok":true}' ] && ok "health = $HB" || no "health detail leak" "$HB"

echo "== Admin locked without login"
for m in "GET /api/admin/settings" "PUT /api/admin/settings" "POST /api/admin/products" "DELETE /api/admin/products/p_teddy" "POST /api/admin/upload" "PUT /api/admin/account"; do
  set -- $m; c=$(code -X $1 -H "Origin: $B" "$B$2"); [ "$c" = 401 ] && ok "$m → 401" || no "$m" "$c"; done
c=$(code "$B/admin/orders"); [ "$c" = 307 ] && ok "/admin/orders → redirect to login" || no "/admin/orders" "$c"

echo "== Forged sessions"
for name in mpopi_admin __Host-mpopi_admin; do
  NONE="eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJ4IiwidmVyIjowfQ."
  c=$(code -H "Cookie: $name=$NONE" -H "Origin: $B" "$B/api/admin/settings" -X PUT); [ "$c" = 401 ] && ok "alg=none token ($name) → 401" || no "alg none $name" "$c"
  FAKE=$(node -e "const c=require('crypto');const b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');const h=b({alg:'HS256',typ:'JWT'}),p=b({sub:'x',ver:0,iss:'mpopi-store',aud:'mpopi-admin',exp:9999999999});console.log(h+'.'+p+'.'+c.createHmac('sha256','secret').update(h+'.'+p).digest('base64url'))")
  c=$(code -H "Cookie: $name=$FAKE" -H "Origin: $B" "$B/api/admin/settings" -X PUT); [ "$c" = 401 ] && ok "token signed with guessed secret ($name) → 401" || no "guessed secret $name" "$c"
done

echo "== CSRF / CORS"
c=$(code -X POST "$B/api/orders" -H "Origin: https://evil.example" -H "Content-Type: application/json" -d '{}'); [ "$c" = 403 ] && ok "cross-site POST /api/orders → 403" || no "csrf orders" "$c"
c=$(code -X POST "$B/api/admin/login" -H "Origin: https://evil.example" -H "Content-Type: application/json" -d '{}'); [ "$c" = 403 ] && ok "cross-site POST /api/admin/login → 403" || no "csrf login" "$c"
c=$(code -X POST "$B/api/orders" -H "Sec-Fetch-Site: cross-site" -H "Content-Type: application/json" -d '{}'); [ "$c" = 403 ] && ok "Sec-Fetch-Site cross-site → 403" || no "sec-fetch-site" "$c"
A=$(curl -s -D - -o /dev/null -X OPTIONS "$B/api/orders" -H "Origin: https://evil.example" -H "Access-Control-Request-Method: POST" | grep -i "access-control-allow-origin"); [ -z "$A" ] && ok "CORS preflight from evil origin gets no Allow-Origin" || no "CORS" "$A"
A=$(curl -s -D - -o /dev/null "$B/api/health" -H "Origin: https://evil.example" | grep -i "access-control-allow-origin"); [ -z "$A" ] && ok "GET from evil origin gets no Allow-Origin" || no "CORS GET" "$A"

echo "== Input validation (orders) — all rejected before anything is saved"
post(){ curl -s -o /dev/null -w '%{http_code}' -X POST "$B/api/orders" -H "Origin: $B" -H "X-Real-IP: $IP" -H "Content-Type: application/json" -d "$1"; }
c=$(post '{"items":[]}'); [ "$c" = 400 ] && ok "empty cart → 400" || no "empty cart" "$c"
c=$(post '{"items":[{"productId":"p_teddy","colorId":"white","size":"M","qty":1}],"customer":{"name":"x'"'"' OR 1=1;--","phone":"abc"},"deliveryId":"paxi"}'); [ "$c" = 400 ] && ok "SQL-ish name + bad phone → 400" || no "bad phone" "$c"
c=$(post '{"items":[{"productId":"p_teddy","colorId":"white","size":"M","qty":-5}],"customer":{"name":"Tester","phone":"0821234567"},"deliveryId":"nope"}'); [[ "$c" =~ ^(400|409)$ ]] && ok "negative qty / bad delivery → $c" || no "neg qty" "$c"
c=$(post '{"items":[{"productId":"p_teddy","colorId":"white","size":"M","qty":1}],"customer":{"name":"Tester","phone":"0821234567","email":"not-an-email"},"deliveryId":"paxi"}'); [ "$c" = 400 ] && ok "invalid email → 400" || no "email" "$c"
node -e "require('fs').writeFileSync(require('os').tmpdir()+'/big.json', JSON.stringify({x:'a'.repeat(60000)}))"; c=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$B/api/orders" -H "Origin: $B" -H "X-Real-IP: $IP" -H "Content-Type: application/json" --data-binary @$(node -p "require('os').tmpdir()")/big.json); [[ "$c" =~ ^(413|429)$ ]] && ok "oversized body → $c" || no "oversized" "$c"

echo "== Rate limiting (orders: 8 per 10 min per IP)"
RIP="198.51.100.$((RANDOM%250+1))"; last=""
for i in $(seq 1 10); do last=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$B/api/orders" -H "Origin: $B" -H "X-Real-IP: $RIP" -H "Content-Type: application/json" -d '{"items":[]}'); done
[ "$last" = 429 ] && ok "10th rapid order request → 429" || no "order rate limit" "$last"

echo; echo "RESULT: $pass passed, $fail failed"
