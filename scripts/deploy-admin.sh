#!/usr/bin/env bash
set -euo pipefail

# ===========================================================================
# deploy-admin.sh — Build, push, and deploy the staff dashboard to AWS ECS.
#
# Mirrors ../ragserv/scripts/deploy.sh (same builder + auth-retry + digest
# verification lessons) but for the single `admin-ui` Fargate service that
# lives on the shared ragserv-dev cluster behind the shared ALB. The
# infrastructure is defined in ../ragserv/terraform/admin_ui.tf.
#
# Usage:
#   ./scripts/deploy-admin.sh          # build + push + roll the admin-ui service
#   ./scripts/deploy-admin.sh --help
#
# The four NEXT_PUBLIC_* values are baked into the client bundle at build
# time (see Dockerfile). They are NOT secret — public URLs + the Supabase
# publishable anon key — so they default to the production values below and
# can be overridden via the environment, e.g. to fall back to the legacy
# domain during the chosenapp.com → sixseeds.org cutover:
#   NEXT_PUBLIC_RAGSERV_URL=https://api.chosenapp.com ./scripts/deploy-admin.sh
# ===========================================================================

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    sed -n '4,21p' "$0"
    exit 0
fi

AWS_PROFILE="${AWS_PROFILE:-ragserv}"
AWS_REGION="${AWS_REGION:-us-west-2}"
CLUSTER="${CLUSTER:-ragserv-dev}"
SERVICE="${SERVICE:-ragserv-dev-admin-ui}"
ECR_REPO="${ECR_REPO:-ragserv-dev-admin-ui}"
BUILDX_BUILDER="${BUILDX_BUILDER:-desktop-linux}"
ADMIN_DOMAIN="${ADMIN_DOMAIN:-admin.sixseeds.org}"
export AWS_PROFILE

# --- NEXT_PUBLIC_* build args (public; overridable via env) -----------------
NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://mtuimpykacljpmxkarky.supabase.co}"
NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-sb_publishable_F8iHELEo-vuK_sTekPXA1w_rEk4tgWZ}"
NEXT_PUBLIC_RAGSERV_URL="${NEXT_PUBLIC_RAGSERV_URL:-https://api.sixseeds.org}"
NEXT_PUBLIC_AWS_THUMBNAILS_BUCKET_URL="${NEXT_PUBLIC_AWS_THUMBNAILS_BUCKET_URL:-https://ragserv-dev-thumbnails.s3.us-west-2.amazonaws.com}"

info()  { echo "==> $1"; }
warn()  { echo "WARNING: $1" >&2; }
error() { echo "ERROR: $1" >&2; exit 1; }

# Resolve to the directory above scripts/ so the build context is the repo
# root regardless of where the script is invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Authenticate Docker with ECR. Idempotent.
ecr_login() {
    aws ecr get-login-password --region "$AWS_REGION" \
        | docker login --username AWS \
            --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com" \
            2>/dev/null \
        || error "Docker ECR login failed"
}

# Push, re-authenticating once if the 12h ECR token expired mid-push.
push_with_auth_retry() {
    local image="$1"
    local logf; logf="$(mktemp)"
    if docker push "$image" 2>&1 | tee "$logf"; then rm -f "$logf"; return 0; fi
    if grep -q "denied: Your authorization token has expired" "$logf"; then
        warn "ECR token expired mid-push; re-authenticating and retrying"
        ecr_login
        docker push "$image" || { rm -f "$logf"; error "push failed after re-auth"; }
        rm -f "$logf"; return 0
    fi
    rm -f "$logf"; error "push failed (see streamed output above)"
}

# ===========================================================================
# Preflight
# ===========================================================================
info "Checking prerequisites..."
for cmd in docker aws; do
    command -v "$cmd" &>/dev/null || error "$cmd is required but not installed"
done
docker buildx inspect "$BUILDX_BUILDER" >/dev/null 2>&1 \
    || error "buildx builder '$BUILDX_BUILDER' not found. Run 'docker buildx create --name $BUILDX_BUILDER --use' or set BUILDX_BUILDER."

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null) \
    || error "AWS credentials not valid for profile '$AWS_PROFILE'"
info "AWS account: $ACCOUNT_ID"

