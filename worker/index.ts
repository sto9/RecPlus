// nurunchu.com/recplus/* で dist/ の静的アセットを配信する Worker。
// Vite は base '/recplus/' でビルドするが dist/ 内はルート相対なので、プレフィックスを剥がして引く。
// 未知のパスは index.html にフォールバックする(ホームページ Worker と同じ方式)。
interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> }
}

const BASE = '/recplus'

/** アセット側が返すリダイレクト(/index.html → / など)は剥がしたプレフィックスを付け直す */
function withPrefix(res: Response): Response {
  const location = res.headers.get('Location')
  if (res.status < 300 || res.status >= 400 || !location?.startsWith('/')) return res
  const headers = new Headers(res.headers)
  headers.set('Location', `${BASE}${location === '/' ? '/' : location}`)
  return new Response(null, { status: res.status, headers })
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname === BASE) {
      // 相対 URL の解決基準を揃えるため末尾スラッシュ付きへ
      url.pathname = `${BASE}/`
      return Response.redirect(url.toString(), 301)
    }
    url.pathname = url.pathname.slice(BASE.length) || '/'
    const res = await env.ASSETS.fetch(new Request(url, req))
    if (res.status !== 404) return withPrefix(res)
    url.pathname = '/'
    return withPrefix(await env.ASSETS.fetch(new Request(url, req)))
  },
}
