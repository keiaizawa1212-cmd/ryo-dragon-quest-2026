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
  
  // 更新後のレベルを計算
  const newDefenseLevel = Math.floor(defense / 5) + 1;
  const newAttackLevel = Math.floor(attack / 5) + 1;
  const newPowerLevel = Math.floor(power / 5) + 1;
  const newHpLevel = Math.floor(hp / 5) + 1;
  
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
          
          /* 紙吹雪アニメーション */
          .confetti {
            position: fixed;
            width: 10px;
            height: 10px;
            background: #fbbf24;
            position: fixed;
            top: -10px;
            z-index: 9999;
            animation: confetti-fall 3s linear forwards;
          }
          
          @keyframes confetti-fall {
            to {
              transform: translateY(100vh) rotate(360deg);
              opacity: 0;
            }
          }
          
          /* レベルアップアニメーション */
          .levelup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.5s ease-in-out;
          }
          
          .levelup-text {
            font-family: 'Press Start 2P', cursive;
            font-size: 3rem;
            color: #fbbf24;
            text-shadow: 4px 4px 0px #000, -2px -2px 0px #fff;
            animation: levelupPulse 1s ease-in-out infinite;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes levelupPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
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
