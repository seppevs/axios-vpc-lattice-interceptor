import { AxiosHeaderValue, InternalAxiosRequestConfig } from 'axios';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';

export default async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
  const requestUrl = new URL(config.baseURL + '/' + config.url);

  const query: Record<string, string> = { ...config.params };
  for (const [key, value] of requestUrl.searchParams.entries()) {
    query[key] = value;
  }

  const headers: Record<string, AxiosHeaderValue> = {};
  for (const [key, value] of config.headers) {
    headers[key] = value;
  }

  const credentialProvider = fromNodeProviderChain();
  const credentials = await credentialProvider();
  const sigv4 = new SignatureV4({
    service: 'vpc-lattice-svcs',
    region: 'eu-west-1',
    credentials,
    sha256: Sha256,
  });
  const signedRequest = await sigv4.sign({
    method: config.method!.toUpperCase(),
    query,
    hostname: requestUrl.host,
    path: requestUrl.pathname,
    protocol: requestUrl.protocol!,
    headers: {
      ...headers,
      host: requestUrl.hostname!,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    },
  });

  for (const key of Object.keys(signedRequest.headers)) {
    config.headers.set(key, signedRequest.headers[key]);
  }

  return config;
};
