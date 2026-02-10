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
    // LinkedIn
    if (url === '/api/auth/linkedin/token') return await handleLinkedInToken(params)
    if (url === '/api/user/linkedin') return await handleLinkedInUser(params)
    if (url === '/api/post/linkedin') return await handleLinkedInPost(params)
    // X (Twitter)
    if (url === '/api/auth/x/token') return await handleXToken(params)
    if (url === '/api/user/x') return await handleXUser(params)
    if (url === '/api/post/x') return await handleXPost(params)
    // Facebook
    if (url === '/api/auth/facebook/token') return await handleFacebookToken(params)
    if (url === '/api/user/facebook') return await handleFacebookUser(params)
    if (url === '/api/post/facebook') return await handleFacebookPost(params)
    // Instagram
    if (url === '/api/auth/instagram/token') return await handleInstagramToken(params)
    if (url === '/api/user/instagram') return await handleInstagramUser(params)
    if (url === '/api/post/instagram') return await handleInstagramPost(params)
    // TikTok
    if (url === '/api/auth/tiktok/token') return await handleTikTokToken(params)
    if (url === '/api/user/tiktok') return await handleTikTokUser(params)
    if (url === '/api/post/tiktok') return await handleTikTokPost(params)
  } catch (err) {
    return { status: 500, body: { error: String(err) } }
  }

  return { status: 404, body: { error: 'Not found' } }
}

// --- Helper: safe JSON parse from response ---

async function safeJson(res: Response): Promise<{ ok: boolean; status: number; data: Record<string, unknown>; raw: string }> {
  const raw = await res.text()
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(raw), raw }
  } catch {
    return { ok: res.ok, status: res.status, data: {}, raw }
  }
}

function apiError(label: string, res: { status: number; data: Record<string, unknown>; raw: string }): ApiResult {
  const detail = res.data.error_description ?? res.data.error ?? res.data.message ?? res.data.detail ?? res.raw.slice(0, 300)
  return { status: res.status, body: { error: `${label} (${res.status}): ${detail}` } }
}

// ============================================================
// LinkedIn
// ============================================================

async function handleLinkedInToken(params: Record<string, unknown>): Promise<ApiResult> {
  const { code, clientId, clientSecret, redirectUri } = params as {
    code: string; clientId: string; clientSecret: string; redirectUri: string
  }

  const res = await safeJson(await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', code, client_id: clientId,
      client_secret: clientSecret, redirect_uri: redirectUri,
    }),
  }))

  if (res.data.access_token) {
    return { status: 200, body: { accessToken: res.data.access_token, expiresIn: res.data.expires_in, refreshToken: res.data.refresh_token } }
  }
  return apiError('LinkedIn token exchange failed', res)
}

async function handleLinkedInUser(params: Record<string, unknown>): Promise<ApiResult> {
  const { accessToken } = params as { accessToken: string }
  const res = await safeJson(await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  }))
  if (res.data.sub) {
    return { status: 200, body: {
      userId: res.data.sub,
      displayName: String(res.data.name || `${res.data.given_name || ''} ${res.data.family_name || ''}`.trim() || 'LinkedIn User'),
    }}
  }
  return apiError('Failed to fetch LinkedIn profile', res)
}

async function handleLinkedInPost(params: Record<string, unknown>): Promise<ApiResult> {
  const { accessToken, text } = params as { accessToken: string; text: string }

  const meRes = await safeJson(await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  }))
  if (!meRes.data.sub) return apiError('Failed to get LinkedIn user info', meRes)

  const postRes = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json',
      'LinkedIn-Version': '202601', 'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${meRes.data.sub}`, commentary: text,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false,
    }),
  })

  if (postRes.status === 201 || postRes.status === 200) {
    return { status: 200, body: { id: postRes.headers.get('x-restli-id') || 'created' } }
  }
  const errRes = await safeJson(postRes)
  return apiError('LinkedIn post failed', errRes)
}

// ============================================================
// X (Twitter)
// ============================================================

async function handleXToken(params: Record<string, unknown>): Promise<ApiResult> {
  const { code, clientId, clientSecret, redirectUri, codeVerifier } = params as {
    code: string; clientId: string; clientSecret: string; redirectUri: string; codeVerifier?: string
  }

  const bodyParams: Record<string, string> = {
    grant_type: 'authorization_code', code, client_id: clientId, redirect_uri: redirectUri,
  }
  if (codeVerifier) bodyParams.code_verifier = codeVerifier

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await safeJson(await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basicAuth}` },
    body: new URLSearchParams(bodyParams),
  }))

  if (res.data.access_token) {
    return { status: 200, body: { accessToken: res.data.access_token, expiresIn: res.data.expires_in, refreshToken: res.data.refresh_token } }
  }
  return apiError('X token exchange failed', res)
}

async function handleXUser(params: Record<string, unknown>): Promise<ApiResult> {
  const { accessToken } = params as { accessToken: string }
  const res = await safeJson(await fetch(
    'https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  ))
  if (!res.ok) return apiError('X API error', res)
  if (res.data.data) {
    const u = res.data.data as Record<string, unknown>
    return { status: 200, body: { userId: u.id, displayName: `@${u.username}`, profileUrl: `https://x.com/${u.username}` } }
  }
  return apiError('Unexpected X API response', res)
}

async function handleXPost(params: Record<string, unknown>): Promise<ApiResult> {
  const { accessToken, text } = params as { accessToken: string; text: string }
  const res = await safeJson(await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }))
  if (res.data.data) {
    const t = res.data.data as Record<string, unknown>
    return { status: 200, body: { id: t.id } }
  }
  return apiError('X post failed', res)
}

// ============================================================
// Facebook
// ============================================================

