terraform {
  required_version = ">= 1.7.0, < 2.0.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
}
provider "aws" { region = "ap-southeast-2" }
variable "oidc_provider_arn" { type = string }
variable "subject" {
  type = string
  validation {
    condition     = startswith(var.subject, "repo:") && strcontains(var.subject, ":environment:") && !strcontains(var.subject, "*")
    error_message = "Use an exact repository/environment subject."
  }
}
variable "bucket_arn" { type = string }
variable "distribution_arn" { type = string }
module "deploy" {
  source            = "../../modules/github_oidc"
  role_name         = "portfolio-staging-deploy"
  oidc_provider_arn = var.oidc_provider_arn
  subject           = var.subject
  bucket_arn        = var.bucket_arn
  distribution_arn  = var.distribution_arn
}