ECR_URL="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO"
IMAGE="$ECR_URL:latest"
info "Target image:   $IMAGE"
info "Ragserv URL:    $NEXT_PUBLIC_RAGSERV_URL"

# ===========================================================================
# Build (no-cache + linux/amd64 — same reasoning as ragserv/deploy.sh)
# ===========================================================================
info "Authenticating Docker with ECR..."
ecr_login

info "Building admin-ui image (no-cache, linux/amd64)..."
docker buildx build \
    --no-cache --pull \
    --builder "$BUILDX_BUILDER" \
    --platform linux/amd64 \
    --load \
    --build-arg "NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL" \
    --build-arg "NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    --build-arg "NEXT_PUBLIC_RAGSERV_URL=$NEXT_PUBLIC_RAGSERV_URL" \
    --build-arg "NEXT_PUBLIC_AWS_THUMBNAILS_BUCKET_URL=$NEXT_PUBLIC_AWS_THUMBNAILS_BUCKET_URL" \
    -t "$IMAGE" \
    "$REPO_ROOT" \
    || error "admin-ui build failed"

# ===========================================================================
# Push + roll the service
# ===========================================================================
info "Pushing admin-ui image..."
push_with_auth_retry "$IMAGE"

PUSHED_DIGEST=$(aws ecr describe-images --repository-name "$ECR_REPO" \
    --image-ids imageTag=latest --region "$AWS_REGION" \
    --query 'imageDetails[0].imageDigest' --output text)
info "Pushed digest:  $PUSHED_DIGEST"

info "Forcing new deployment of $SERVICE..."
aws ecs update-service \
    --cluster "$CLUSTER" --service "$SERVICE" \
    --force-new-deployment --region "$AWS_REGION" \
    --query 'service.serviceName' --output text >/dev/null \
    || error "update-service failed (is the service applied via terraform?)"

# ===========================================================================
# Wait for stabilization, with a ~30s heartbeat so it doesn't look hung.
# ===========================================================================
info "Waiting for $SERVICE to stabilize..."
start=$(date +%s)
aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE" --region "$AWS_REGION" &
wait_pid=$!
while kill -0 "$wait_pid" 2>/dev/null; do
    sleep 30
    kill -0 "$wait_pid" 2>/dev/null || break
    snap=$(aws ecs describe-services --cluster "$CLUSTER" --services "$SERVICE" \
        --region "$AWS_REGION" \
        --query "services[0].deployments[?status=='PRIMARY'].[rolloutState,runningCount,desiredCount][0]" \
        --output text 2>/dev/null) || snap="(status unavailable)"
    info "  …stabilizing $(( $(date +%s) - start ))s — $snap"
done
wait "$wait_pid" || error "Service did not stabilize — check: aws logs tail /ecs/$SERVICE --follow --region $AWS_REGION --profile $AWS_PROFILE"
info "Service stable"

# Verify the running task is actually the image we just pushed (ECS can
# report stable with a stale cached image — see ragserv/deploy.sh).
task=$(aws ecs list-tasks --cluster "$CLUSTER" --service-name "$SERVICE" \
    --region "$AWS_REGION" --query 'taskArns[0]' --output text 2>/dev/null)
if [[ -n "$task" && "$task" != "None" ]]; then
    running=$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$task" \
        --region "$AWS_REGION" --query 'tasks[0].containers[0].imageDigest' --output text 2>/dev/null)
    [[ "$running" == "$PUSHED_DIGEST" ]] \
        || error "$SERVICE is running $running but we pushed $PUSHED_DIGEST — deploy did not pick up the new image"
    info "Running digest verified ✓"
fi

# ===========================================================================
# Health check (non-fatal: fails until the admin.sixseeds.org DNS record and
# the wildcard cert validation are in place).
# ===========================================================================
info "Checking https://$ADMIN_DOMAIN/login ..."
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$ADMIN_DOMAIN/login" 2>/dev/null) || code="000"
if [[ "$code" =~ ^(200|30[0-9])$ ]]; then
    info "Login page responded $code ✓"
else
    warn "Login page returned '$code' — expected 200/3xx."
    warn "If you haven't added the DNS records yet, that's why. See:"
    warn "  (cd ../ragserv/terraform && terraform output dns_cname_admin dns_acm_validation_sixseeds)"
fi

echo ""
info "Deploy complete! Total: $(( $(date +%s) - start ))s"
