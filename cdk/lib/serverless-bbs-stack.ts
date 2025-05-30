import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as path from "path";

export class ServerlessBbsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, "messagesTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
    });

    const postMessageFn = new lambda.NodejsFunction(
      this,
      "PostMessageFunction",
      {
        entry: path.join(__dirname, "../lambda/postMessage.ts"),
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );
    table.grantWriteData(postMessageFn);

    const getMessagesFn = new lambda.NodejsFunction(
      this,
      "GetMessagesFunction",
      {
        entry: path.join(__dirname, "../lambda/getMessages.ts"),
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );
    table.grantReadData(getMessagesFn);

    const api = new apigateway.RestApi(this, "MessageApi");
    const messageResource = api.root.addResource("messages");
    messageResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(postMessageFn)
    );
    messageResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getMessagesFn)
    );
    messageResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: apigateway.Cors.ALL_METHODS,
      allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
    });
  }
}
