import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS設定
app.use('/api/*', cors())

// ボスモンスターデータ（レベル2〜21：パラメーター値5=Lv2から5刻みで出現）
const BOSS_MONSTERS = [
  { level: 2, name: '暗記スライム', description: '暗記の基礎を学ぶ最初の敵' },
  { level: 3, name: '計算ゴブリン', description: '四則演算を操る小鬼' },
  { level: 4, name: '漢字オーク', description: '漢字の読み書きを妨げる敵' },
  { level: 5, name: '文章トロール', description: '文章問題を複雑にする巨人' },
  { level: 6, name: '暗記魔人ザンキング', description: '暗記を嫌う中級魔物' },
  { level: 7, name: '計算魔王カルクロス', description: '計算問題を乱す魔王' },
  { level: 8, name: '読解竜ドクカイザー', description: '読解力を奪う竜' },
  { level: 9, name: '応用魔神オーヨード', description: '応用問題の支配者' },
  { level: 10, name: '図形騎士ズケイト', description: '図形問題の守護者' },
  { level: 11, name: '文法将軍ブンポウ', description: '文法の鉄則を操る将軍' },
  { level: 12, name: '速算妖怪ソクサンマ', description: '速算力を試す妖怪' },
  { level: 13, name: '記述魔導士キジュツ', description: '記述問題の魔術師' },
  { level: 14, name: '論理魔神ロンリード', description: '論理的思考を問う魔神' },
  { level: 15, name: '複合竜コンボドラ', description: '複合問題を繰り出す竜' },
  { level: 16, name: '時間支配者タイムロード', description: '時間配分を狂わせる支配者' },
  { level: 17, name: '難問帝王ナンモンテイ', description: '難問を生み出す帝王' },
  { level: 18, name: '完璧騎士パーフェクト', description: '完璧な解答を求める騎士' },
  { level: 19, name: '試験神エグザム', description: '試験そのものを司る神' },
  { level: 20, name: '合格竜パスドラゴン', description: '合格への最後の壁' },
  { level: 21, name: '大魔王ジュケンデビル', description: '受験を統べる最強の魔王' }
];

// パラメーター取得API
app.get('/api/parameters', async (c) => {
  const db = c.env.DB;
  const result = await db.prepare('SELECT * FROM parameters ORDER BY id DESC LIMIT 1').first();
  
  if (!result) {
    // 初期データがない場合は作成
    await db.prepare('INSERT INTO parameters (defense, attack, power, hp, gold) VALUES (?, ?, ?, ?, ?)')
      .bind(5, 5, 5, 5, 0).run();
    const newResult = await db.prepare('SELECT * FROM parameters ORDER BY id DESC LIMIT 1').first();
    return c.json(newResult);
  }
  
  // レベル計算（5刻み：5→Lv1, 10→Lv2, 15→Lv3...）
  const defense = result.defense as number;
  const attack = result.attack as number;
  const power = result.power as number;
  const hp = result.hp as number;
  
  const defenseLevel = Math.floor((defense - 1) / 5) + 1;
  const attackLevel = Math.floor((attack - 1) / 5) + 1;
  const powerLevel = Math.floor((power - 1) / 5) + 1;
  const hpLevel = Math.floor((hp - 1) / 5) + 1;
  
  // ボス出現判定（全レベルが一致した時のみ）
  const minLevel = Math.min(defenseLevel, attackLevel, powerLevel, hpLevel);
  let currentBoss = null;
  
  // 全てのレベルが同じ場合のみボス出現
  if (defenseLevel === attackLevel && attackLevel === powerLevel && powerLevel === hpLevel) {
    for (const boss of BOSS_MONSTERS) {
      if (minLevel === boss.level) {
        currentBoss = boss;
        break;
      }
    }
  }
  
  // ボス討伐記録を取得
  const defeatedBosses = await db.prepare('SELECT boss_level FROM boss_defeats ORDER BY boss_level').all();
  const defeatedLevels = defeatedBosses.results.map(row => row.boss_level);
  
  return c.json({
    ...result,
    defenseLevel,
    attackLevel,
    powerLevel,
    hpLevel,
    currentBoss,
    defeatedBosses: defeatedLevels
  });
});

