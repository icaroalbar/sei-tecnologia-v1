variable "region" {}
variable "aws_access_key" {}
variable "aws_secret_key" {}
variable "bucket_store" {
  description = "Bucket que vai receber os documentos para extração"
}
variable "bucket_serverless" {
  description = "Bucket que vai receber os build do Serverless Framework" 
}
# variable "bucket_save" {}