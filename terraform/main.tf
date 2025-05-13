provider "aws" {
  region = var.region
}

resource "aws_s3_bucket" "bucket_store" {
  bucket = var.bucket_store
  force_destroy = true  # Manter true apenas em desenvolvimento
}

resource "aws_s3_bucket" "bucket_serverless" {
  bucket = var.bucket_sserverless
  force_destroy = true
}