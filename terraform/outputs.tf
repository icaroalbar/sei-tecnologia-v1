output "bucket_store" {
  value = aws_s3_bucket.bucket_store.bucket
}

output "bucket_serverless" {
  value = aws_s3_bucket.bucket_serverless.bucket
}

output "bucket_results" {
  value = aws_s3_bucket.bucket_results.bucket
}