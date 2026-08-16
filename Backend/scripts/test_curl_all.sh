#!/usr/bin/env bash

# ==============================================================================
# Comprehensive Integration Test Suite for Citizen Call Intelligence Platform
# All requests STRICTLY route through the Centralized API Gateway (Port 8000)
# ==============================================================================

GATEWAY_URL="http://localhost:8000"

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0

assert_status() {
    local label="$1"
    local expected="$2"
    local actual="$3"
    if [ "$expected" -eq "$actual" ]; then
        echo -e "${GREEN}✓ [PASS]${NC} $label (HTTP $actual)"
        pass_count=$((pass_count + 1))
    else
        echo -e "${RED}✗ [FAIL]${NC} $label (Expected $expected, got $actual)"
        fail_count=$((fail_count + 1))
    fi
}

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}  Starting End-to-End Test Suite via API Gateway ($GATEWAY_URL)  ${NC}"
echo -e "${BLUE}================================================================${NC}\n"

# 1. Gateway Health Check
echo -e "${BLUE}--- 1. Gateway Health & Service Discovery ---${NC}"
gw_code=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY_URL/health")
assert_status "Centralized API Gateway Health Check" 200 "$gw_code"


# 2. Centralized Auth Middleware Security Check (Unauthorized Access Blocked)
echo -e "\n${BLUE}--- 2. Centralized Authentication Middleware Validation ---${NC}"
unauth_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$GATEWAY_URL/admin/issues")
assert_status "Gateway blocks unauthenticated protected route (/admin/issues)" 401 "$unauth_code"

unauth_off_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$GATEWAY_URL/officer/queue")
assert_status "Gateway blocks unauthenticated protected route (/officer/queue)" 401 "$unauth_off_code"


# 3. Citizen Portal via Gateway
echo -e "\n${BLUE}--- 3. Testing Citizen Portal via Gateway ($GATEWAY_URL/citizen) ---${NC}"

# Public FAQs (Excluded from auth middleware)
faq_code=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY_URL/citizen/faq")
assert_status "Public FAQs (Unauthenticated Excluded)" 200 "$faq_code"

# Public Announcements (Excluded from auth middleware)
ann_code=$(curl -s -o /dev/null -w "%{http_code}" "$GATEWAY_URL/citizen/announcements")
assert_status "Public Announcements (Unauthenticated Excluded)" 200 "$ann_code"

# Citizen Registration
RAND_ID=$((1000 + RANDOM % 9000))
reg_resp=$(curl -s -w "\n%{http_code}" -X POST "$GATEWAY_URL/citizen/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gateway Citizen",
    "email": "citizen_gw_'$RAND_ID'@example.com",
    "phone": "+177700'$RAND_ID'",
    "password": "CitizenPassword@123"
  }')
reg_status=$(echo "$reg_resp" | tail -n1)
assert_status "Citizen Self-Registration" 201 "$reg_status"

# Citizen Login
login_resp=$(curl -s -X POST "$GATEWAY_URL/citizen/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "citizen.jane@example.com",
    "password": "Citizen@123"
  }')
CITIZEN_TOKEN=$(echo "$login_resp" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null || echo "")

if [ -n "$CITIZEN_TOKEN" ]; then
    echo -e "${GREEN}✓ [PASS]${NC} Citizen Login & Token Issued via Gateway"
    pass_count=$((pass_count + 1))
else
    echo -e "${RED}✗ [FAIL]${NC} Citizen Login failed"
    fail_count=$((fail_count + 1))
fi

# Citizen Profile /me
me_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$GATEWAY_URL/citizen/me" \
  -H "Authorization: Bearer $CITIZEN_TOKEN")
assert_status "Citizen /me Profile & Block Status" 200 "$me_code"

