import { Match, Template } from '../../assertions';
import * as acm from '../../aws-certificatemanager';
import { Bucket } from '../../aws-s3';
import { Stack } from '../../core';
import * as apigw from '../lib';

/* eslint-disable quote-props */

describe('domains', () => {
  test('can define either an EDGE or REGIONAL domain name', () => {
    // GIVEN
    const stack = new Stack();
    const cert = new acm.Certificate(stack, 'Cert', { domainName: 'example.com' });

    // WHEN
    const regionalDomain = new apigw.DomainName(stack, 'my-domain', {
      domainName: 'example.com',
      certificate: cert,
      endpointType: apigw.EndpointType.REGIONAL,
    });

    const edgeDomain = new apigw.DomainName(stack, 'your-domain', {
      domainName: 'example.com',
      certificate: cert,
      endpointType: apigw.EndpointType.EDGE,
    });

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::DomainName', {
      'DomainName': 'example.com',
      'EndpointConfiguration': { 'Types': ['REGIONAL'] },
      'RegionalCertificateArn': { 'Ref': 'Cert5C9FAEC1' },
    });

    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::DomainName', {
      'DomainName': 'example.com',
      'EndpointConfiguration': { 'Types': ['EDGE'] },
      'CertificateArn': { 'Ref': 'Cert5C9FAEC1' },
    });

    expect(stack.resolve(regionalDomain.domainNameAliasDomainName)).toEqual({ 'Fn::GetAtt': ['mydomain592C948B', 'RegionalDomainName'] });
    expect(stack.resolve(regionalDomain.domainNameAliasHostedZoneId)).toEqual({ 'Fn::GetAtt': ['mydomain592C948B', 'RegionalHostedZoneId'] });
    expect(stack.resolve(edgeDomain.domainNameAliasDomainName)).toEqual({ 'Fn::GetAtt': ['yourdomain5FE30C81', 'DistributionDomainName'] });
    expect(stack.resolve(edgeDomain.domainNameAliasHostedZoneId)).toEqual({ 'Fn::GetAtt': ['yourdomain5FE30C81', 'DistributionHostedZoneId'] });
  });

  test('default endpoint type is REGIONAL', () => {
    // GIVEN
    const stack = new Stack();
    const cert = new acm.Certificate(stack, 'Cert', { domainName: 'example.com' });

    // WHEN
    new apigw.DomainName(stack, 'my-domain', {
      domainName: 'example.com',
      certificate: cert,
    });

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::DomainName', {
      'DomainName': 'example.com',
      'EndpointConfiguration': { 'Types': ['REGIONAL'] },
      'RegionalCertificateArn': { 'Ref': 'Cert5C9FAEC1' },
    });
  });

  test('accepts different security policies', () => {
    // GIVEN
    const stack = new Stack();
    const cert = new acm.Certificate(stack, 'Cert', { domainName: 'example.com' });

    // WHEN
    new apigw.DomainName(stack, 'my-domain', {
      domainName: 'old.example.com',
      certificate: cert,
      securityPolicy: apigw.SecurityPolicy.TLS_1_0,
    });

    new apigw.DomainName(stack, 'your-domain', {
      domainName: 'new.example.com',
      certificate: cert,
      securityPolicy: apigw.SecurityPolicy.TLS_1_2,
    });

    new apigw.DomainName(stack, 'default-domain', {
      domainName: 'default.example.com',
      certificate: cert,
    });

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::DomainName', {
      'DomainName': 'old.example.com',
      'EndpointConfiguration': { 'Types': ['REGIONAL'] },
      'RegionalCertificateArn': { 'Ref': 'Cert5C9FAEC1' },
      'SecurityPolicy': 'TLS_1_0',
    });

    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::DomainName', {
      'DomainName': 'new.example.com',
      'EndpointConfiguration': { 'Types': ['REGIONAL'] },
      'RegionalCertificateArn': { 'Ref': 'Cert5C9FAEC1' },
      'SecurityPolicy': 'TLS_1_2',
    });

    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::DomainName', {
      'DomainName': 'default.example.com',
      'EndpointConfiguration': { 'Types': ['REGIONAL'] },
      'RegionalCertificateArn': { 'Ref': 'Cert5C9FAEC1' },
      'SecurityPolicy': Match.absent(),
    });
  });

  test('"mapping" can be used to automatically map this domain to the deployment stage of an API', () => {
    // GIVEN
    const stack = new Stack();
    const api = new apigw.RestApi(stack, 'api');
    api.root.addMethod('GET');

    // WHEN
    new apigw.DomainName(stack, 'Domain', {
      domainName: 'foo.com',
      certificate: acm.Certificate.fromCertificateArn(stack, 'cert', 'arn:aws:acm:us-east-1:1111111:certificate/11-3336f1-44483d-adc7-9cd375c5169d'),
      endpointType: apigw.EndpointType.EDGE,
      mapping: api,
    });

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::BasePathMapping', {
      'DomainName': {
        'Ref': 'Domain66AC69E0',
      },
      'RestApiId': {
        'Ref': 'apiC8550315',
      },
      'Stage': {
        'Ref': 'apiDeploymentStageprod896C8101',
      },
    });
  });

  describe('multi-level mapping', () => {
    test('can add a multi-level path', () => {
      // GIVEN
      const stack = new Stack();
      const api = new apigw.RestApi(stack, 'api');
      api.root.addMethod('GET');

      // WHEN
      new apigw.DomainName(stack, 'Domain', {
        domainName: 'foo.com',
        certificate: acm.Certificate.fromCertificateArn(stack, 'cert', 'arn:aws:acm:us-east-1:1111111:certificate/11-3336f1-44483d-adc7-9cd375c5169d'),
        endpointType: apigw.EndpointType.REGIONAL,
        mapping: api,
        basePath: 'v1/api',
      });

      // THEN
      Template.fromStack(stack).hasResourceProperties('AWS::ApiGatewayV2::ApiMapping', {
        'DomainName': {
          'Ref': 'Domain66AC69E0',
        },
        'ApiId': {
          'Ref': 'apiC8550315',
        },
        'Stage': {
          'Ref': 'apiDeploymentStageprod896C8101',
        },
        'ApiMappingKey': 'v1/api',
      });
    });

    test('throws if endpointType is not REGIONAL', () => {
      // GIVEN
      const stack = new Stack();
      const api = new apigw.RestApi(stack, 'api');
      api.root.addMethod('GET');

      // THEN
      expect(() => {
        new apigw.DomainName(stack, 'Domain', {
          domainName: 'foo.com',
          certificate: acm.Certificate.fromCertificateArn(stack, 'cert', 'arn:aws:acm:us-east-1:1111111:certificate/11-3336f1-44483d-adc7-9cd375c5169d'),
          endpointType: apigw.EndpointType.EDGE,
          mapping: api,
          basePath: 'v1/api',
        });
      }).toThrow(/multi-level basePath is only supported when endpointType is EndpointType.REGIONAL/);
    });

    test('throws if securityPolicy is not TLS_1_2', () => {
      // GIVEN
      const stack = new Stack();
      const api = new apigw.RestApi(stack, 'api');
      api.root.addMethod('GET');

      // THEN
      expect(() => {
        new apigw.DomainName(stack, 'Domain', {
          domainName: 'foo.com',
          certificate: acm.Certificate.fromCertificateArn(stack, 'cert', 'arn:aws:acm:us-east-1:1111111:certificate/11-3336f1-44483d-adc7-9cd375c5169d'),
          mapping: api,
          basePath: 'v1/api',
          securityPolicy: apigw.SecurityPolicy.TLS_1_0,
        });
      }).toThrow(/securityPolicy must be set to TLS_1_2 if multi-level basePath is provided/);
    });

    test('can use addApiMapping', () => {
      // GIVEN
      const stack = new Stack();
      const api = new apigw.RestApi(stack, 'api');
      api.root.addMethod('GET');

      // WHEN
      const domain = new apigw.DomainName(stack, 'Domain', {
        domainName: 'foo.com',
        certificate: acm.Certificate.fromCertificateArn(stack, 'cert', 'arn:aws:acm:us-east-1:1111111:certificate/11-3336f1-44483d-adc7-9cd375c5169d'),
      });
      domain.addApiMapping(api.deploymentStage);
      domain.addApiMapping(api.deploymentStage, { basePath: '//' });
      domain.addApiMapping(api.deploymentStage, {
        basePath: 'v1/my-api',
      });
      domain.addApiMapping(api.deploymentStage, {
        basePath: 'v1//my-api',
      });

      // THEN
      Template.fromStack(stack).hasResourceProperties('AWS::ApiGatewayV2::ApiMapping', {
        'DomainName': {
          'Ref': 'Domain66AC69E0',
        },
        'ApiId': {
          'Ref': 'apiC8550315',
        },
        'Stage': {
          'Ref': 'apiDeploymentStageprod896C8101',
        },
      });
      Template.fromStack(stack).hasResourceProperties('AWS::ApiGatewayV2::ApiMapping', {
        'DomainName': {
          'Ref': 'Domain66AC69E0',
        },
        'ApiId': {
          'Ref': 'apiC8550315',
        },
        'Stage': {
          'Ref': 'apiDeploymentStageprod896C8101',
        },
        'ApiMappingKey': '//',
      });
      Template.fromStack(stack).hasResourceProperties('AWS::ApiGatewayV2::ApiMapping', {
        'DomainName': {
          'Ref': 'Domain66AC69E0',
        },
        'ApiId': {
          'Ref': 'apiC8550315',
        },
        'Stage': {
          'Ref': 'apiDeploymentStageprod896C8101',
        },
        'ApiMappingKey': 'v1/my-api',
      });
      Template.fromStack(stack).hasResourceProperties('AWS::ApiGatewayV2::ApiMapping', {
        'DomainName': {
          'Ref': 'Domain66AC69E0',
        },
        'ApiId': {
          'Ref': 'apiC8550315',
        },
        'Stage': {
          'Ref': 'apiDeploymentStageprod896C8101',
        },
        'ApiMappingKey': 'v1//my-api',
      });
    });

    test('can use addDomainName', () => {
      // GIVEN
      const stack = new Stack();
      const api = new apigw.RestApi(stack, 'api');
      api.root.addMethod('GET');

      const domain = api.addDomainName('Domain', {
        domainName: 'foo.com',
        certificate: acm.Certificate.fromCertificateArn(stack, 'cert', 'arn:aws:acm:us-east-1:1111111:certificate/11-3336f1-44483d-adc7-9cd375c5169d'),
      });

      // WHEN
      domain.addApiMapping(api.deploymentStage, {
        basePath: 'v1/my-api',
      });

      // THEN
      Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::BasePathMapping', {
        'DomainName': {
          'Ref': 'apiDomain6D60CEFD',
        },
        'RestApiId': {
          'Ref': 'apiC8550315',
        },
        'Stage': {
          'Ref': 'apiDeploymentStageprod896C8101',
        },
      });
      Template.fromStack(stack).hasResourceProperties('AWS::ApiGatewayV2::ApiMapping', {
        'DomainName': {
          'Ref': 'apiDomain6D60CEFD',
        },
        'ApiId': {
          'Ref': 'apiC8550315',
        },
        'Stage': {
          'Ref': 'apiDeploymentStageprod896C8101',
        },
        'ApiMappingKey': 'v1/my-api',
      });
    });

    test('throws if addBasePathMapping tries to add a mapping for a path that is already mapped', () => {
      // GIVEN
      const stack = new Stack();
      const api = new apigw.RestApi(stack, 'api');
      api.root.addMethod('GET');

      // WHEN
      const domain = new apigw.DomainName(stack, 'Domain', {
        domainName: 'foo.com',
        certificate: acm.Certificate.fromCertificateArn(stack, 'cert', 'arn:aws:acm:us-east-1:1111111:certificate/11-3336f1-44483d-adc7-9cd375c5169d'),
        mapping: api,
        basePath: 'v1/path',
      });

      // THEN
      expect(() => {
        domain.addApiMapping(api.deploymentStage, {
          basePath: 'v1/path',
        });
      }).toThrow(/DomainName Domain already has a mapping for path v1\/path/);
    });
  });

  test('"addBasePathMapping" can be used to add base path mapping to the domain', () => {
    // GIVEN
    const stack = new Stack();
    const api1 = new apigw.RestApi(stack, 'api1');
    const api2 = new apigw.RestApi(stack, 'api2');
    const domain = new apigw.DomainName(stack, 'my-domain', {
      domainName: 'example.com',
      certificate: acm.Certificate.fromCertificateArn(stack, 'cert', 'arn:aws:acm:us-east-1:1111111:certificate/11-3336f1-44483d-adc7-9cd375c5169d'),
      endpointType: apigw.EndpointType.REGIONAL,
    });
    api1.root.addMethod('GET');
    api2.root.addMethod('GET');

    // WHEN
    domain.addBasePathMapping(api1, { basePath: 'api1' });
    domain.addBasePathMapping(api2, { basePath: 'api2' });

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::BasePathMapping', {
      'DomainName': {
        'Ref': 'mydomain592C948B',
      },
      'BasePath': 'api1',
      'RestApiId': {
        'Ref': 'api1A91238E2',
      },
      'Stage': {
        'Ref': 'api1DeploymentStageprod362746F6',
      },
    });

    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::BasePathMapping', {
      'DomainName': {
        'Ref': 'mydomain592C948B',
      },
      'BasePath': 'api2',
      'RestApiId': {
        'Ref': 'api2C4850CEA',
      },
      'Stage': {
        'Ref': 'api2DeploymentStageprod4120D74E',
      },
    });
  });

  test('a domain name can be defined with the API', () => {
    // GIVEN
    const domainName = 'my.domain.com';
    const stack = new Stack();
    const certificate = new acm.Certificate(stack, 'cert', { domainName: 'my.domain.com' });

    // WHEN
    const api = new apigw.RestApi(stack, 'api', {
      domainName: { domainName, certificate },
    });

    api.root.addMethod('GET');

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::DomainName', {
      'DomainName': 'my.domain.com',
      'EndpointConfiguration': {
        'Types': [
          'REGIONAL',
        ],
      },
      'RegionalCertificateArn': {
        'Ref': 'cert56CA94EB',
      },
    });
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::BasePathMapping', {
      'DomainName': {
        'Ref': 'apiCustomDomain64773C4F',
      },
      'RestApiId': {
        'Ref': 'apiC8550315',
      },
      'Stage': {
        'Ref': 'apiDeploymentStageprod896C8101',
      },
    });
  });

  test('a domain name can be added later', () => {
    // GIVEN
    const domainName = 'my.domain.com';
    const stack = new Stack();
    const certificate = new acm.Certificate(stack, 'cert', { domainName: 'my.domain.com' });

    // WHEN
    const api = new apigw.RestApi(stack, 'api', {});

    api.root.addMethod('GET');

    api.addDomainName('domainId', { domainName, certificate });

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::DomainName', {
      'DomainName': domainName,
      'EndpointConfiguration': {
        'Types': [
          'REGIONAL',
        ],
      },
      'RegionalCertificateArn': {
        'Ref': 'cert56CA94EB',
      },
    });
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::BasePathMapping', {
      'DomainName': {
        'Ref': 'apidomainId102F8DAA',
      },
      'RestApiId': {
        'Ref': 'apiC8550315',
      },
      'Stage': {
        'Ref': 'apiDeploymentStageprod896C8101',
      },
    });
  });

  test('a base path can be defined when adding a domain name', () => {
    // GIVEN
    const domainName = 'my.domain.com';
    const basePath = 'users';
    const stack = new Stack();
    const certificate = new acm.Certificate(stack, 'cert', { domainName: 'my.domain.com' });

    // WHEN
    const api = new apigw.RestApi(stack, 'api', {});

    api.root.addMethod('GET');

    api.addDomainName('domainId', { domainName, certificate, basePath });

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::BasePathMapping', {
      'BasePath': 'users',
      'RestApiId': {
        'Ref': 'apiC8550315',
      },
    });
  });

  test('additional base paths can added if addDomainName was called with a non-empty base path', () => {
    // GIVEN
    const domainName = 'my.domain.com';
    const basePath = 'users';
    const stack = new Stack();
    const certificate = new acm.Certificate(stack, 'cert', { domainName: 'my.domain.com' });

    // WHEN
    const api = new apigw.RestApi(stack, 'api', {});

    api.root.addMethod('GET');

    const dn = api.addDomainName('domainId', { domainName, certificate, basePath });
    dn.addBasePathMapping(api, {
      basePath: 'books',
    });

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::BasePathMapping', {
      'BasePath': 'users',
      'RestApiId': {
        'Ref': 'apiC8550315',
      },
    });
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::BasePathMapping', {
      'BasePath': 'books',
      'RestApiId': {
        'Ref': 'apiC8550315',
      },
    });
  });

  test('domain name cannot contain uppercase letters', () => {
    // GIVEN
    const stack = new Stack();
    const certificate = new acm.Certificate(stack, 'cert', { domainName: 'someDomainWithUpercase.domain.com' });

    // WHEN & THEN
    expect(() => {
      new apigw.DomainName(stack, 'someDomain', { domainName: 'someDomainWithUpercase.domain.com', certificate });
    }).toThrow(/uppercase/);
  });

  test('multiple domain names can be added', () => {
    // GIVEN
    const domainName = 'my.domain.com';
    const stack = new Stack();
    const certificate = new acm.Certificate(stack, 'cert', { domainName: 'my.domain.com' });

    // WHEN
    const api = new apigw.RestApi(stack, 'api', {});

    api.root.addMethod('GET');

    const domainName1 = api.addDomainName('domainId', { domainName, certificate });
    api.addDomainName('domainId1', { domainName: 'your.domain.com', certificate });
    api.addDomainName('domainId2', { domainName: 'our.domain.com', certificate });

    expect(api.domainName).toEqual(domainName1);

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::DomainName', {
      'DomainName': 'my.domain.com',
      'EndpointConfiguration': {
        'Types': [
          'REGIONAL',
        ],
      },
      'RegionalCertificateArn': {
        'Ref': 'cert56CA94EB',
      },
    });
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::DomainName', {
      'DomainName': 'your.domain.com',
      'EndpointConfiguration': {
        'Types': [
          'REGIONAL',
        ],
      },
      'RegionalCertificateArn': {
        'Ref': 'cert56CA94EB',
      },
    });
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::DomainName', {
      'DomainName': 'our.domain.com',
      'EndpointConfiguration': {
        'Types': [
          'REGIONAL',
        ],
      },
      'RegionalCertificateArn': {
        'Ref': 'cert56CA94EB',
      },
    });
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::BasePathMapping', {
      'DomainName': {
        'Ref': 'apidomainId102F8DAA',
      },
      'RestApiId': {
        'Ref': 'apiC8550315',
      },
      'Stage': {
        'Ref': 'apiDeploymentStageprod896C8101',
      },
    });
  });

  test('"addBasePathMapping" can be used to add base path mapping to the domain with specific stage', () => {
    // GIVEN
    const stack = new Stack();
    const api1 = new apigw.RestApi(stack, 'api1');
    const api2 = new apigw.RestApi(stack, 'api2');
    const domain = new apigw.DomainName(stack, 'my-domain', {
      domainName: 'example.com',
      certificate: acm.Certificate.fromCertificateArn(stack, 'cert', 'arn:aws:acm:us-east-1:1111111:certificate/11-3336f1-44483d-adc7-9cd375c5169d'),
      endpointType: apigw.EndpointType.REGIONAL,
    });
    api1.root.addMethod('GET');
    api2.root.addMethod('GET');

    const testDeploy = new apigw.Deployment(stack, 'test-deployment', {
      api: api1,
    });

    const testStage = new apigw.Stage(stack, 'test-stage', {
      deployment: testDeploy,
    });

    // WHEN
    domain.addBasePathMapping(api1, { basePath: 'api1', stage: testStage });
    domain.addBasePathMapping(api2, { basePath: 'api2' });

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::BasePathMapping', {
      'DomainName': {
        'Ref': 'mydomain592C948B',
      },
      'BasePath': 'api1',
      'RestApiId': {
        'Ref': 'api1A91238E2',
      },
      'Stage': stack.resolve(testStage.stageName),
    });

    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::BasePathMapping', {
      'DomainName': {
        'Ref': 'mydomain592C948B',
      },
      'BasePath': 'api2',
      'RestApiId': {
        'Ref': 'api2C4850CEA',
      },
      'Stage': {
        'Ref': 'api2DeploymentStageprod4120D74E',
      },
    });
  });

  test('accepts a mutual TLS configuration', () => {
    const stack = new Stack();
    const bucket = Bucket.fromBucketName(stack, 'testBucket', 'example-bucket');
    new apigw.DomainName(stack, 'another-domain', {
      domainName: 'example.com',
      mtls: {
        bucket,
        key: 'someca.pem',
      },
      certificate: acm.Certificate.fromCertificateArn(stack, 'cert', 'arn:aws:acm:us-east-1:1111111:certificate/11-3336f1-44483d-adc7-9cd375c5169d'),
    });

    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::DomainName', {
      'DomainName': 'example.com',
      'EndpointConfiguration': { 'Types': ['REGIONAL'] },
      'RegionalCertificateArn': 'arn:aws:acm:us-east-1:1111111:certificate/11-3336f1-44483d-adc7-9cd375c5169d',
      'MutualTlsAuthentication': { 'TruststoreUri': 's3://example-bucket/someca.pem' },
    });
  });

  test('mTLS should allow versions to be set on the s3 bucket', () => {
    const stack = new Stack();
    const bucket = Bucket.fromBucketName(stack, 'testBucket', 'example-bucket');
    new apigw.DomainName(stack, 'another-domain', {
      domainName: 'example.com',
      certificate: acm.Certificate.fromCertificateArn(stack, 'cert2', 'arn:aws:acm:us-east-1:1111111:certificate/11-3336f1-44483d-adc7-9cd375c5169d'),
      mtls: {
        bucket,
        key: 'someca.pem',
        version: 'version',
      },
    });
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::DomainName', {
      'DomainName': 'example.com',
      'EndpointConfiguration': { 'Types': ['REGIONAL'] },
      'RegionalCertificateArn': 'arn:aws:acm:us-east-1:1111111:certificate/11-3336f1-44483d-adc7-9cd375c5169d',
      'MutualTlsAuthentication': { 'TruststoreUri': 's3://example-bucket/someca.pem', 'TruststoreVersion': 'version' },
    });
  });

  test('base path mapping configures stage for RestApi creation', () => {
    // GIVEN
    const stack = new Stack();
    new apigw.RestApi(stack, 'restApiWithStage', {
      domainName: {
        domainName: 'example.com',
        certificate: acm.Certificate.fromCertificateArn(stack, 'cert', 'arn:aws:acm:us-east-1:1111111:certificate/11-3336f1-44483d-adc7-9cd375c5169d'),
        endpointType: apigw.EndpointType.REGIONAL,
      },
    }).root.addMethod('GET');

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::BasePathMapping', {
      'DomainName': {
        'Ref': 'restApiWithStageCustomDomainC4749625',
      },
      'RestApiId': {
        'Ref': 'restApiWithStageD4F931D0',
      },
      'Stage': {
        'Ref': 'restApiWithStageDeploymentStageprodC82A6648',
      },
    });
  });

  test('base path mapping configures stage for SpecRestApi creation', () => {
    // GIVEN
    const stack = new Stack();

    const definition = {
      key1: 'val1',
    };

    new apigw.SpecRestApi(stack, 'specRestApiWithStage', {
      apiDefinition: apigw.ApiDefinition.fromInline(definition),
      domainName: {
        domainName: 'example.com',
        certificate: acm.Certificate.fromCertificateArn(stack, 'cert', 'arn:aws:acm:us-east-1:1111111:certificate/11-3336f1-44483d-adc7-9cd375c5169d'),
        endpointType: apigw.EndpointType.REGIONAL,
      },
    }).root.addMethod('GET');

    // THEN
    Template.fromStack(stack).hasResourceProperties('AWS::ApiGateway::BasePathMapping', {
      'DomainName': {
        'Ref': 'specRestApiWithStageCustomDomain8A36A5C9',
      },
      'RestApiId': {
        'Ref': 'specRestApiWithStageC1492575',
      },
      'Stage': {
        'Ref': 'specRestApiWithStageDeploymentStageprod2D3037ED',
      },
    });
  });
});
