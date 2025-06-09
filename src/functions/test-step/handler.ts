const handler = async (event: any) => {
  console.log(JSON.stringify(event, null, 2));

  return event;
};

export const main = handler;
