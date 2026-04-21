export interface ImageGenerationContext {
  campaignName: string
  platform: string
  brandColors: string[]
  toneOfVoice: string
}

export interface GeneratedImage {
  buffer: Buffer
  fileName: string
}

export async function generateAdImages(
  ctx: ImageGenerationContext,
  count = 2
): Promise<GeneratedImage[]> {
  const apiKey = process.env.SILICONFLOW_API_KEY
  if (!apiKey) throw new Error('SILICONFLOW_API_KEY is not configured')

  const colorDesc =
    ctx.brandColors.length > 0
      ? `using brand colors ${ctx.brandColors.slice(0, 3).join(', ')}`
      : 'with professional color palette'

  const prompt =
    `Professional digital advertisement for "${ctx.campaignName}" on ${ctx.platform}, ` +
    `${colorDesc}, ${ctx.toneOfVoice || 'modern and engaging'} style, ` +
    'clean composition, high quality, suitable for social media advertising'

  const results: GeneratedImage[] = []

  for (let i = 0; i < count; i++) {
    const res = await fetch('https://api.siliconflow.cn/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Kwai-Kolors/Kolors',
        prompt,
        n: 1,
        image_size: '1024x1024',
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`SiliconFlow API error ${res.status}: ${errText.slice(0, 200)}`)
    }

    const json = (await res.json()) as { images?: Array<{ url?: string }> }
    const imageUrl = json.images?.[0]?.url
    if (!imageUrl) throw new Error('SiliconFlow returned no image URL')

    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) throw new Error(`Failed to download generated image: ${imgRes.status}`)

    const arrayBuf = await imgRes.arrayBuffer()
    results.push({
      buffer: Buffer.from(arrayBuf),
      fileName: `creative-${i + 1}-${Date.now()}.png`,
    })
  }

  return results
}
