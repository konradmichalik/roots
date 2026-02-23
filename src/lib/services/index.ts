import type { MocoConnectionConfig } from './moco/types';
import type { JiraConnectionConfig } from './jira/types';
import type { OutlookConnectionConfig, OAuthTokens } from './outlook/types';
import type { PersonioConnectionConfig, PersonioAuthToken } from './personio/types';
import { MocoClient, type MocoClientConfig } from './moco/client';
import { JiraCloudWorklogClient } from './jira/cloud-client';
import { JiraServerWorklogClient } from './jira/server-client';
import type { JiraWorklogClient } from './jira/client';
import { OutlookClient } from './outlook/client';
import { PersonioClient } from './personio/client';

export { MocoClient } from './moco';
export { JiraWorklogClient, type WorklogWithIssue } from './jira';
export { OutlookClient } from './outlook';
export { PersonioClient } from './personio';

const PROXY_BASE = 'http://localhost:3002';

export function createMocoClient(config: MocoConnectionConfig, proxyUrl?: string): MocoClient {
  const clientConfig: MocoClientConfig = {
    baseUrl: `https://${config.domain}.mocoapp.com/api/v1`,
    proxyUrl,
    apiKey: config.apiKey,
    domain: config.domain
  };
  return new MocoClient(clientConfig);
}

export function createJiraWorklogClient(config: JiraConnectionConfig): JiraWorklogClient {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const proxyUrl = config.proxyUrl || `${PROXY_BASE}/jira`;

  if (config.instanceType === 'cloud' && config.credentials.type === 'cloud') {
    return new JiraCloudWorklogClient({
      baseUrl,
      proxyUrl,
      instanceType: 'cloud',
      email: config.credentials.email,
      apiToken: config.credentials.apiToken
    });
  }

  const creds = config.credentials.type === 'server' ? config.credentials : undefined;
  return new JiraServerWorklogClient({
    baseUrl,
    proxyUrl,
    instanceType: 'server',
    authMethod: creds?.authMethod ?? 'pat',
    username: creds?.username,
    password: creds?.password,
    personalAccessToken: creds?.personalAccessToken
  });
}

export function createOutlookClient(
  config: OutlookConnectionConfig,
  tokens: OAuthTokens,
  onTokensRefreshed?: (tokens: OAuthTokens) => void
): OutlookClient {
  return new OutlookClient(config, tokens, onTokensRefreshed);
}

export function createPersonioClient(
  config: PersonioConnectionConfig,
  storedToken?: PersonioAuthToken,
  onTokenRefreshed?: (token: PersonioAuthToken) => void
): PersonioClient {
  return new PersonioClient(config, storedToken, onTokenRefreshed);
}
