terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
}

variable "oidc_provider_arn" {
  type        = string
  description = "Existing GitHub Actions OIDC provider ARN; this module does not create a second provider."
}
variable "subject" {
  type        = string
  description = "Exact expected GitHub OIDC sub claim, including repository and environment. Match your account's subject customisation."
  validation {
    condition     = startswith(var.subject, "repo:") && strcontains(var.subject, ":environment:") && !strcontains(var.subject, "*")
    error_message = "Use an exact repository/environment subject, never a wildcard."
  }
}
variable "role_name" { type = string }
variable "bucket_arn" { type = string }
variable "distribution_arn" { type = string }

resource "aws_iam_role" "deploy" {
  name                 = var.role_name
  max_session_duration = 3600
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = var.oidc_provider_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = { StringEquals = {
        "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        "token.actions.githubusercontent.com:sub" = var.subject
      } }
    }]
  })
}

resource "aws_iam_role_policy" "deploy" {
  role = aws_iam_role.deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["s3:ListBucket", "s3:GetBucketLocation"], Resource = var.bucket_arn },
      { Effect = "Allow", Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"], Resource = "${var.bucket_arn}/*" },
      { Effect = "Allow", Action = ["cloudfront:GetDistribution", "cloudfront:GetDistributionConfig", "cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"], Resource = var.distribution_arn }
    ]
  })
}
output "role_arn" { value = aws_iam_role.deploy.arn }
