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

function parseDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string; base64Data: string } {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/)
  if (!match) throw new Error('Invalid data URL')
  return { buffer: Buffer.from(match[2], 'base64'), mimeType: match[1], base64Data: match[2] }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
  const { accessToken, text, image, video } = params as { accessToken: string; text: string; image?: string; video?: string }

  const meRes = await safeJson(await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  }))
  if (!meRes.data.sub) return apiError('Failed to get LinkedIn user info', meRes)

  const personUrn = `urn:li:person:${meRes.data.sub}`
  let content: Record<string, unknown> | undefined

  if (video) {
    // Initialize video upload
    const { buffer, mimeType } = parseDataUrl(video)
    const initRes = await safeJson(await fetch('https://api.linkedin.com/rest/videos?action=initializeUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json',
        'LinkedIn-Version': '202601',
      },
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: personUrn,
          fileSizeBytes: buffer.length,
          uploadCaptions: false,
          uploadProtocol: 'SINGLE_REQUEST_UPLOAD',
        },
      }),
    }))

    const uploadData = initRes.data.value as Record<string, unknown> | undefined
    const uploadInstructions = uploadData?.uploadInstructions as Array<Record<string, unknown>> | undefined
    const uploadUrl = uploadInstructions?.[0]?.uploadUrl as string | undefined
    if (!uploadUrl || !uploadData?.video) {
      return apiError('LinkedIn video upload initialization failed', initRes)
    }

    // Upload binary
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType, Authorization: `Bearer ${accessToken}` },
      body: buffer,
    })
    if (!uploadRes.ok) {
      return { status: uploadRes.status, body: { error: `LinkedIn video upload failed (${uploadRes.status})` } }
    }

    content = { media: { id: uploadData.video } }
  } else if (image) {
    // Initialize image upload
    const initRes = await safeJson(await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json',
        'LinkedIn-Version': '202601',
      },
      body: JSON.stringify({ initializeUploadRequest: { owner: personUrn } }),
    }))

    const uploadData = initRes.data.value as Record<string, unknown> | undefined
    if (!uploadData?.uploadUrl || !uploadData?.image) {
      return apiError('LinkedIn image upload initialization failed', initRes)
    }

    // Upload binary
    const { buffer, mimeType } = parseDataUrl(image)
    const uploadRes = await fetch(uploadData.uploadUrl as string, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType, Authorization: `Bearer ${accessToken}` },
      body: buffer,
    })
    if (!uploadRes.ok) {
      return { status: uploadRes.status, body: { error: `LinkedIn image upload failed (${uploadRes.status})` } }
    }

    content = { media: { title: 'Image', id: uploadData.image } }
  }

  const postBody: Record<string, unknown> = {
    author: personUrn, commentary: text,
    visibility: 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false,
  }
  if (content) postBody.content = content

  const postRes = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json',
      'LinkedIn-Version': '202601', 'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postBody),
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
  const { accessToken, text, image, video } = params as { accessToken: string; text: string; image?: string; video?: string }

  let mediaId: string | undefined

  if (video) {
    // Chunked video upload
    const { buffer } = parseDataUrl(video)

    // INIT
    const initRes = await safeJson(await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        command: 'INIT',
        media_type: 'video/mp4',
        total_bytes: String(buffer.length),
        media_category: 'tweet_video',
      }),
    }))
    if (!initRes.data.media_id_string) {
      return apiError('X video upload INIT failed', initRes)
    }
    const videoMediaId = initRes.data.media_id_string as string

    // APPEND — single segment
    const appendForm = new FormData()
    appendForm.append('command', 'APPEND')
    appendForm.append('media_id', videoMediaId)
    appendForm.append('segment_index', '0')
    appendForm.append('media_data', buffer.toString('base64'))

    const appendRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: appendForm,
    })
    if (!appendRes.ok) {
      const errRes = await safeJson(appendRes)
      return apiError('X video upload APPEND failed', errRes)
    }

    // FINALIZE
    const finalizeRes = await safeJson(await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ command: 'FINALIZE', media_id: videoMediaId }),
    }))
    if (!finalizeRes.data.media_id_string) {
      return apiError('X video upload FINALIZE failed', finalizeRes)
    }

    // Poll STATUS until processing is complete
    const processingInfo = finalizeRes.data.processing_info as Record<string, unknown> | undefined
    if (processingInfo) {
      let state = processingInfo.state as string
      let checkAfterSecs = (processingInfo.check_after_secs as number) ?? 5
      const maxAttempts = 60
      let attempts = 0
      while (state !== 'succeeded' && state !== 'failed' && attempts < maxAttempts) {
        await sleep(checkAfterSecs * 1000)
        const statusRes = await safeJson(await fetch(
          `https://upload.twitter.com/1.1/media/upload.json?command=STATUS&media_id=${videoMediaId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        ))
        const info = statusRes.data.processing_info as Record<string, unknown> | undefined
        if (!info) break
        state = info.state as string
        checkAfterSecs = (info.check_after_secs as number) ?? 5
        attempts++
      }
      if (state === 'failed') {
        return { status: 500, body: { error: 'X video processing failed' } }
      }
    }

    mediaId = videoMediaId
  } else if (image) {
    const { base64Data } = parseDataUrl(image)
    const uploadRes = await safeJson(await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ media_data: base64Data }),
    }))
    if (uploadRes.data.media_id_string) {
      mediaId = uploadRes.data.media_id_string as string
    } else {
      return apiError('X media upload failed', uploadRes)
    }
  }

  const tweetBody: Record<string, unknown> = { text }
  if (mediaId) tweetBody.media = { media_ids: [mediaId] }

  const res = await safeJson(await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(tweetBody),
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
  const { accessToken, text, image, video } = params as { accessToken: string; text: string; image?: string; video?: string }

  // Get user's pages (need page access token to post)
  const pagesRes = await safeJson(await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(accessToken)}`,
  ))

  const pages = (pagesRes.data.data ?? []) as Array<Record<string, unknown>>
  if (pages.length === 0) {
    return { status: 400, body: { error: 'No Facebook Pages found. The Facebook API posts to Pages, not personal profiles. Create a Page first.' } }
  }

  const page = pages[0]

  if (video) {
    // Post video to the page
    const { buffer, mimeType } = parseDataUrl(video)
    const form = new FormData()
    form.append('source', new Blob([buffer], { type: mimeType }), 'video.mp4')
    form.append('description', text)
    form.append('access_token', page.access_token as string)

    const postRes = await safeJson(await fetch(
      `https://graph-video.facebook.com/v21.0/${page.id}/videos`,
      { method: 'POST', body: form },
    ))
    if (postRes.data.id) {
      return { status: 200, body: { id: postRes.data.id } }
    }
    return apiError('Facebook video post failed', postRes)
  }

  if (image) {
    // Post photo to the page
    const { buffer, mimeType } = parseDataUrl(image)
    const form = new FormData()
    form.append('source', new Blob([buffer], { type: mimeType }), 'image.jpg')
    form.append('caption', text)
    form.append('access_token', page.access_token as string)

    const postRes = await safeJson(await fetch(
      `https://graph.facebook.com/v21.0/${page.id}/photos`,
      { method: 'POST', body: form },
    ))
    if (postRes.data.id) {
      return { status: 200, body: { id: postRes.data.id } }
    }
    return apiError('Facebook photo post failed', postRes)
  }

  // Text-only post
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

async function handleInstagramPost(params: Record<string, unknown>): Promise<ApiResult> {
  const { accessToken, text, image, video } = params as { accessToken: string; text: string; image?: string; video?: string }

  if (!image && !video) {
    return { status: 400, body: { error: 'Instagram requires a photo or video for every post. Text-only posts are not supported.' } }
  }

  // Find the linked Instagram business account via Facebook Pages
  const pagesRes = await safeJson(await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(accessToken)}`,
  ))

  const pages = (pagesRes.data.data ?? []) as Array<Record<string, unknown>>
  let igAccountId: string | undefined
  let pageAccessToken: string | undefined
  for (const page of pages) {
    const igAccount = page.instagram_business_account as Record<string, unknown> | undefined
    if (igAccount?.id) {
      igAccountId = igAccount.id as string
      pageAccessToken = page.access_token as string
      break
    }
  }

  if (!igAccountId || !pageAccessToken) {
    return { status: 400, body: { error: 'No Instagram Business account found linked to your Facebook Pages.' } }
  }

  if (video) {
    // Upload video to Facebook Page (unpublished) to host it
    const { buffer, mimeType } = parseDataUrl(video)
    const form = new FormData()
    form.append('source', new Blob([buffer], { type: mimeType }), 'video.mp4')
    form.append('published', 'false')
    form.append('access_token', pageAccessToken)

    const videoRes = await safeJson(await fetch(
      `https://graph-video.facebook.com/v21.0/${pages[0].id}/videos`,
      { method: 'POST', body: form },
    ))

    if (!videoRes.data.id) {
      return apiError('Failed to upload video for Instagram', videoRes)
    }

    // Get the hosted video URL
    const videoDetailRes = await safeJson(await fetch(
      `https://graph.facebook.com/v21.0/${videoRes.data.id}?fields=source&access_token=${encodeURIComponent(pageAccessToken)}`,
    ))

    const videoUrl = videoDetailRes.data.source as string | undefined
    if (!videoUrl) {
      return { status: 500, body: { error: 'Failed to retrieve hosted video URL from Facebook.' } }
    }

    // Create Instagram media container as Reels
    const containerRes = await safeJson(await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_type: 'REELS', video_url: videoUrl, caption: text, access_token: pageAccessToken }),
      },
    ))

    if (!containerRes.data.id) {
      return apiError('Instagram video container creation failed', containerRes)
    }

    const containerId = containerRes.data.id as string

    // Poll container status until FINISHED
    const maxAttempts = 60
    let attempts = 0
    let statusCode = ''
    while (statusCode !== 'FINISHED' && statusCode !== 'ERROR' && attempts < maxAttempts) {
      await sleep(3000)
      const statusRes = await safeJson(await fetch(
        `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${encodeURIComponent(pageAccessToken)}`,
      ))
      statusCode = (statusRes.data.status_code as string) ?? ''
      attempts++
    }

    if (statusCode === 'ERROR') {
      return { status: 500, body: { error: 'Instagram video container processing failed' } }
    }
    if (statusCode !== 'FINISHED') {
      return { status: 500, body: { error: 'Instagram video container processing timed out' } }
    }

    // Publish the container
    const publishRes = await safeJson(await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: containerId, access_token: pageAccessToken }),
      },
    ))

    if (publishRes.data.id) {
      return { status: 200, body: { id: publishRes.data.id } }
    }
    return apiError('Instagram video publish failed', publishRes)
  }

  // Image flow
  // Upload image to Facebook Page (unpublished) to get a hosted URL
  const { buffer, mimeType } = parseDataUrl(image!)
  const form = new FormData()
  form.append('source', new Blob([buffer], { type: mimeType }), 'image.jpg')
  form.append('published', 'false')
  form.append('access_token', pageAccessToken)

  const photoRes = await safeJson(await fetch(
    `https://graph.facebook.com/v21.0/${pages[0].id}/photos`,
    { method: 'POST', body: form },
  ))

  if (!photoRes.data.id) {
    return apiError('Failed to upload image for Instagram', photoRes)
  }

  // Get the hosted image URL from the uploaded photo
  const photoDetailRes = await safeJson(await fetch(
    `https://graph.facebook.com/v21.0/${photoRes.data.id}?fields=images&access_token=${encodeURIComponent(pageAccessToken)}`,
  ))

  const images = (photoDetailRes.data.images ?? []) as Array<Record<string, unknown>>
  const imageUrl = images[0]?.source as string | undefined
  if (!imageUrl) {
    return { status: 500, body: { error: 'Failed to retrieve hosted image URL from Facebook.' } }
  }

  // Create Instagram media container
  const containerRes = await safeJson(await fetch(
    `https://graph.facebook.com/v21.0/${igAccountId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption: text, access_token: pageAccessToken }),
    },
  ))

  if (!containerRes.data.id) {
    return apiError('Instagram media container creation failed', containerRes)
  }

  // Publish the container
  const publishRes = await safeJson(await fetch(
    `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerRes.data.id, access_token: pageAccessToken }),
    },
  ))

  if (publishRes.data.id) {
    return { status: 200, body: { id: publishRes.data.id } }
  }
  return apiError('Instagram publish failed', publishRes)
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

