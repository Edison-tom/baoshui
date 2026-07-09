export interface PolicyEntry {
  id: string; url: string; title: string
  addedDate: string; summary: string
}

export interface PolicyQA {
  question: string; answer: string
  confidence: number; source: string
  modelAgreement: boolean
}

export function parsePolicyUrl(url: string): { isValid: boolean; domain: string } {
  try {
    const u = new URL(url)
    const isValid = u.hostname.includes('chinatax.gov.cn')
      || u.hostname.includes('gov.cn')
      || u.hostname.includes('hunan.chinatax.gov.cn')
    return { isValid, domain: u.hostname }
  } catch {
    return { isValid: false, domain: '' }
  }
}

export async function callAI(
  apiKey: string,
  model: 'deepseek' | 'qwen',
  prompt: string
): Promise<string> {
  const endpoints: Record<string, string> = {
    deepseek: 'https://api.deepseek.com/v1/chat/completions',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  }
  const modelNames: Record<string, string> = {
    deepseek: 'deepseek-chat',
    qwen: 'qwen-turbo',
  }

  const response = await fetch(endpoints[model], {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelNames[model],
      messages: [
        { role: 'system', content: '你是中国税务政策专家，回答必须基于现行税法。用简洁的中文回答，引用具体条文。' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
    }),
  })

  if (!response.ok) throw new Error(`${model} API error: ${response.status}`)
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function crossValidate(
  deepseekKey: string, qwenKey: string, question: string
): Promise<PolicyQA> {
  try {
    const [deepseekAnswer, qwenAnswer] = await Promise.all([
      callAI(deepseekKey, 'deepseek', question),
      callAI(qwenKey, 'qwen', question),
    ])

    const agreement = deepseekAnswer.slice(0, 50) === qwenAnswer.slice(0, 50)
    return {
      question,
      answer: deepseekAnswer || qwenAnswer || '无法获取答案',
      confidence: agreement ? 0.9 : 0.6,
      source: 'DeepSeek + 通义千问 双模型交叉验证',
      modelAgreement: agreement,
    }
  } catch {
    return {
      question, answer: 'AI 服务暂时不可用，请检查 API Key 或网络连接',
      confidence: 0, source: '错误',
      modelAgreement: false,
    }
  }
}
