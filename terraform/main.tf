provider "aws" {
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
  region = var.region
}

resource "aws_s3_bucket" "bucket_store" {
  bucket = var.bucket_store
  force_destroy = true  # Manter true apenas em desenvolvimento
}

resource "aws_s3_bucket" "bucket_serverless" {
  bucket = var.bucket_serverless
  force_destroy = true # Manter true apenas em desenvolvimento
}

resource "aws_s3_bucket" "bucket_results" {
  bucket = var.bucket_results
  force_destroy = true # Manter true apenas em desenvolvimento
}

resource "aws_dynamodb_table" "table_processed_documents" {
  name           = var.table_name
  billing_mode   = "PAY_PER_REQUEST"

  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