async function handleTikTokPost(params: Record<string, unknown>): Promise<ApiResult> {
  const { accessToken, text, image, video } = params as { accessToken: string; text: string; image?: string; video?: string }

  if (!image && !video) {
    return { status: 400, body: { error: 'TikTok requires a photo or video for every post. Text-only posts are not supported.' } }
  }

  if (video) {
    const { buffer, mimeType } = parseDataUrl(video)

    // Initialize a direct video post with file upload
    const initRes = await safeJson(await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_info: { title: text, privacy_level: 'PUBLIC_TO_EVERYONE' },
        source_info: {
          source: 'FILE_UPLOAD',
          media_type: 'VIDEO',
          video_size: buffer.length,
          chunk_size: buffer.length,
          total_chunk_count: 1,
        },
        post_mode: 'DIRECT_POST',
        media_type: 'VIDEO',
      }),
    }))

    const publishData = initRes.data.data as Record<string, unknown> | undefined
    const uploadUrl = publishData?.upload_url as string | undefined

    if (!uploadUrl) {
      return apiError('TikTok video post initialization failed', initRes)
    }

    // Upload the video binary
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(buffer.length),
        'Content-Range': `bytes 0-${buffer.length - 1}/${buffer.length}`,
      },
      body: buffer,
    })

    if (!uploadRes.ok) {
      const errRes = await safeJson(uploadRes)
      return apiError('TikTok video upload failed', errRes)
    }

    return { status: 200, body: { id: (publishData?.publish_id as string) || 'created' } }
  }

  // Photo flow
  const { buffer, mimeType } = parseDataUrl(image!)

  // Initialize a direct photo post with file upload
  const initRes = await safeJson(await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      post_info: { title: text, privacy_level: 'PUBLIC_TO_EVERYONE' },
      source_info: { source: 'FILE_UPLOAD', media_type: 'PHOTO', photo_count: 1 },
      post_mode: 'DIRECT_POST',
      media_type: 'PHOTO',
    }),
  }))

  const publishId = initRes.data.data as Record<string, unknown> | undefined
  const uploadUrl = publishId?.upload_url as string | undefined

  if (!uploadUrl) {
    return apiError('TikTok photo post initialization failed', initRes)
  }

  // Upload the image binary to TikTok's upload URL
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(buffer.length),
    },
    body: buffer,
  })

  if (!uploadRes.ok) {
    const errRes = await safeJson(uploadRes)
    return apiError('TikTok image upload failed', errRes)
  }

  return { status: 200, body: { id: (publishId?.publish_id as string) || 'created' } }
}
