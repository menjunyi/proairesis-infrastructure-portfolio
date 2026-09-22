terraform {
  required_version = ">= 1.7.0, < 2.0.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
}

provider "aws" {
  region = var.region
}
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

module "site" {
  source = "../../modules/static_site"
  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
  project_name   = "portfolio-demo"
  environment    = var.environment
  site_hostname  = var.site_hostname
  hosted_zone_id = var.hosted_zone_id
  tags           = { Environment = var.environment, ManagedBy = "terraform" }
}

module "budget" {
  source            = "../../modules/budget"
  name              = "portfolio-demo-${var.environment}"
  monthly_limit_usd = var.monthly_budget_usd
  alert_emails      = var.budget_alert_emails
  tags              = { Environment = var.environment }
}

output "site_url" { value = module.site.site_url }
output "bucket_name" { value = module.site.bucket_name }
output "distribution_id" { value = module.site.cloudfront_distribution_id }
