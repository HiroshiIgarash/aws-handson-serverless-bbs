import { SecretValue, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as path from "path";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { RemovalPolicy } from "aws-cdk-lib";

export class ServerlessBbsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      websiteIndexDocument: "index.html",
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const githubSourceOutput = new codepipeline.Artifact();
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: "GitHub_Source",
      owner: "HiroshiIgarash",
      repo: "aws-handson-serverless-bbs",
      oauthToken: SecretValue.secretsManager("MY_AWS_GITHUB_TOKEN"),
      output: githubSourceOutput,
      branch: "main",
    });

    const project = new codebuild.PipelineProject(this, "BuildProject", {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            commands: [
              "cd client",
              "echo VITE_API_URL=$VITE_API_URL > .env",
              "npm ci",
            ],
          },
          build: {
            commands: ["npm run build"],
          },
        },
        artifacts: {
          "base-directory": "client/dist",
          files: "**/*",
        },
      }),
    });

    const deployAction = new codepipeline_actions.S3DeployAction({
      actionName: "Deploy_to_S3",
      bucket: siteBucket,
      input: new codepipeline.Artifact("BuildOutput"),
    });

    new codepipeline.Pipeline(this, "FrontendPipeline", {
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction],
        },
        {
          stageName: "Build",
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: "Build_Client",
              project,
              input: githubSourceOutput,
              outputs: [new codepipeline.Artifact("BuildOutput")],
            }),
          ],
        },
        {
          stageName: "Deploy",
          actions: [deployAction],
        },
      ],
    });

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
