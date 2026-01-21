import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { renderer } from './renderer'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS設定
app.use('/api/*', cors())
app.use('*', renderer)

// トップページの表示：ここがドラクエ風画面の入り口になります
app.get('/', (c) => {
  return c.render(
    <div className="p-4 bg-slate-900 min-h-screen text-yellow-500 font-mono border-4 border-yellow-600">
      <h1 className="text-3xl font-bold mb-4 text-center">諒の冒険2026</h1>
      
      <div className="bg-black p-4 rounded-lg border-2 border-yellow-500 mb-6 shadow-lg">
        <p className="text-lg">冒険者：諒（Ryo）</p>
        <p className="text-sm text-yellow-700">現在の目標：大魔王ジュケンデビルを倒せ！</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 p-3 rounded border border-gray-600">
          <p className="text-xs">攻撃力（算数）</p>
          <div className="w-full bg-gray-700 h-4 rounded-full mt-1">
            <div className="bg-red-600 h-4 rounded-full" style={{width: '20%'}}></div>
          </div>
        </div>
        <div className="bg-gray-800 p-3 rounded border border-gray-600">
          <p className="text-xs">防御力（国語）</p>
          <div className="w-full bg-gray-700 h-4 rounded-full mt-1">
            <div className="bg-blue-600 h-4 rounded-full" style={{width: '15%'}}></div>
          </div>
        </div>
      </div>

      <div className="text-center py-10 border-2 border-dashed border-gray-700 rounded-lg">
        <p className="text-xl animate-bounce">⚔️ モンスターがあらわれた！</p>
        <p className="text-sm mt-2 text-gray-400">（学習データを読み込んでいます...）</p>
      </div>

      <div className="mt-8 text-center text-xs text-gray-600">
        <p>© 2026 Aizawa Accounting Firm Quest Division</p>
      </div>
    </div>
  )
})

// --- 以降は既存のAPI機能を維持 ---

// パラメーター取得API
app.get('/api/parameters', async (c) => {
  return c.json({ message: "Parameters loading..." })
})

export default app
