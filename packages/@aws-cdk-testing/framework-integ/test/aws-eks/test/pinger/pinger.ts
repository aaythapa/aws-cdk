import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { CustomResource, Token, Duration } from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import * as path from 'path';

export interface PingerProps {
  readonly url: string;
  readonly securityGroup?: ec2.SecurityGroup;
  readonly vpc?: ec2.IVpc;
  readonly subnets?: ec2.ISubnet[];
}
export class Pinger extends Construct {
  private _resource: CustomResource;

  constructor(scope: Construct, id: string, props: PingerProps) {
    super(scope, id);

    const func = new lambda.Function(this, 'Function', {
      code: lambda.Code.fromAsset(path.join(__dirname, 'function')),
      handler: 'index.handler',
      runtime: lambda.Runtime.PYTHON_3_9,
      vpc: props.vpc,
      vpcSubnets: props.subnets ? { subnets: props.subnets } : undefined,
      securityGroups: props.securityGroup ? [props.securityGroup] : undefined,
      timeout: Duration.minutes(10),
    });

    const provider = new cr.Provider(this, 'Provider', {
      onEventHandler: func,
    });

    this._resource = new CustomResource(this, 'Resource', {
      serviceToken: provider.serviceToken,
      properties: {
        Url: props.url,
      },
    });
  }

  public get response() {
    return Token.asString(this._resource.getAtt('Value'));
  }
}
