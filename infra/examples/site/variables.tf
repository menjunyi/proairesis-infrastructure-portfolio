variable "region" {
  type    = string
  default = "ap-southeast-2"
}
variable "environment" {
  type    = string
  default = "staging"
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Choose staging or production."
  }
}
variable "site_hostname" {
  type        = string
  description = "Hostname in a Route 53 zone you control. example.com is a placeholder, not deployable configuration."
}
variable "hosted_zone_id" {
  type        = string
  description = "Existing public Route 53 zone under your control."
}
variable "monthly_budget_usd" {
  type    = number
  default = 10
  validation {
    condition     = var.monthly_budget_usd > 0
    error_message = "Use a positive budget."
  }
}
variable "budget_alert_emails" {
  type    = set(string)
  default = []
}
