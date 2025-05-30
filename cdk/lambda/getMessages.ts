import { DynamoDB } from "aws-sdk";

const ddb = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME!;

exports.handler = async () => {
  const data = await ddb
    .scan({
      TableName: TABLE_NAME,
    })
    .promise();

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(data.Items),
  };
};
