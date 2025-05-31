import { DynamoDB } from "aws-sdk";

const ddb = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME!;

exports.handler = async (event: any) => {
  const body = JSON.parse(event.body);
  const { name, content } = body;

  await ddb
    .put({
      TableName: TABLE_NAME,
      Item: {
        id: Date.now().toString(),
        name,
        content,
      },
    })
    .promise();

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Posted successfully",
    }),
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  };
};
