import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { ShotAnalysisSchema, type ShotAnalysis } from '../../shared/types.ts'

// Reads ANTHROPIC_API_KEY from the environment (see .env.example).
const client = new Anthropic()
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-opus-5-5'

const SYSTEM = `You are a cinematographer's assistant helping plan a fast-paced promo video.
You are shown one reference frame saved to a mood board. Describe how it was shot so a crew can recreate it.
Be concrete and brief. When a still frame cannot show camera movement, give your best guess from motion blur, composition and context.`

export type ImageInput =
  | { type: 'url'; url: string }
  | { type: 'base64'; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'; data: string }

export async function analyzeShot(image: ImageInput): Promise<ShotAnalysis> {
  const source =
    image.type === 'url'
      ? ({ type: 'url', url: image.url } as const)
      : ({ type: 'base64', media_type: image.mediaType, data: image.data } as const)

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source },
          { type: 'text', text: 'Break this reference frame down into a shot.' },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(ShotAnalysisSchema) },
  })

  if (response.stop_reason === 'refusal') {
    throw new Error(`Claude declined to analyse this image (${response.stop_details?.category ?? 'no category'})`)
  }
  if (!response.parsed_output) throw new Error('Claude returned an answer that did not match the shot format')
  return response.parsed_output
}
