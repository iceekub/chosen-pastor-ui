# Scripts

## Deploying the staff dashboard

The dashboard runs as a container on **AWS Fargate** (service
`ragserv-dev-admin-ui` on the shared `ragserv-dev` cluster), behind the shared
ALB at **https://admin.sixseeds.org**. The AWS infrastructure (ECR repo, ECS
service + task definition, ALB host rule, ACM cert, `SESSION_SECRET` in SSM,
DNS) is defined and already applied in
[`thechosenapp/ragserv`](https://github.com/thechosenapp/ragserv) at
`terraform/admin_ui.tf`. `deploy-admin.sh` just ships new code onto it.

### TL;DR

```bash
./scripts/deploy-admin.sh
```

Builds the image (`linux/amd64`), pushes `:latest` to ECR, forces a new ECS
deployment, waits for the service to stabilize, verifies the running image
digest, and curls the login page. Takes a few minutes. **The build ships your
local working tree**, so be on an up-to-date `main` with a clean checkout
first.

### Prerequisites

- **Docker Desktop** running, with a `buildx` builder. The script defaults to
  the builder named `desktop-linux` (Docker Desktop's default on macOS). If
  yours is named differently: `docker buildx create --name desktop-linux --use`,
  or set `BUILDX_BUILDER`. The build is `--platform linux/amd64`; on Apple
  Silicon it cross-builds via emulation (works, just slower).
- **AWS CLI v2.**
- **AWS credentials for the ragserv account** with the permissions below. The
  script defaults to the profile `ragserv`; use your own with
  `AWS_PROFILE=<name> ./scripts/deploy-admin.sh`.

You do **not** need terraform, a `SESSION_SECRET`, or any DNS/cert work — that
infrastructure is already provisioned. This script only builds + rolls the image.

### Environment variables (all optional)

The four `NEXT_PUBLIC_*` values are baked into the client bundle at build time
and **default to production values**, so a normal deploy needs nothing set.
Override only to change one:

| Var | Default | When to set |
|---|---|---|
| `AWS_PROFILE` | `ragserv` | Your AWS profile is named differently |
| `BUILDX_BUILDER` | `desktop-linux` | Your buildx builder is named differently |
| `NEXT_PUBLIC_RAGSERV_URL` | `https://api.chosenapp.com` | Point the build at the new API domain (see below) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://mtuimpykacljpmxkarky.supabase.co` | ~never |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable anon key | ~never |
| `NEXT_PUBLIC_AWS_THUMBNAILS_BUCKET_URL` | `https://ragserv-dev-thumbnails.s3.us-west-2.amazonaws.com` | ~never |
| `AWS_REGION` / `CLUSTER` / `SERVICE` / `ECR_REPO` | `us-west-2` / `ragserv-dev` / `ragserv-dev-admin-ui` / `ragserv-dev-admin-ui` | ~never |

> During the `chosenapp.com → sixseeds.org` migration, to ship a build that
> talks to the new API domain:
> ```bash
> NEXT_PUBLIC_RAGSERV_URL=https://api.sixseeds.org ./scripts/deploy-admin.sh
> ```

### AWS permissions (least privilege)

The script makes exactly these calls: `sts:GetCallerIdentity`, ECR
auth/push/describe, and `ecs:UpdateService` / `DescribeServices` / `ListTasks` /
`DescribeTasks`. Attach this policy to the deploying IAM user/role (replace
`<ACCOUNT_ID>` with the ragserv account ID):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "Identity", "Effect": "Allow", "Action": "sts:GetCallerIdentity", "Resource": "*" },
    { "Sid": "EcrAuth", "Effect": "Allow", "Action": "ecr:GetAuthorizationToken", "Resource": "*" },
    {
      "Sid": "EcrPushAdminUi", "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability", "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart", "ecr:CompleteLayerUpload",
        "ecr:PutImage", "ecr:DescribeImages"
      ],
      "Resource": "arn:aws:ecr:us-west-2:<ACCOUNT_ID>:repository/ragserv-dev-admin-ui"
    },
    {
      "Sid": "EcsDeployAdminUi", "Effect": "Allow",
      "Action": ["ecs:UpdateService", "ecs:DescribeServices"],
      "Resource": "arn:aws:ecs:us-west-2:<ACCOUNT_ID>:service/ragserv-dev/ragserv-dev-admin-ui"
    },
    {
      "Sid": "EcsTaskReadback", "Effect": "Allow",
      "Action": ["ecs:ListTasks", "ecs:DescribeTasks"],
      "Resource": "*",
      "Condition": { "ArnEquals": { "ecs:cluster": "arn:aws:ecs:us-west-2:<ACCOUNT_ID>:cluster/ragserv-dev" } }
    }
  ]
}
```

`ecr:GetAuthorizationToken` cannot be resource-scoped (hence `*`). If you'd
rather not be precise, the AWS-managed `AmazonEC2ContainerRegistryPowerUser`
plus an `ecs:UpdateService`/`DescribeServices`/`ListTasks`/`DescribeTasks`
statement also works.

### What it does, step by step

1. **Preflight** — checks `docker`, `aws`, the buildx builder, and valid creds.
2. **ECR login.**
3. **Build** — `docker buildx build --no-cache --platform linux/amd64` with the
   `NEXT_PUBLIC_*` values passed as `--build-arg`.
4. **Push** `:latest` to ECR (re-authenticates once if the 12 h token expires
   mid-push).
5. **Roll** — `aws ecs update-service --force-new-deployment`.
6. **Wait** for `services-stable` (with a ~30 s heartbeat so it doesn't look hung).
7. **Verify** the running task's image digest matches what was just pushed
   (catches ECS reporting "stable" with a stale cached image).
8. **Health check** — curls `https://admin.sixseeds.org/login` (non-fatal).

### Troubleshooting

- **`buildx builder 'desktop-linux' not found`** — `docker buildx create --name desktop-linux --use`, or set `BUILDX_BUILDER`.
- **`AWS credentials not valid for profile 'ragserv'`** — configure that profile (`aws configure --profile ragserv`) or set `AWS_PROFILE`.
- **`update-service failed`** — the ECS service isn't applied yet; run `terraform apply` in `ragserv/terraform`.
- **Service won't stabilize / login returns non-2xx** — tail the container logs:
  ```bash
  aws logs tail /ecs/ragserv-dev-admin-ui --follow --region us-west-2 --profile ragserv
  ```
