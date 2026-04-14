import { NextResponse } from 'next/server'

const ZAPI_BASE = `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}`

export async function GET() {
    try {
        const res = await fetch(`${ZAPI_BASE}/qr-code/image`, {
            headers: { 'Client-Token': process.env.ZAPI_CLIENT_TOKEN! },
        })
        const data = await res.json()
        return NextResponse.json({ qrcode: data.value || null })
    } catch {
        return NextResponse.json({ qrcode: null })
    }
}