import vpcLatticeInterceptor from '../src/vpc-lattice-interceptor';
import { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';

jest.mock('@aws-sdk/credential-providers', () => ({
  fromNodeProviderChain: jest.fn().mockReturnValue(
    jest.fn().mockResolvedValue({
      accessKeyId: 'the-accessKeyId',
      secretAccessKey: 'the-secretAccessKey',
    }),
  ),
}));

jest.mock('@smithy/signature-v4', () => ({
  SignatureV4: jest.fn().mockReturnValue({
    sign: jest.fn().mockResolvedValue({
      method: 'GET',
      headers: {
        Authorization: 'Bearer mockToken',
      },
    }),
  }),
}));

describe('vpc lattice interceptor', () => {
  let requestConfig: InternalAxiosRequestConfig;

  beforeEach(() => {
    requestConfig = {
      method: 'GET',
      baseURL: 'https://example.com',
      url: 'api/resource?firstQueryParam=valueOne&secondQueryParam=valueTwo',
      headers: new AxiosHeaders({
        'my-header': 'my-header-value',
      }),
    };
  });

  test('should retrieve the credentials from the node provider chain credential provider', async () => {
    const credentialProvider = fromNodeProviderChain();
    await vpcLatticeInterceptor(requestConfig);
    expect(credentialProvider).toHaveBeenCalled();
  });

  test('should create a v4 signature', async () => {
    await vpcLatticeInterceptor(requestConfig);
    expect(SignatureV4).toHaveBeenCalledWith({
      service: 'vpc-lattice-svcs',
      region: 'eu-west-1',
      credentials: { accessKeyId: 'the-accessKeyId', secretAccessKey: 'the-secretAccessKey' },
      sha256: Sha256,
    });
  });

  test('should sign the request', async () => {
    await vpcLatticeInterceptor(requestConfig);
    expect(
      new SignatureV4({
        service: 'vpc-lattice-svcs',
        region: 'eu-west-1',
        credentials: { accessKeyId: 'the-accessKeyId', secretAccessKey: 'the-secretAccessKey' },
        sha256: Sha256,
      }).sign,
    ).toHaveBeenCalledWith({
      method: 'GET',
      query: {
        firstQueryParam: 'valueOne',
        secondQueryParam: 'valueTwo',
      },
      hostname: 'example.com',
      path: '/api/resource',
      protocol: 'https:',
      headers: {
        host: 'example.com',
        'my-header': 'my-header-value',
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      },
    });
  });

  test('should resolve with the signed request config', async () => {
    const actualSignedRequestConfig = await vpcLatticeInterceptor(requestConfig);
    expect(actualSignedRequestConfig).toEqual({
      ...requestConfig,
      headers: requestConfig.headers.set('Authorization', 'Bearer mockToken'),
    });
  });
});