# Chatbot RAG copilot
chat_resp=$(curl -s -w "\n%{http_code}" -X POST "$GATEWAY_URL/citizen/chatbot" \
  -H "Authorization: Bearer $CITIZEN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "There is a massive water leak in the main pipeline on Market Road"}')
chat_status=$(echo "$chat_resp" | tail -n1)
assert_status "Citizen Chatbot RAG Query" 200 "$chat_status"

# File a new Grievance (AI classification & duplicate check)
issue_post_resp=$(curl -s -w "\n%{http_code}" -X POST "$GATEWAY_URL/citizen/issues" \
  -H "Authorization: Bearer $CITIZEN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Urgent: Water pipeline burst near cross road 5, flooding the street.",
    "location_lat": 12.9716,
    "location_lng": 77.5946,
    "ward": "Ward 4"
  }')
issue_post_status=$(echo "$issue_post_resp" | tail -n1)
assert_status "Citizen Grievance Submission" 201 "$issue_post_status"

CREATED_ISSUE_BODY=$(echo "$issue_post_resp" | sed '$d')
CREATED_ISSUE_ID=$(echo "$CREATED_ISSUE_BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('id', '1'))" 2>/dev/null || echo "1")
CREATED_ISSUE_CODE=$(echo "$CREATED_ISSUE_BODY" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('issue_id', ''))" 2>/dev/null || echo "ISS-2026-000101")

echo "   -> Created Issue ID: $CREATED_ISSUE_ID (Tracking Code: $CREATED_ISSUE_CODE)"

# List citizen issues
my_issues_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$GATEWAY_URL/citizen/issues" \
  -H "Authorization: Bearer $CITIZEN_TOKEN")
assert_status "List Citizen Grievances" 200 "$my_issues_code"


# 4. Officer Portal via Gateway
echo -e "\n${BLUE}--- 4. Testing Officer Portal via Gateway ($GATEWAY_URL/officer) ---${NC}"

# Officer Login
off_login=$(curl -s -X POST "$GATEWAY_URL/officer/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "officer.water@city.gov", "password": "Officer@123"}')
OFF_TOKEN=$(echo "$off_login" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null || echo "")

if [ -n "$OFF_TOKEN" ]; then
    echo -e "${GREEN}✓ [PASS]${NC} Officer Login via Gateway"
    pass_count=$((pass_count + 1))
else
    echo -e "${RED}✗ [FAIL]${NC} Officer Login failed"
    fail_count=$((fail_count + 1))
fi

# View Department Queue
off_queue_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$GATEWAY_URL/officer/queue" \
  -H "Authorization: Bearer $OFF_TOKEN")
assert_status "Officer Scoped Department Queue" 200 "$off_queue_code"

# Claim Grievance (Optimistic Locking)
claim_code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$GATEWAY_URL/officer/issues/$CREATED_ISSUE_ID/claim" \
  -H "Authorization: Bearer $OFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')
assert_status "Officer Claim Issue" 200 "$claim_code"

# Update Status to Resolved
res_code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$GATEWAY_URL/officer/issues/$CREATED_ISSUE_ID/status" \
  -H "Authorization: Bearer $OFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved", "notes": "Pipeline valve replaced and pressure restored to normal."}')
assert_status "Officer Mark Issue Resolved" 200 "$res_code"


# 5. Admin Dashboard via Gateway
echo -e "\n${BLUE}--- 5. Testing Admin Dashboard via Gateway ($GATEWAY_URL/admin) ---${NC}"

# Admin Login
adm_login=$(curl -s -X POST "$GATEWAY_URL/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@city.gov", "password": "Admin@123"}')
ADM_TOKEN=$(echo "$adm_login" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null || echo "")

if [ -n "$ADM_TOKEN" ]; then
    echo -e "${GREEN}✓ [PASS]${NC} Admin Login via Gateway"
    pass_count=$((pass_count + 1))
else
    echo -e "${RED}✗ [FAIL]${NC} Admin Login failed"
    fail_count=$((fail_count + 1))
fi

# Analytics Summary
summary_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$GATEWAY_URL/admin/analytics/summary" \
  -H "Authorization: Bearer $ADM_TOKEN")
assert_status "Admin Analytics Summary" 200 "$summary_code"

# Analytics Trends
trends_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$GATEWAY_URL/admin/analytics/trends?days=14" \
  -H "Authorization: Bearer $ADM_TOKEN")
assert_status "Admin Analytics Trends" 200 "$trends_code"

# Analytics Heatmap
heatmap_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$GATEWAY_URL/admin/analytics/heatmap" \
  -H "Authorization: Bearer $ADM_TOKEN")
assert_status "Admin Analytics Geospatial Heatmap" 200 "$heatmap_code"

# Low Credibility Citizen Alerts
low_cred_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$GATEWAY_URL/admin/users/low-credibility" \
  -H "Authorization: Bearer $ADM_TOKEN")
assert_status "Admin Low Credibility Alerts (<0.5 score)" 200 "$low_cred_code"

# Check Block Tier Auto-Suggestion for user ID 6 (Spammer demo)
suggest_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$GATEWAY_URL/admin/users/6/block-suggest" \
  -H "Authorization: Bearer $ADM_TOKEN")
assert_status "Admin Progressive Block Tier Auto-Suggestion" 200 "$suggest_code"

# Issue a 3-Day Block
block_post_resp=$(curl -s -w "\n%{http_code}" -X POST "$GATEWAY_URL/admin/users/6/block" \
  -H "Authorization: Bearer $ADM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "duration_tier": "3d",
    "reason": "Repeated false emergency alarms and fraudulent complaint filings."
  }')
block_post_status=$(echo "$block_post_resp" | tail -n1)
assert_status "Admin Issue Citizen Block" 201 "$block_post_status"

# Check Block History
block_hist_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$GATEWAY_URL/admin/users/6/block-history" \
  -H "Authorization: Bearer $ADM_TOKEN")
assert_status "Admin User Block Audit Trail" 200 "$block_hist_code"

# SLA Configuration
sla_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$GATEWAY_URL/admin/sla-config" \
  -H "Authorization: Bearer $ADM_TOKEN")
assert_status "Admin SLA Config List" 200 "$sla_code"

# Knowledge Base Management
kb_post_resp=$(curl -s -w "\n%{http_code}" -X POST "$GATEWAY_URL/admin/knowledge-base" \
  -H "Authorization: Bearer $ADM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "department_id": 1,
    "title": "Water Tanker Delivery Protocol",
    "content": "Emergency municipal water tankers can be booked via ward office for supply disruptions exceeding 24 hours."
  }')
kb_post_status=$(echo "$kb_post_resp" | tail -n1)
assert_status "Admin Knowledge Base Article with Vector Embedding" 201 "$kb_post_status"

# Publish Public Announcement
pub_ann_resp=$(curl -s -w "\n%{http_code}" -X POST "$GATEWAY_URL/admin/announcements" \
  -H "Authorization: Bearer $ADM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Scheduled Water Pipeline Maintenance - Ward 4 & 5",
    "body": "Water supply will be temporarily throttled between 1:00 AM and 5:00 AM tomorrow for valve modernization."
  }')
pub_ann_status=$(echo "$pub_ann_resp" | tail -n1)
assert_status "Admin Publish Announcement" 201 "$pub_ann_status"

echo -e "\n${BLUE}================================================================${NC}"
echo -e "Central Gateway Test Results: ${GREEN}${pass_count} Passed${NC}, ${RED}${fail_count} Failed${NC}"
echo -e "${BLUE}================================================================${NC}"

if [ "$fail_count" -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL ENDPOINTS & FLOWS VERIFIED SUCCESSFULLY VIA CENTRAL API GATEWAY!${NC}\n"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Check logs above.${NC}\n"
    exit 1
fi
