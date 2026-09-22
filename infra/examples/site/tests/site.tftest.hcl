mock_provider "aws" {}
mock_provider "aws" { alias = "us_east_1" }

override_resource {
  target          = module.site.aws_acm_certificate.site
  override_during = plan
  values = {
    arn = "arn:aws:acm:us-east-1:123456789012:certificate/example"
    domain_validation_options = [{
      domain_name           = "staging.example.com"
      resource_record_name  = "_validation.staging.example.com"
      resource_record_value = "_validation.acm-validations.aws."
      resource_record_type  = "CNAME"
    }]
  }
}

variables {
  site_hostname  = "staging.example.com"
  hosted_zone_id = "ZEXAMPLE"
}

run "staging_contract" {
  command = plan
  assert {
    condition     = output.site_url == "https://staging.example.com"
    error_message = "Expected the configured HTTPS site URL."
  }
}

run "reject_unknown_environment" {
  command = plan
  variables { environment = "preview" }
  expect_failures = [var.environment]
}

run "reject_zero_budget" {
  command = plan
  variables { monthly_budget_usd = 0 }
  expect_failures = [var.monthly_budget_usd]
}
