import { URLSearchParams } from 'url'

import superagent from 'superagent'

import type TokenStore from './tokenStore/tokenStore'
import logger from '../logger'
import config from '../config'
import generateOauthClientToken from '../authentication/clientCredentials'
import RestClient from './restClient'

const timeoutSpec = config.apis.auth.timeout
const authUrl = config.apis.auth.url

function getSystemClientTokenFromKeycloak(username?: string): Promise<superagent.Response> {
  const clientToken = generateOauthClientToken(
    config.apis.auth.systemClientId,
    config.apis.auth.systemClientSecret,
  )

  const grantRequest = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'openid',
    ...(username && { username }),
  }).toString()

  console.info(`${grantRequest} Auth request for client id '${config.apis.auth.systemClientId}''`)

  return superagent
    .post(`${authUrl}/realms/prm/protocol/openid-connect/token`)
    .set('Authorization', clientToken)
    .set('content-type', 'application/x-www-form-urlencoded')
    .send(grantRequest)
    .timeout(timeoutSpec)
}

export default class AuthClient {
  constructor(private readonly tokenStore: TokenStore) {}

  private static restClient(token: string): RestClient {
    return new RestClient('Auth Client', config.apis.auth, token)
  }

  async getSystemClientToken(username?: string): Promise<string> {
    const key = username || '%ANONYMOUS%'

    const token = await this.tokenStore.getToken(key)
    if (token) {
      return token
    }

    const newToken = await getSystemClientTokenFromKeycloak(username)

    // set TTL slightly less than expiry of token. Async but no need to wait
    await this.tokenStore.setToken(key, newToken.body.access_token, newToken.body.expires_in - 60)

    return newToken.body.access_token
  }
}