async function handleFacebookToken(params: Record<string, unknown>): Promise<ApiResult> {
  const { code, clientId, clientSecret, redirectUri } = params as {
    code: string; clientId: string; clientSecret: string; redirectUri: string
  }

  const res = await safeJson(await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, code,
    })}`,
  ))

  if (res.data.access_token) {
    return { status: 200, body: { accessToken: res.data.access_token, expiresIn: res.data.expires_in } }
  }
  return apiError('Facebook token exchange failed', res)
}

async function handleFacebookUser(params: Record<string, unknown>): Promise<ApiResult> {
  const { accessToken } = params as { accessToken: string }

  // Get user info
  const userRes = await safeJson(await fetch(
    `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(accessToken as string)}`,
  ))
  if (!userRes.ok) return apiError('Facebook user fetch failed', userRes)

  // Get pages the user manages
  const pagesRes = await safeJson(await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(accessToken as string)}`,
  ))

  const pages = (pagesRes.data.data ?? []) as Array<Record<string, unknown>>
  const pageName = pages.length > 0 ? ` (Page: ${pages[0].name})` : ''

  return {
    status: 200,
    body: {
      userId: userRes.data.id,
      displayName: `${userRes.data.name}${pageName}`,
      profileUrl: `https://facebook.com/${userRes.data.id}`,
    },
  }
}

async function handleFacebookPost(params: Record<string, unknown>): Promise<ApiResult> {
  const { accessToken, text } = params as { accessToken: string; text: string }

  // Get user's pages (need page access token to post)
  const pagesRes = await safeJson(await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(accessToken)}`,
  ))

  const pages = (pagesRes.data.data ?? []) as Array<Record<string, unknown>>
  if (pages.length === 0) {
    return { status: 400, body: { error: 'No Facebook Pages found. The Facebook API posts to Pages, not personal profiles. Create a Page first.' } }
  }

  // Post to the first page
  const page = pages[0]
  const postRes = await safeJson(await fetch(
    `https://graph.facebook.com/v21.0/${page.id}/feed`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, access_token: page.access_token }),
    },
  ))

  if (postRes.data.id) {
    return { status: 200, body: { id: postRes.data.id } }
  }
  return apiError('Facebook post failed', postRes)
}

// ============================================================
// Instagram
// ============================================================

async function handleInstagramToken(params: Record<string, unknown>): Promise<ApiResult> {
  // Instagram uses the same Facebook OAuth flow
  return handleFacebookToken(params)
}

async function handleInstagramUser(params: Record<string, unknown>): Promise<ApiResult> {
  const { accessToken } = params as { accessToken: string }

  // Get pages, then find linked Instagram account
  const pagesRes = await safeJson(await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account&access_token=${encodeURIComponent(accessToken)}`,
  ))

  const pages = (pagesRes.data.data ?? []) as Array<Record<string, unknown>>
  for (const page of pages) {
    const igAccount = page.instagram_business_account as Record<string, unknown> | undefined
    if (igAccount?.id) {
      // Get IG username
      const igRes = await safeJson(await fetch(
        `https://graph.facebook.com/v21.0/${igAccount.id}?fields=id,username,name&access_token=${encodeURIComponent(accessToken)}`,
      ))
      if (igRes.data.username) {
        return {
          status: 200,
          body: {
            userId: igRes.data.id,
            displayName: `@${igRes.data.username}`,
            profileUrl: `https://instagram.com/${igRes.data.username}`,
          },
        }
      }
    }
  }

  return { status: 400, body: { error: 'No Instagram Business account found linked to your Facebook Pages. Make sure your Instagram account is a Business or Creator account and is linked to a Facebook Page.' } }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleInstagramPost(_params: Record<string, unknown>): Promise<ApiResult> {
  // Instagram API requires media (image_url or video_url) for every post.
  // Text-only posts are not supported by the Instagram Graph API.
  return {
    status: 400,
    body: { error: 'Instagram requires media (photo or video) for every post. Text-only posts are not supported. Media upload support is coming in a future update.' },
  }
}

// ============================================================
// TikTok
// ============================================================

async function handleTikTokToken(params: Record<string, unknown>): Promise<ApiResult> {
  const { code, clientId, clientSecret, redirectUri, codeVerifier } = params as {
    code: string; clientId: string; clientSecret: string; redirectUri: string; codeVerifier?: string
  }

  const bodyParams: Record<string, string> = {
    grant_type: 'authorization_code',
    client_key: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  }
  if (codeVerifier) bodyParams.code_verifier = codeVerifier

  const res = await safeJson(await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(bodyParams),
  }))

  if (res.data.access_token) {
    return { status: 200, body: { accessToken: res.data.access_token, expiresIn: res.data.expires_in, refreshToken: res.data.refresh_token } }
  }
  return apiError('TikTok token exchange failed', res)
}

async function handleTikTokUser(params: Record<string, unknown>): Promise<ApiResult> {
  const { accessToken } = params as { accessToken: string }

  const res = await safeJson(await fetch(
    'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,username',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  ))

  const userData = res.data.data as Record<string, unknown> | undefined
  const user = userData?.user as Record<string, unknown> | undefined
  if (user?.open_id) {
    const username = user.username || user.display_name || 'TikTok User'
    return {
      status: 200,
      body: {
        userId: user.open_id,
        displayName: `@${username}`,
        profileUrl: user.username ? `https://www.tiktok.com/@${user.username}` : undefined,
      },
    }
  }
  return apiError('Failed to fetch TikTok profile', res)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleTikTokPost(_params: Record<string, unknown>): Promise<ApiResult> {
  // TikTok Content Posting API requires video or photo content.
  // Text-only posts are not supported.
  return {
    status: 400,
    body: { error: 'TikTok requires video or photo content for every post. Text-only posts are not supported. Media upload support is coming in a future update.' },
  }
}
