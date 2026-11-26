import type { VercelRequest, VercelResponse } from '@vercel/node'

// 토스페이먼츠 공식 테스트 시크릿 키 (개발/테스트용)
// 라이브 전환 시 Vercel 환경 변수 TOSS_SECRET_KEY로 교체합니다.
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_sk_zXLkKEypNArWmo50nX3mqAqNOG'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' })
  }

  const { authKey, customerKey, teamId } = req.body || {}

  if (!authKey || !customerKey || !teamId) {
    return res.status(400).json({ success: false, message: '필수 요청 파라미터가 누락되었습니다.' })
  }

  try {
    // 1. 토스 시크릿 키를 Basic Auth 형식으로 Base64 인코딩
    const encodedSecretKey = Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')

    // 2. 토스페이먼츠에 빌링키(BillingKey) 발급 요청
    const issueResponse = await fetch('https://api.tosspayments.com/v1/billing/authorizations/issue', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encodedSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authKey,
        customerKey,
      }),
    })

    const issueData = await issueResponse.json()

    if (!issueResponse.ok) {
      console.error('빌링키 발급 실패:', issueData)
      return res.status(issueResponse.status).json({
        success: false,
        message: issueData.message || '빌링키 발급에 실패했습니다.',
      })
    }

    const { billingKey, card } = issueData

    // 3. 발급받은 빌링키로 첫 달 구독료(19,000원) 즉시 결제 승인 요청
    const orderId = `order_${teamId}_${Date.now()}`
    const chargeResponse = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encodedSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerKey,
        amount: 19000,
        orderId,
        orderName: 'TeamLog Pro 월간 구독 (첫 달)',
        customerEmail: req.body.customerEmail || undefined,
        customerName: req.body.customerName || undefined,
      }),
    })

    const chargeData = await chargeResponse.json()

    if (!chargeResponse.ok) {
      console.error('첫 결제 승인 실패:', chargeData)
      return res.status(chargeResponse.status).json({
        success: false,
        message: chargeData.message || '첫 달 정기 결제 승인에 실패했습니다.',
      })
    }

    // 4. 결제 성공 응답 (프론트엔드에서 Firestore 구독 상태 갱신할 수 있도록 정보 전달)
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    return res.status(200).json({
      success: true,
      billingKey,
      cardCompany: card?.issuerCode,
      cardNumber: card?.number,
      currentPeriodEnd: nextMonth.toISOString(),
      payment: chargeData,
    })
  } catch (err: any) {
    console.error('서버 통신 오류:', err)
    return res.status(500).json({
      success: false,
      message: err.message || '서버 내부 오류가 발생했습니다.',
    })
  }
}