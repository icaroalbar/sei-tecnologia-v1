import { handlerPath } from "../../libs/handler-resolver";

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      s3: {
        bucket: "${env:AWS_BUCKET_STORE}",
        event: "s3:ObjectCreated:*",
        existing: true,
      },
    },
  ],
};
