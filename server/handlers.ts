interface ApiResult {
  status: number
  body: Record<string, unknown>
}

export async function handleApiRequest(
  url: string,
  method: string,
  params: Record<string, unknown>,
): Promise<ApiResult> {
  if (method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } }
  }

  try {
    if (url === '/api/auth/linkedin/token') return await handleLinkedInToken(params)
    if (url === '/api/auth/x/token') return await handleXToken(params)
    if (url === '/api/post/linkedin') return await handleLinkedInPost(params)
    if (url === '/api/post/x') return await handleXPost(params)
    if (url === '/api/user/linkedin') return await handleLinkedInUser(params)
    if (url === '/api/user/x') return await handleXUser(params)
  } catch (err) {
    return { status: 500, body: { error: String(err) } }
  }

  return { status: 404, body: { error: 'Not found' } }
}

// --- LinkedIn ---

async function handleLinkedInToken(params: Record<string, unknown>): Promise<ApiResult> {
  const { code, clientId, clientSecret, redirectUri } = params as {
    code: string
    clientId: string
    clientSecret: string
    redirectUri: string
  }

  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  })

  const data = (await res.json()) as Record<string, unknown>

  if (data.access_token) {
    return {
      status: 200,
      body: {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        refreshToken: data.refresh_token,
      },
    }
  }

  return {
    status: 400,
    body: { error: String(data.error_description || data.error || 'LinkedIn token exchange failed') },
  }
}

async function handleLinkedInUser(params: Record<string, unknown>): Promise<ApiResult> {
  const { accessToken } = params as { accessToken: string }

  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const data = (await res.json()) as Record<string, unknown>

  if (data.sub) {
    return {
      status: 200,
      body: {
        userId: data.sub,
        displayName: String(data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim() || 'LinkedIn User'),
        profileUrl: data.picture ? undefined : undefined,
      },
    }
  }

  return { status: 400, body: { error: 'Failed to fetch LinkedIn profile' } }
}

async function handleLinkedInPost(params: Record<string, unknown>): Promise<ApiResult> {
  const { accessToken, text } = params as { accessToken: string; text: string }

  // Get person URN
  const meRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const me = (await meRes.json()) as Record<string, unknown>

  if (!me.sub) {
    return { status: 400, body: { error: 'Failed to get LinkedIn user info' } }
  }

  // Create post via Posts API
  const postRes = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202601',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${me.sub}`,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  })

  if (postRes.status === 201 || postRes.status === 200) {
    const postId = postRes.headers.get('x-restli-id') || 'created'
    return { status: 200, body: { id: postId } }
  }

  const errorData = (await postRes.json().catch(() => ({}))) as Record<string, unknown>
  return {
    status: 400,
    body: { error: String(errorData.message || `LinkedIn API error: ${postRes.status}`) },
  }
}

// --- X (Twitter) ---

async function handleXToken(params: Record<string, unknown>): Promise<ApiResult> {
  const { code, clientId, clientSecret, redirectUri, codeVerifier } = params as {
    code: string
    clientId: string
    clientSecret: string
    redirectUri: string
    codeVerifier?: string
  }

  const bodyParams: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
  }
  if (codeVerifier) bodyParams.code_verifier = codeVerifier

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams(bodyParams),
  })

  const text = await res.text()
  let data: Record<string, unknown>
  try {
    data = JSON.parse(text)
  } catch {
    return { status: 400, body: { error: `X token endpoint returned non-JSON (${res.status}): ${text.slice(0, 200)}` } }
  }

  if (data.access_token) {
    return {
      status: 200,
      body: {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
        refreshToken: data.refresh_token,
      },
    }
  }

  return {
    status: 400,
    body: { error: String(data.error_description || data.error || `X token exchange failed (${res.status})`) },
  }
}

async function handleXUser(params: Record<string, unknown>): Promise<ApiResult> {
  const { accessToken } = params as { accessToken: string }

  const res = await fetch(
    'https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  const text = await res.text()
  let data: Record<string, unknown>
  try {
    data = JSON.parse(text)
  } catch {
    return { status: 400, body: { error: `X API returned non-JSON (${res.status}): ${text.slice(0, 200)}` } }
  }

  if (!res.ok) {
    const detail = data.detail ?? data.error_description ?? data.error ?? data.title ?? text.slice(0, 200)
    return { status: res.status, body: { error: `X API error (${res.status}): ${detail}` } }
  }

  if (data.data) {
    const userData = data.data as Record<string, unknown>
    return {
      status: 200,
      body: {
        userId: userData.id,
        displayName: `@${userData.username}`,
        profileUrl: `https://x.com/${userData.username}`,
      },
    }
  }

  return { status: 400, body: { error: `Unexpected X API response: ${JSON.stringify(data).slice(0, 300)}` } }
}

async function handleXPost(params: Record<string, unknown>): Promise<ApiResult> {
  const { accessToken, text } = params as { accessToken: string; text: string }

  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  const data = (await res.json()) as Record<string, unknown>

  if (data.data) {
    const tweetData = data.data as Record<string, unknown>
    return { status: 200, body: { id: tweetData.id } }
  }

  const errors = data.errors as Array<Record<string, string>> | undefined
  return {
    status: 400,
    body: {
      error: String(data.detail || errors?.[0]?.message || `X API error: ${res.status}`),
    },
  }
}
