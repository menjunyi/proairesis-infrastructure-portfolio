mock_provider "aws" {}
variables {
  oidc_provider_arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
  subject           = "repo:example/portfolio:environment:staging"
  bucket_arn        = "arn:aws:s3:::example-portfolio-staging"
  distribution_arn  = "arn:aws:cloudfront::123456789012:distribution/EEXAMPLE"
}
run "plan_scoped_role" { command = plan }
run "reject_wildcard_subject" {
  command = plan
  variables { subject = "repo:example/*:environment:staging" }
  expect_failures = [var.subject]
}
