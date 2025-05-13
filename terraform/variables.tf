variable "region" {}
variable "bucket_store" {
  description = "Bucket que vai receber os documentos para extração"
}
variable "bucket_sserverless" {
  description = "Bucket que vai receber os build do Serverless Framework" 
}
# variable "bucket_save" {}