// 学習記録追加API
app.post('/api/records', async (c) => {
  const db = c.env.DB;
  const { year, month, day, category, memo } = await c.req.json();
  
  // パラメーター更新前の値を取得
  const params = await db.prepare('SELECT * FROM parameters ORDER BY id DESC LIMIT 1').first();
  
  let defense = params.defense as number;
  let attack = params.attack as number;
  let power = params.power as number;
  let hp = params.hp as number;
  let gold = params.gold as number;
  
  // 更新前のレベルを計算
  const oldDefenseLevel = Math.floor(defense / 5) + 1;
  const oldAttackLevel = Math.floor(attack / 5) + 1;
  const oldPowerLevel = Math.floor(power / 5) + 1;
  const oldHpLevel = Math.floor(hp / 5) + 1;
  
  // カテゴリーに応じてパラメーター増加（ランダム1〜3）
  const randomIncrease = () => Math.floor(Math.random() * 3) + 1;
  
  let increaseAmount = 0;
  
  switch (category) {
    case 'グノーブル国語':
      increaseAmount = randomIncrease();
      defense += increaseAmount;
      break;
    case 'グノーブル算数':
      increaseAmount = randomIncrease();
      attack += increaseAmount;
      break;
    case '基礎力完成テスト':
      increaseAmount = randomIncrease();
      power += increaseAmount;
      break;
    case '四谷大塚漢字':
      increaseAmount = randomIncrease();
      hp += increaseAmount;
      break;
    case 'その他国語':
      increaseAmount = randomIncrease();
      defense += increaseAmount;
      break;
    case 'その他算数':
      increaseAmount = randomIncrease();
      attack += increaseAmount;
      break;
    case 'その他（スーパークエスト）':
      increaseAmount = randomIncrease();
      defense += increaseAmount;
      attack += increaseAmount;
      power += increaseAmount;
      hp += increaseAmount;
      break;
    case 'その他（自由記述）':
      gold += 10;
      break;
  }
  
  // 更新後のレベルを計算（5刻み：5→Lv1, 10→Lv2, 15→Lv3...）
  const newDefenseLevel = Math.floor((defense - 1) / 5) + 1;
  const newAttackLevel = Math.floor((attack - 1) / 5) + 1;
  const newPowerLevel = Math.floor((power - 1) / 5) + 1;
  const newHpLevel = Math.floor((hp - 1) / 5) + 1;
  
  // レベルアップ判定
  const leveledUp = 
    newDefenseLevel > oldDefenseLevel ||
    newAttackLevel > oldAttackLevel ||
    newPowerLevel > oldPowerLevel ||
    newHpLevel > oldHpLevel;
  
  // 学習記録を保存
  const result = await db.prepare('INSERT INTO learning_records (year, month, day, category, memo) VALUES (?, ?, ?, ?, ?)')
    .bind(year, month, day, category, memo).run();
  
  // パラメーター更新
  await db.prepare('UPDATE parameters SET defense = ?, attack = ?, power = ?, hp = ?, gold = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(defense, attack, power, hp, gold, params.id).run();
  
  return c.json({ 
    success: true, 
    defense, 
    attack, 
    power, 
    hp, 
    gold,
    increaseAmount,
    leveledUp,
    recordId: result.meta.last_row_id
  });
});

// 学習記録取得API
app.get('/api/records', async (c) => {
  const db = c.env.DB;
  const { year, month } = c.req.query();
  
  let query = 'SELECT * FROM learning_records';
  const bindings = [];
  
  if (year && month) {
    query += ' WHERE year = ? AND month = ?';
    bindings.push(parseInt(year), parseInt(month));
  }
  
  query += ' ORDER BY year, month, day';
  
  const result = await db.prepare(query).bind(...bindings).all();
  return c.json(result.results);
});

// ボス討伐記録API
app.post('/api/boss-defeat', async (c) => {
  const db = c.env.DB;
  const { bossLevel } = await c.req.json();
  
  // 既に討伐済みかチェック
  const existing = await db.prepare('SELECT * FROM boss_defeats WHERE boss_level = ?').bind(bossLevel).first();
  
  if (!existing) {
    // 討伐記録を追加
    await db.prepare('INSERT INTO boss_defeats (boss_level) VALUES (?)').bind(bossLevel).run();
  }
  
  return c.json({ success: true, bossLevel });
});

// ボス討伐記録取得API
app.get('/api/boss-defeats', async (c) => {
  const db = c.env.DB;
  const result = await db.prepare('SELECT boss_level FROM boss_defeats ORDER BY boss_level').all();
  return c.json(result.results.map(row => row.boss_level));
});

// 学習記録削除API（チェック外し用）
app.delete('/api/records/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  
  // 削除前に記録を取得してパラメーター減算
  const record = await db.prepare('SELECT * FROM learning_records WHERE id = ?').bind(id).first();
  
  if (record) {
    const params = await db.prepare('SELECT * FROM parameters ORDER BY id DESC LIMIT 1').first();
    
    let defense = params.defense as number;
    let attack = params.attack as number;
    let power = params.power as number;
    let hp = params.hp as number;
    let gold = params.gold as number;
    
    // 記録のメモから増加量を取得（ランダムなので平均2を減算）
    const decreaseAmount = 2;
    
    // カテゴリーに応じてパラメーター減少
    const category = record.category as string;
    switch (category) {
      case 'グノーブル国語':
        defense = Math.max(5, defense - decreaseAmount);
        break;
      case 'グノーブル算数':
        attack = Math.max(5, attack - decreaseAmount);
        break;
      case '基礎力完成テスト':
        power = Math.max(5, power - decreaseAmount);
        break;
      case '四谷大塚漢字':
        hp = Math.max(5, hp - decreaseAmount);
        break;
      case 'その他国語':
        defense = Math.max(5, defense - decreaseAmount);
        break;
      case 'その他算数':
        attack = Math.max(5, attack - decreaseAmount);
        break;
      case 'その他（スーパークエスト）':
        defense = Math.max(5, defense - decreaseAmount);
        attack = Math.max(5, attack - decreaseAmount);
        power = Math.max(5, power - decreaseAmount);
        hp = Math.max(5, hp - decreaseAmount);
        break;
      case 'その他（自由記述）':
        gold = Math.max(0, gold - 10);
        break;
    }
    
    // パラメーター更新
    await db.prepare('UPDATE parameters SET defense = ?, attack = ?, power = ?, hp = ?, gold = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(defense, attack, power, hp, gold, params.id).run();
    
    // 記録削除
    await db.prepare('DELETE FROM learning_records WHERE id = ?').bind(id).run();
    
    return c.json({ success: true, defense, attack, power, hp, gold });
  }
  
  return c.json({ success: false, message: 'Record not found' });
});

// ルートページ
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>諒のドラゴンクエスト2026</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap');
          
          * {
            font-family: 'Noto Sans JP', sans-serif;
          }
          
          body {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 50%, #1e293b 75%, #0f172a 100%);
            background-size: 400% 400%;
            animation: gradientShift 15s ease infinite;
            min-height: 100vh;
            position: relative;
          }
          
          body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
              radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%);
            pointer-events: none;
            z-index: 0;
          }
          
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          
          .max-w-7xl {
            position: relative;
            z-index: 1;
          }
          
          .dq-title {
            font-weight: 900;
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 25%, #fbbf24 50%, #f59e0b 75%, #fbbf24 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: shimmer 3s linear infinite;
            filter: drop-shadow(0 4px 8px rgba(251, 191, 36, 0.5)) 
                    drop-shadow(0 0 20px rgba(251, 191, 36, 0.3));
            letter-spacing: 3px;
          }
          
          @keyframes shimmer {
            to { background-position: 200% center; }
          }
          
          .dq-box {
            background: linear-gradient(135deg, 
              rgba(30, 41, 59, 0.95) 0%, 
              rgba(15, 23, 42, 0.95) 50%, 
              rgba(30, 41, 59, 0.95) 100%);
            border: 3px solid;
            border-image: linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24) 1;
            border-radius: 16px;
            box-shadow: 
              0 10px 30px rgba(0, 0, 0, 0.5),
              0 0 40px rgba(251, 191, 36, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              inset 0 -1px 0 rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            position: relative;
            overflow: hidden;
          }
          
          .dq-box::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, 
              transparent, 
              rgba(255, 255, 255, 0.1), 
              transparent);
            animation: shine 3s infinite;
          }
          
          @keyframes shine {
            to { left: 100%; }
          }
          
          .param-bar {
            background: linear-gradient(90deg, 
              #3b82f6 0%, 
              #8b5cf6 25%, 
              #d946ef 50%, 
              #f59e0b 75%, 
              #10b981 100%);
            height: 28px;
            border-radius: 14px;
            box-shadow: 
              inset 0 2px 4px rgba(0, 0, 0, 0.3),
              0 2px 8px rgba(59, 130, 246, 0.4),
              0 0 20px rgba(139, 92, 246, 0.3);
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
          }
          
          .param-bar::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 50%;
            background: linear-gradient(to bottom, 
              rgba(255, 255, 255, 0.3), 
              transparent);
            border-radius: 14px 14px 0 0;
          }
          
          .boss-appear {
            animation: bossEntrance 1s ease-out, bossPulse 2s ease-in-out infinite;
          }
          
          @keyframes bossEntrance {
            0% { 
              transform: scale(0.5) translateY(-50px); 
              opacity: 0; 
            }
            60% { 
              transform: scale(1.1) translateY(0); 
            }
            100% { 
              transform: scale(1) translateY(0); 
              opacity: 1; 
            }
          }
          
          @keyframes bossPulse {
            0%, 100% { 
              transform: scale(1); 
              box-shadow: 0 0 40px rgba(239, 68, 68, 0.6); 
            }
            50% { 
              transform: scale(1.02); 
              box-shadow: 0 0 60px rgba(239, 68, 68, 0.9); 
            }
          }
          
          .day-card {
            background: linear-gradient(135deg, 
              rgba(51, 65, 85, 0.8) 0%, 
              rgba(30, 41, 59, 0.8) 100%);
            border: 2px solid rgba(148, 163, 184, 0.3);
            border-radius: 12px;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(8px);
          }
          
          .day-card:hover {
            border-color: #fbbf24;
            transform: translateY(-4px) scale(1.02);
            box-shadow: 
              0 8px 24px rgba(0, 0, 0, 0.4),
              0 0 30px rgba(251, 191, 36, 0.3);
          }
          
          .day-card.today {
            border: 3px solid #fbbf24;
            background: linear-gradient(135deg, 
              rgba(251, 191, 36, 0.15) 0%, 
              rgba(245, 158, 11, 0.1) 100%);
            box-shadow: 
              0 0 30px rgba(251, 191, 36, 0.4),
              inset 0 0 20px rgba(251, 191, 36, 0.1);
          }
          
          .category-checkbox {
            width: 22px;
            height: 22px;
            cursor: pointer;
            accent-color: #fbbf24;
            transform: scale(1);
            transition: transform 0.2s ease;
          }
          
          .category-checkbox:hover {
            transform: scale(1.2);
          }
          
          .memo-input {
            background: rgba(15, 23, 42, 0.8);
            border: 2px solid rgba(100, 116, 139, 0.4);
            color: #f1f5f9;
            padding: 8px 12px;
            border-radius: 8px;
            width: 100%;
            font-size: 14px;
            transition: all 0.3s ease;
          }
          
          .memo-input:focus {
            outline: none;
            border-color: #fbbf24;
            box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.2);
            background: rgba(15, 23, 42, 0.95);
          }
          
          /* ボス図鑑カード - 現代版デザイン */
          .boss-card {
            background: linear-gradient(135deg, 
              rgba(51, 65, 85, 0.9) 0%, 
              rgba(30, 41, 59, 0.9) 100%);
            border: 2px solid rgba(100, 116, 139, 0.4);
            border-radius: 12px;
            padding: 14px;
            text-align: center;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            cursor: pointer;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
          
          .boss-card:hover {
            border-color: #fbbf24;
            transform: translateY(-6px) scale(1.05);
            box-shadow: 
              0 12px 24px rgba(0, 0, 0, 0.4),
              0 0 40px rgba(251, 191, 36, 0.4);
          }
          
          .boss-card.defeated {
            background: linear-gradient(135deg, 
              rgba(34, 197, 94, 0.25) 0%, 
              rgba(16, 185, 129, 0.2) 100%);
            border-color: #22c55e;
            box-shadow: 
              0 4px 12px rgba(0, 0, 0, 0.3),
              0 0 20px rgba(34, 197, 94, 0.3);
          }
          
          .boss-card.defeated:hover {
            box-shadow: 
              0 12px 24px rgba(0, 0, 0, 0.4),
              0 0 40px rgba(34, 197, 94, 0.5);
          }
          
          .boss-card.current {
            background: linear-gradient(135deg, 
              rgba(239, 68, 68, 0.35) 0%, 
              rgba(220, 38, 38, 0.3) 100%);
            border-color: #ef4444;
            animation: bossCardGlow 2s ease-in-out infinite;
          }
          
          @keyframes bossCardGlow {
            0%, 100% { 
              box-shadow: 
                0 4px 12px rgba(0, 0, 0, 0.3),
                0 0 30px rgba(239, 68, 68, 0.6); 
            }
            50% { 
              box-shadow: 
                0 8px 20px rgba(0, 0, 0, 0.4),
                0 0 50px rgba(239, 68, 68, 0.9); 
            }
          }
          
          .boss-icon {
            font-size: 2.5rem;
            margin-bottom: 10px;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
            transition: transform 0.3s ease;
          }
          
          .boss-card:hover .boss-icon {
            transform: scale(1.2) rotate(5deg);
          }
          
          .boss-level {
            font-size: 0.875rem;
            font-weight: 700;
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 6px;
            filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
          }
          
          .boss-name {
            font-size: 0.8rem;
            color: #e2e8f0;
            line-height: 1.3;
            font-weight: 600;
          }
          
          .defeated-mark {
            position: absolute;
            top: -10px;
            right: -10px;
            background: linear-gradient(135deg, #22c55e, #16a34a);
            color: white;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.3rem;
            border: 3px solid #fff;
            box-shadow: 
              0 4px 12px rgba(0, 0, 0, 0.4),
              0 0 20px rgba(34, 197, 94, 0.5);
            animation: checkmarkPop 0.5s ease-out;
          }
          
          @keyframes checkmarkPop {
            0% { transform: scale(0) rotate(-180deg); }
            60% { transform: scale(1.2) rotate(10deg); }
            100% { transform: scale(1) rotate(0); }
          }
          
          /* 紙吹雪アニメーション - 現代版 */
          .confetti {
            position: fixed;
            width: 12px;
            height: 12px;
            background: #fbbf24;
            position: fixed;
            top: -10px;
            z-index: 9999;
            animation: confetti-fall 3s ease-in-out forwards;
            border-radius: 2px;
            box-shadow: 0 0 10px currentColor;
          }
          
          @keyframes confetti-fall {
            0% { 
              transform: translateY(0) rotateZ(0deg); 
              opacity: 1; 
            }
            100% { 
              transform: translateY(100vh) rotateZ(720deg); 
              opacity: 0; 
            }
          }
          
          /* レベルアップアニメーション - 現代版 */
          .levelup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, 
              rgba(0, 0, 0, 0.9) 0%, 
              rgba(0, 0, 0, 0.95) 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.5s ease-in-out;
            backdrop-filter: blur(10px);
          }
          
          .levelup-text {
            font-weight: 900;
            font-size: 4rem;
            background: linear-gradient(135deg, 
              #fbbf24 0%, 
              #f59e0b 25%, 
              #fbbf24 50%, 
              #f59e0b 75%, 
              #fbbf24 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: shimmer 1s linear infinite, levelupScale 1.5s ease-in-out infinite;
            filter: drop-shadow(0 0 30px rgba(251, 191, 36, 0.8)) 
                    drop-shadow(0 0 60px rgba(245, 158, 11, 0.6));
          }
          
          @keyframes fadeIn {
            from { 
              opacity: 0; 
              backdrop-filter: blur(0px); 
            }
            to { 
              opacity: 1; 
              backdrop-filter: blur(10px); 
            }
          }
          
          @keyframes levelupScale {
            0%, 100% { 
              transform: scale(1) rotateZ(0deg); 
            }
            50% { 
              transform: scale(1.15) rotateZ(2deg); 
            }
          }
        </style>
    </head>
    <body class="p-4 md:p-8">
        <!-- レベルアップオーバーレイ -->
        <div id="levelup-overlay" class="levelup-overlay" style="display: none;">
          <div class="levelup-text">
            LEVEL UP!
          </div>
        </div>
        
        <div class="max-w-7xl mx-auto">
            <!-- タイトル -->
            <h1 class="dq-title text-2xl md:text-4xl text-center mb-8 py-4">
                諒のドラゴンクエスト2026
            </h1>
            
            <!-- パラメーター表示 -->
            <div class="dq-box rounded-lg p-6 mb-8">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div class="text-yellow-400 font-bold">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-xl md:text-2xl"><i class="fas fa-shield-alt mr-2"></i> 防御力（国語） <span class="text-2xl md:text-3xl">Lv.<span id="defense-level">1</span></span></span>
                            <span class="text-4xl md:text-5xl font-black" id="defense-value">5</span>
                        </div>
                        <div class="param-bar" id="defense-bar" style="width: 5%"></div>
                    </div>
                    
                    <div class="text-red-400 font-bold">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-xl md:text-2xl"><i class="fas fa-fist-raised mr-2"></i> 攻撃力（算数） <span class="text-2xl md:text-3xl">Lv.<span id="attack-level">1</span></span></span>
                            <span class="text-4xl md:text-5xl font-black" id="attack-value">5</span>
                        </div>
                        <div class="param-bar" id="attack-bar" style="width: 5%"></div>
                    </div>
                    
                    <div class="text-blue-400 font-bold">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-xl md:text-2xl"><i class="fas fa-bolt mr-2"></i> 力（基礎力） <span class="text-2xl md:text-3xl">Lv.<span id="power-level">1</span></span></span>
                            <span class="text-4xl md:text-5xl font-black" id="power-value">5</span>
                        </div>
                        <div class="param-bar" id="power-bar" style="width: 5%"></div>
                    </div>
                    
                    <div class="text-green-400 font-bold">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-xl md:text-2xl"><i class="fas fa-heart mr-2"></i> 体力（漢字） <span class="text-2xl md:text-3xl">Lv.<span id="hp-level">1</span></span></span>
                            <span class="text-4xl md:text-5xl font-black" id="hp-value">5</span>
                        </div>
                        <div class="param-bar" id="hp-bar" style="width: 5%"></div>
                    </div>
                </div>
                
                <div class="text-yellow-300 font-bold text-2xl md:text-3xl text-center mt-6">
                    <i class="fas fa-coins mr-2"></i> ゴールド: <span id="gold-value" class="text-3xl md:text-4xl">0</span>G
                </div>
            </div>
            
            <!-- ボス出現エリア -->
            <div id="boss-area" class="hidden dq-box rounded-lg p-6 mb-8 boss-appear">
                <div class="text-center">
                    <div class="text-6xl mb-4">👹</div>
                    <h2 class="text-3xl font-bold text-red-500 mb-2" id="boss-name"></h2>
                    <p class="text-yellow-300 text-lg" id="boss-description"></p>
                    <p class="text-white mt-4 text-xl">があらわれた！</p>
                    <button id="defeat-boss-btn" class="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-xl transition-all transform hover:scale-105">
                        <i class="fas fa-sword mr-2"></i>討伐する！
                    </button>
                </div>
            </div>
            
            <!-- ボス図鑑 -->
            <div class="dq-box rounded-lg p-6 mb-8">
                <h2 class="text-2xl font-bold text-yellow-400 mb-4 text-center">
                    <i class="fas fa-book-open mr-2"></i>ボスモンスター図鑑
                </h2>
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3" id="boss-list">
                    <!-- JavaScriptで動的に生成 -->
                </div>
            </div>
            
            <!-- 日付ナビゲーション -->
            <div class="flex items-center justify-center gap-4 mb-6">
                <button id="prev-day-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                    <i class="fas fa-chevron-left mr-2"></i>前の日
                </button>
                
                <div class="bg-yellow-600 text-white px-8 py-4 rounded-lg text-2xl font-bold shadow-lg">
                    <span id="current-date"></span>
                </div>
                
                <button id="next-day-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                    次の日<i class="fas fa-chevron-right ml-2"></i>
                </button>
            </div>
            
            <!-- 今日に戻るボタン -->
            <div class="text-center mb-6">
                <button id="today-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-all transform hover:scale-105">
                    <i class="fas fa-home mr-2"></i>今日に戻る
                </button>
            </div>
            
            <!-- 単一日のカード表示 -->
            <div id="day-container" class="max-w-2xl mx-auto">
                <!-- JavaScriptで動的に生成 -->
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
          const API_BASE = '';
          let currentParams = null;
          
          // 今日の日付を取得
          const today = new Date();
          const currentYear = today.getFullYear();
          const currentMonth = today.getMonth() + 1;
          const currentDay = today.getDate();
          
          // 表示中の日付を管理
          let viewYear = currentYear;
          let viewMonth = currentMonth;
          let viewDay = currentDay;
          
          // ボスモンスターデータ（フロントエンド用 - 現代風アイコン）
          const BOSS_MONSTERS = [
            { level: 2, name: '暗記スライム', icon: '🟢', description: '暗記の基礎を学ぶ最初の敵' },
            { level: 3, name: '計算ゴブリン', icon: '👹', description: '四則演算を操る小鬼' },
            { level: 4, name: '漢字オーク', icon: '🦍', description: '漢字の読み書きを妨げる敵' },
            { level: 5, name: '文章トロール', icon: '🧟‍♂️', description: '文章問題を複雑にする巨人' },
            { level: 6, name: '暗記魔人ザンキング', icon: '😈', description: '暗記を嫌う中級魔物' },
            { level: 7, name: '計算魔王カルクロス', icon: '👿', description: '計算問題を乱す魔王' },
            { level: 8, name: '読解竜ドクカイザー', icon: '🐲', description: '読解力を奪う竜' },
            { level: 9, name: '応用魔神オーヨード', icon: '👺', description: '応用問題の支配者' },
            { level: 10, name: '図形騎士ズケイト', icon: '🛡️', description: '図形問題の守護者' },
            { level: 11, name: '文法将軍ブンポウ', icon: '⚔️', description: '文法の鉄則を操る将軍' },
            { level: 12, name: '速算妖怪ソクサンマ', icon: '👻', description: '速算力を試す妖怪' },
            { level: 13, name: '記述魔導士キジュツ', icon: '🧙‍♂️', description: '記述問題の魔術師' },
            { level: 14, name: '論理魔神ロンリード', icon: '🧠', description: '論理的思考を問う魔神' },
            { level: 15, name: '複合竜コンボドラ', icon: '🐉', description: '複合問題を繰り出す竜' },
            { level: 16, name: '時間支配者タイムロード', icon: '⏱️', description: '時間配分を狂わせる支配者' },
            { level: 17, name: '難問帝王ナンモンテイ', icon: '👑', description: '難問を生み出す帝王' },
            { level: 18, name: '完璧騎士パーフェクト', icon: '🏆', description: '完璧な解答を求める騎士' },
            { level: 19, name: '試験神エグザム', icon: '📜', description: '試験そのものを司る神' },
            { level: 20, name: '合格竜パスドラゴン', icon: '🎓', description: '合格への最後の壁' },
            { level: 21, name: '大魔王ジュケンデビル', icon: '💀', description: '受験を統べる最強の魔王' }
          ];
          
          // パラメーター読み込み
          async function loadParameters() {
            try {
              const response = await axios.get(API_BASE + '/api/parameters');
              currentParams = response.data;
              updateParameterDisplay();
            } catch (error) {
              console.error('パラメーター読み込みエラー:', error);
            }
          }
          
          // パラメーター表示更新
          function updateParameterDisplay() {
            if (!currentParams) return;
            
            document.getElementById('defense-value').textContent = currentParams.defense;
            document.getElementById('attack-value').textContent = currentParams.attack;
            document.getElementById('power-value').textContent = currentParams.power;
            document.getElementById('hp-value').textContent = currentParams.hp;
            document.getElementById('gold-value').textContent = currentParams.gold;
            
            document.getElementById('defense-level').textContent = currentParams.defenseLevel;
            document.getElementById('attack-level').textContent = currentParams.attackLevel;
            document.getElementById('power-level').textContent = currentParams.powerLevel;
            document.getElementById('hp-level').textContent = currentParams.hpLevel;
            
            // バーの長さ更新（最大100として）
            document.getElementById('defense-bar').style.width = Math.min(currentParams.defense, 100) + '%';
            document.getElementById('attack-bar').style.width = Math.min(currentParams.attack, 100) + '%';
            document.getElementById('power-bar').style.width = Math.min(currentParams.power, 100) + '%';
            document.getElementById('hp-bar').style.width = Math.min(currentParams.hp, 100) + '%';
            
            // ボス出現判定
            if (currentParams.currentBoss) {
              document.getElementById('boss-area').classList.remove('hidden');
              document.getElementById('boss-name').textContent = currentParams.currentBoss.name;
              document.getElementById('boss-description').textContent = currentParams.currentBoss.description;
            } else {
              document.getElementById('boss-area').classList.add('hidden');
            }
            
            // ボス図鑑を更新
            generateBossList();
          }
          
          // ボス図鑑を生成
          function generateBossList() {
            const bossList = document.getElementById('boss-list');
            bossList.innerHTML = '';
            
            const defeatedBosses = currentParams ? currentParams.defeatedBosses || [] : [];
            const currentBossLevel = currentParams && currentParams.currentBoss ? currentParams.currentBoss.level : null;
            
            BOSS_MONSTERS.forEach(boss => {
              const bossCard = document.createElement('div');
              bossCard.className = 'boss-card';
              
              // 討伐済みかチェック
              const isDefeated = defeatedBosses.includes(boss.level);
              if (isDefeated) {
                bossCard.classList.add('defeated');
              }
              
              // 現在出現中のボス
              if (boss.level === currentBossLevel) {
                bossCard.classList.add('current');
              }
              
              // ボスアイコン
              const icon = document.createElement('div');
              icon.className = 'boss-icon';
              icon.textContent = boss.icon;
              bossCard.appendChild(icon);
              
              // レベル表示
              const level = document.createElement('div');
              level.className = 'boss-level';
              level.textContent = 'Lv.' + boss.level;
              bossCard.appendChild(level);
              
              // ボス名
              const name = document.createElement('div');
              name.className = 'boss-name';
              name.textContent = boss.name;
              bossCard.appendChild(name);
              
              // 討伐マーク
              if (isDefeated) {
                const mark = document.createElement('div');
                mark.className = 'defeated-mark';
                mark.innerHTML = '<i class="fas fa-check"></i>';
                bossCard.appendChild(mark);
              }
              
              bossList.appendChild(bossCard);
            });
          }
          
          // ボス討伐処理
          async function defeatBoss() {
            if (!currentParams || !currentParams.currentBoss) return;
            
            const bossLevel = currentParams.currentBoss.level;
            
            try {
              const response = await axios.post(API_BASE + '/api/boss-defeat', {
                bossLevel: bossLevel
              });
              
              if (response.data.success) {
                // パラメーター再読み込み
                await loadParameters();
                
                // ボスエリアを非表示
                document.getElementById('boss-area').classList.add('hidden');
                
                // 盛大なエフェクト
                showLevelUpEffect();
                
                alert('🎉 おめでとう！' + currentParams.currentBoss.name + 'を討伐しました！');
              }
            } catch (error) {
              console.error('討伐記録エラー:', error);
            }
          }
          
          // 討伐ボタンのイベントリスナー
          document.getElementById('defeat-boss-btn').addEventListener('click', defeatBoss);
          
          // 紙吹雪エフェクト
          function showConfetti() {
            const colors = ['#fbbf24', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6'];
            const confettiCount = 50;
            
            for (let i = 0; i < confettiCount; i++) {
              setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDelay = Math.random() * 0.5 + 's';
                confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
                document.body.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 3000);
              }, i * 30);
            }
          }
          
          // レベルアップエフェクト＋効果音
          function showLevelUpEffect() {
            // オーバーレイ表示
            const overlay = document.getElementById('levelup-overlay');
            overlay.style.display = 'flex';
            
            // 大量の紙吹雪
            const colors = ['#fbbf24', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6'];
            const confettiCount = 150;
            
            for (let i = 0; i < confettiCount; i++) {
              setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.width = (Math.random() * 15 + 5) + 'px';
                confetti.style.height = (Math.random() * 15 + 5) + 'px';
                confetti.style.animationDelay = Math.random() * 0.3 + 's';
                confetti.style.animationDuration = (Math.random() * 2 + 3) + 's';
                document.body.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 5000);
              }, i * 20);
            }
            
            // レベルアップ効果音（Web Audio API）
            playLevelUpSound();
            
            // 3秒後にオーバーレイを非表示
            setTimeout(() => {
              overlay.style.display = 'none';
            }, 3000);
          }
          
          // レベルアップ効果音
          function playLevelUpSound() {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523.25, 587.33, 659.25, 783.99, 880.00]; // C, D, E, G, A
            
            notes.forEach((freq, i) => {
              setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = freq;
                oscillator.type = 'square';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
              }, i * 100);
            });
          }
          
          // 日付を更新
          function updateDateDisplay() {
            document.getElementById('current-date').textContent = 
              viewYear + '年' + viewMonth + '月' + viewDay + '日';
            
            // ボタンの有効/無効を設定
            const viewDate = new Date(viewYear, viewMonth - 1, viewDay);
            const minDate = new Date(currentYear, 0, 1); // 今年の1月1日
            const maxDate = new Date(currentYear, 11, 31); // 今年の12月31日
            
            document.getElementById('prev-day-btn').disabled = viewDate <= minDate;
            document.getElementById('next-day-btn').disabled = viewDate >= maxDate;
            
            // 今日に戻るボタンの表示/非表示
            const isToday = viewYear === currentYear && viewMonth === currentMonth && viewDay === currentDay;
            document.getElementById('today-btn').style.display = isToday ? 'none' : 'inline-block';
          }
          
          // 単一日のカード生成
          function generateDayCard() {
            const container = document.getElementById('day-container');
            container.innerHTML = '';
            
            const dayCard = document.createElement('div');
            dayCard.className = 'day-card rounded-lg p-6';
            
            // 今日の日付には特別なスタイル
            const isToday = viewYear === currentYear && viewMonth === currentMonth && viewDay === currentDay;
            if (isToday) {
              dayCard.classList.add('today');
            }
            
            const dayTitle = document.createElement('h3');
            dayTitle.className = 'text-2xl font-bold text-yellow-400 mb-6 text-center';
            dayTitle.textContent = viewMonth + '月' + viewDay + '日の学習記録';
            dayCard.appendChild(dayTitle);
            
            const categories = [
              'グノーブル国語',
              'グノーブル算数',
              '基礎力完成テスト',
              '四谷大塚漢字',
              'その他国語',
              'その他算数',
              'その他（スーパークエスト）',
              'その他（自由記述）'
            ];
            
            categories.forEach(category => {
              const categoryDiv = document.createElement('div');
              categoryDiv.className = 'mb-4 bg-gray-800 bg-opacity-50 p-4 rounded-lg';
              
              const labelDiv = document.createElement('div');
              labelDiv.className = 'flex items-center gap-3 mb-2';
              
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.className = 'category-checkbox';
              checkbox.dataset.year = viewYear;
              checkbox.dataset.month = viewMonth;
              checkbox.dataset.day = viewDay;
              checkbox.dataset.category = category;
              checkbox.onchange = () => handleCheckboxChange(viewYear, viewMonth, viewDay, category, checkbox.checked);
              
              const label = document.createElement('label');
              label.className = 'text-white text-base font-bold';
              label.textContent = category;
              
              labelDiv.appendChild(checkbox);
              labelDiv.appendChild(label);
              
              const memoInput = document.createElement('input');
              memoInput.type = 'text';
              memoInput.className = 'memo-input';
              memoInput.placeholder = 'メモを入力...';
              memoInput.dataset.year = viewYear;
              memoInput.dataset.month = viewMonth;
              memoInput.dataset.day = viewDay;
              memoInput.dataset.category = category;
              
              categoryDiv.appendChild(labelDiv);
              categoryDiv.appendChild(memoInput);
              dayCard.appendChild(categoryDiv);
            });
            
            container.appendChild(dayCard);
            
            // 既存の記録を読み込む
            loadExistingRecords();
          }
          
          // 既存の記録を読み込む
          async function loadExistingRecords() {
            try {
              const response = await axios.get(API_BASE + '/api/records?year=' + viewYear + '&month=' + viewMonth);
              const records = response.data;
              
              records.forEach(record => {
                if (record.day === viewDay) {
                  const checkbox = document.querySelector(\`input.category-checkbox[data-year="\${viewYear}"][data-month="\${viewMonth}"][data-day="\${viewDay}"][data-category="\${record.category}"]\`);
                  const memoInput = document.querySelector(\`input.memo-input[data-year="\${viewYear}"][data-month="\${viewMonth}"][data-day="\${viewDay}"][data-category="\${record.category}"]\`);
                  
                  if (checkbox) {
                    checkbox.checked = true;
                    checkbox.dataset.recordId = record.id; // 記録IDを保存
                  }
                  if (memoInput && record.memo) {
                    memoInput.value = record.memo;
                  }
                }
              });
            } catch (error) {
              console.error('記録読み込みエラー:', error);
            }
          }
          
          // 前の日へ
          function goToPreviousDay() {
            const date = new Date(viewYear, viewMonth - 1, viewDay);
            date.setDate(date.getDate() - 1);
            
            viewYear = date.getFullYear();
            viewMonth = date.getMonth() + 1;
            viewDay = date.getDate();
            
            updateDateDisplay();
            generateDayCard();
          }
          
          // 次の日へ
          function goToNextDay() {
            const date = new Date(viewYear, viewMonth - 1, viewDay);
            date.setDate(date.getDate() + 1);
            
            viewYear = date.getFullYear();
            viewMonth = date.getMonth() + 1;
            viewDay = date.getDate();
            
            updateDateDisplay();
            generateDayCard();
          }
          
          // 今日に戻る
          function goToToday() {
            viewYear = currentYear;
            viewMonth = currentMonth;
            viewDay = currentDay;
            
            updateDateDisplay();
            generateDayCard();
          }
          
          // ボタンイベント設定
          document.getElementById('prev-day-btn').addEventListener('click', goToPreviousDay);
          document.getElementById('next-day-btn').addEventListener('click', goToNextDay);
          document.getElementById('today-btn').addEventListener('click', goToToday);
          
          // チェックボックス変更処理（チェック＆チェック外し対応）
          async function handleCheckboxChange(year, month, day, category, checked) {
            const checkbox = document.querySelector(\`input.category-checkbox[data-year="\${year}"][data-month="\${month}"][data-day="\${day}"][data-category="\${category}"]\`);
            const memoInput = document.querySelector(\`input.memo-input[data-year="\${year}"][data-month="\${month}"][data-day="\${day}"][data-category="\${category}"]\`);
            
            if (checked) {
              // チェックON → 記録追加
              const memo = memoInput ? memoInput.value : '';
              
              try {
                const response = await axios.post(API_BASE + '/api/records', {
                  year: year,
                  month: month,
                  day: day,
                  category: category,
                  memo: memo
                });
                
                if (response.data.success) {
                  // 記録IDを保存
                  checkbox.dataset.recordId = response.data.recordId;
                  
                  // レベルアップ判定
                  if (response.data.leveledUp) {
                    showLevelUpEffect();
                  } else {
                    showConfetti();
                  }
                  
                  // パラメーター再読み込み
                  await loadParameters();
                  
                  // 成功メッセージ（アラートなし）
                  console.log(\`\${month}月\${day}日の\${category}を記録しました！パラメーター+\${response.data.increaseAmount || 10}\`);
                }
              } catch (error) {
                console.error('記録エラー:', error);
                checkbox.checked = false;
                alert('記録に失敗しました');
              }
            } else {
              // チェックOFF → 記録削除
              const recordId = checkbox.dataset.recordId;
              
              if (recordId) {
                try {
                  const response = await axios.delete(API_BASE + '/api/records/' + recordId);
                  
                  if (response.data.success) {
                    // 記録IDを削除
                    delete checkbox.dataset.recordId;
                    
                    // パラメーター再読み込み
                    await loadParameters();
                    
                    console.log(\`\${month}月\${day}日の\${category}の記録を削除しました\`);
                  }
                } catch (error) {
                  console.error('削除エラー:', error);
                  checkbox.checked = true;
                  alert('削除に失敗しました');
                }
              }
            }
          }
          
          // 初期化
          loadParameters();
          updateDateDisplay();
          generateDayCard();
        </script>
    </body>
    </html>
  `)
})

export default app
