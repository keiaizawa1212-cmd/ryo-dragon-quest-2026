import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS設定
app.use('/api/*', cors())

// ボスモンスターデータ
const BOSS_MONSTERS = [
  { threshold: 10, name: '暗記魔人ザンキング', description: '暗記を嫌う魔物' },
  { threshold: 20, name: '計算魔王カルクロス', description: '計算問題を乱す魔王' },
  { threshold: 30, name: '読解竜ドクカイザー', description: '読解力を奪う竜' },
  { threshold: 40, name: '応用魔神オーヨード', description: '応用問題の支配者' },
  { threshold: 50, name: '大魔王ジュケンデビル', description: '受験を統べる最強の魔王' }
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
  
  // レベル計算
  const defense = result.defense as number;
  const attack = result.attack as number;
  const power = result.power as number;
  const hp = result.hp as number;
  
  const defenseLevel = Math.floor(defense / 5) + 1;
  const attackLevel = Math.floor(attack / 5) + 1;
  const powerLevel = Math.floor(power / 5) + 1;
  const hpLevel = Math.floor(hp / 5) + 1;
  
  // ボス出現判定
  const minParam = Math.min(defense, attack, power, hp);
  let currentBoss = null;
  
  for (const boss of BOSS_MONSTERS) {
    if (minParam >= boss.threshold) {
      currentBoss = boss;
    }
  }
  
  return c.json({
    ...result,
    defenseLevel,
    attackLevel,
    powerLevel,
    hpLevel,
    currentBoss
  });
});

