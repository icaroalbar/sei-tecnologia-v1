import middy from "@middy/core";
import middyJsonBodyParser from "@middy/http-json-body-parser";

export const middyfy = (handler) => {
  return middy(handler).use({
    before: (request) => {
      const { event } = request;

      if (
        event.httpMethod === "GET" ||
        event.httpMethod === "DELETE" ||
        event.httpMethod === "PATCH"
      ) {
        if (!event.headers["Content-Type"]) {
          event.headers["Content-Type"] = "application/json";
        }
      }

      middyJsonBodyParser().before?.(request);
    },
  });
};
