output "bucket_store" {
  value = aws_s3_bucket.bucket_store.bucket
}

output "bucket_serverless" {
  value = aws_s3_bucket.bucket_serverless.bucket
}

output "bucket_results" {
  value = aws_s3_bucket.bucket_results.bucket
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.table_processed_documents.name
}

output "dynamodb_table_arn" {
  value = aws_dynamodb_table.table_processed_documents.arn
}