// 学習記録追加API
app.post('/api/records', async (c) => {
  const db = c.env.DB;
  const { year, month, day, category, memo } = await c.req.json();
  
  // 学習記録を保存
  await db.prepare('INSERT INTO learning_records (year, month, day, category, memo) VALUES (?, ?, ?, ?, ?)')
    .bind(year, month, day, category, memo).run();
  
  // パラメーター更新
  const params = await db.prepare('SELECT * FROM parameters ORDER BY id DESC LIMIT 1').first();
  
  let defense = params.defense as number;
  let attack = params.attack as number;
  let power = params.power as number;
  let hp = params.hp as number;
  let gold = params.gold as number;
  
  // カテゴリーに応じてパラメーター増加（ランダム1〜3）
  const randomIncrease = () => Math.floor(Math.random() * 3) + 1;
  
  switch (category) {
    case 'グノーブル国語':
      defense += randomIncrease();
      break;
    case 'グノーブル算数':
      attack += randomIncrease();
      break;
    case '基礎力完成テスト':
      power += randomIncrease();
      break;
    case '四谷大塚漢字':
      hp += randomIncrease();
      break;
    case 'その他国語':
      defense += randomIncrease();
      break;
    case 'その他算数':
      attack += randomIncrease();
      break;
    case 'その他（スーパークエスト）':
      const inc = randomIncrease();
      defense += inc;
      attack += inc;
      power += inc;
      hp += inc;
      break;
    case 'その他（自由記述）':
      gold += 10;
      break;
  }
  
  // パラメーター更新
  await db.prepare('UPDATE parameters SET defense = ?, attack = ?, power = ?, hp = ?, gold = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(defense, attack, power, hp, gold, params.id).run();
  
  return c.json({ success: true, defense, attack, power, hp, gold });
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

// 学習記録削除API
app.delete('/api/records/:id', async (c) => {
  const db = c.env.DB;
  const id = c.req.param('id');
  
  await db.prepare('DELETE FROM learning_records WHERE id = ?').bind(id).run();
  
  return c.json({ success: true });
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
          @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
          
          body {
            background: linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #1e1b4b 100%);
            min-height: 100vh;
          }
          
          .dq-title {
            font-family: 'Press Start 2P', cursive;
            text-shadow: 4px 4px 0px #000, -1px -1px 0px #fff;
            color: #fbbf24;
            letter-spacing: 2px;
          }
          
          .dq-box {
            background: linear-gradient(to bottom, #1f2937 0%, #111827 100%);
            border: 4px solid #fbbf24;
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.5);
          }
          
          .param-bar {
            background: linear-gradient(to right, #ef4444 0%, #f59e0b 50%, #10b981 100%);
            height: 24px;
            border-radius: 4px;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
            transition: width 0.5s ease;
          }
          
          .boss-appear {
            animation: bossShake 0.5s infinite;
          }
          
          @keyframes bossShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }
          
          .day-card {
            background: rgba(31, 41, 55, 0.8);
            border: 2px solid #6b7280;
            transition: all 0.3s ease;
          }
          
          .day-card:hover {
            border-color: #fbbf24;
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(251, 191, 36, 0.3);
          }
          
          .day-card.today {
            border: 3px solid #fbbf24;
            background: rgba(251, 191, 36, 0.1);
          }
          
          .category-checkbox {
            width: 20px;
            height: 20px;
            cursor: pointer;
          }
          
          .memo-input {
            background: rgba(17, 24, 39, 0.8);
            border: 1px solid #4b5563;
            color: #f3f4f6;
            padding: 4px 8px;
            border-radius: 4px;
            width: 100%;
            font-size: 12px;
          }
          
          .memo-input:focus {
            outline: none;
            border-color: #fbbf24;
          }
        </style>
    </head>
    <body class="p-4 md:p-8">
        <div class="max-w-7xl mx-auto">
            <!-- タイトル -->
            <h1 class="dq-title text-2xl md:text-4xl text-center mb-8 py-4">
                諒のドラゴンクエスト2026
            </h1>
            
            <!-- パラメーター表示 -->
            <div class="dq-box rounded-lg p-6 mb-8">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="text-yellow-400 font-bold">
                        <div class="flex justify-between items-center mb-2">
                            <span><i class="fas fa-shield-alt"></i> 防御力（国語）Lv.<span id="defense-level">1</span></span>
                            <span class="text-2xl" id="defense-value">5</span>
                        </div>
                        <div class="param-bar" id="defense-bar" style="width: 5%"></div>
                    </div>
                    
                    <div class="text-red-400 font-bold">
                        <div class="flex justify-between items-center mb-2">
                            <span><i class="fas fa-fist-raised"></i> 攻撃力（算数）Lv.<span id="attack-level">1</span></span>
                            <span class="text-2xl" id="attack-value">5</span>
                        </div>
                        <div class="param-bar" id="attack-bar" style="width: 5%"></div>
                    </div>
                    
                    <div class="text-blue-400 font-bold">
                        <div class="flex justify-between items-center mb-2">
                            <span><i class="fas fa-bolt"></i> 力（基礎力）Lv.<span id="power-level">1</span></span>
                            <span class="text-2xl" id="power-value">5</span>
                        </div>
                        <div class="param-bar" id="power-bar" style="width: 5%"></div>
                    </div>
                    
                    <div class="text-green-400 font-bold">
                        <div class="flex justify-between items-center mb-2">
                            <span><i class="fas fa-heart"></i> 体力（漢字）Lv.<span id="hp-level">1</span></span>
                            <span class="text-2xl" id="hp-value">5</span>
                        </div>
                        <div class="param-bar" id="hp-bar" style="width: 5%"></div>
                    </div>
                </div>
                
                <div class="text-yellow-300 font-bold text-xl text-center mt-4">
                    <i class="fas fa-coins"></i> ゴールド: <span id="gold-value">0</span>G
                </div>
            </div>
            
            <!-- ボス出現エリア -->
            <div id="boss-area" class="hidden dq-box rounded-lg p-6 mb-8 boss-appear">
                <div class="text-center">
                    <div class="text-6xl mb-4">👹</div>
                    <h2 class="text-3xl font-bold text-red-500 mb-2" id="boss-name"></h2>
                    <p class="text-yellow-300 text-lg" id="boss-description"></p>
                    <p class="text-white mt-4 text-xl">があらわれた！</p>
                </div>
            </div>
            
            <!-- 今日の日付表示 -->
            <div class="text-center mb-6">
                <div class="inline-block bg-yellow-600 text-white px-6 py-3 rounded-lg text-xl font-bold">
                    今日: <span id="today-date"></span>
                </div>
            </div>
            
            <!-- カレンダー -->
            <div id="calendar" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          
          document.getElementById('today-date').textContent = 
            currentYear + '年' + currentMonth + '月' + currentDay + '日';
          
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
          }
          
          // カレンダー生成（日別表示）
          function generateCalendar() {
            const calendar = document.getElementById('calendar');
            calendar.innerHTML = '';
            
            // 今日から年末までの日付を生成
            const startDate = new Date(currentYear, currentMonth - 1, currentDay);
            const endDate = new Date(currentYear, 11, 31); // 12月31日
            
            const currentDate = new Date(startDate);
            
            while (currentDate <= endDate) {
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth() + 1;
              const day = currentDate.getDate();
              
              const dayCard = document.createElement('div');
              dayCard.className = 'day-card rounded-lg p-4';
              
              // 今日の日付には特別なスタイル
              if (year === currentYear && month === currentMonth && day === currentDay) {
                dayCard.classList.add('today');
              }
              
              const dayTitle = document.createElement('h3');
              dayTitle.className = 'text-lg font-bold text-yellow-400 mb-3 text-center';
              dayTitle.textContent = month + '月' + day + '日';
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
                categoryDiv.className = 'mb-2';
                
                const labelDiv = document.createElement('div');
                labelDiv.className = 'flex items-center gap-2 mb-1';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'category-checkbox';
                checkbox.dataset.year = year;
                checkbox.dataset.month = month;
                checkbox.dataset.day = day;
                checkbox.dataset.category = category;
                checkbox.onchange = () => handleCheckboxChange(year, month, day, category, checkbox.checked);
                
                const label = document.createElement('label');
                label.className = 'text-white text-xs font-semibold';
                label.textContent = category;
                
                labelDiv.appendChild(checkbox);
                labelDiv.appendChild(label);
                
                const memoInput = document.createElement('input');
                memoInput.type = 'text';
                memoInput.className = 'memo-input';
                memoInput.placeholder = 'メモ...';
                memoInput.dataset.year = year;
                memoInput.dataset.month = month;
                memoInput.dataset.day = day;
                memoInput.dataset.category = category;
                
                categoryDiv.appendChild(labelDiv);
                categoryDiv.appendChild(memoInput);
                dayCard.appendChild(categoryDiv);
              });
              
              calendar.appendChild(dayCard);
              
              // 次の日へ
              currentDate.setDate(currentDate.getDate() + 1);
            }
          }
          
          // チェックボックス変更処理
          async function handleCheckboxChange(year, month, day, category, checked) {
            if (!checked) return;
            
            const memoInput = document.querySelector(\`input.memo-input[data-year="\${year}"][data-month="\${month}"][data-day="\${day}"][data-category="\${category}"]\`);
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
                // パラメーター再読み込み
                await loadParameters();
                
                // 成功メッセージ
                alert(\`\${month}月\${day}日の\${category}を記録しました！\\nパラメーターが上昇しました！\`);
                
                // チェックボックスを無効化
                const checkbox = document.querySelector(\`input.category-checkbox[data-year="\${year}"][data-month="\${month}"][data-day="\${day}"][data-category="\${category}"]\`);
                if (checkbox) {
                  checkbox.disabled = true;
                }
              }
            } catch (error) {
              console.error('記録エラー:', error);
              alert('記録に失敗しました');
            }
          }
          
          // 初期化
          loadParameters();
          generateCalendar();
        </script>
    </body>
    </html>
  `)
})

export default app
