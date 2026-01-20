-- 学習記録テーブル
CREATE TABLE IF NOT EXISTS learning_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  category TEXT NOT NULL,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- パラメーターテーブル
CREATE TABLE IF NOT EXISTS parameters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  defense INTEGER DEFAULT 5,          -- 防御力（国語）
  attack INTEGER DEFAULT 5,           -- 攻撃力（算数）
  power INTEGER DEFAULT 5,            -- 力（基礎力完成テスト）
  hp INTEGER DEFAULT 5,               -- 体力（四谷大塚漢字）
  gold INTEGER DEFAULT 0,             -- ゴールド
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初期パラメーター挿入
INSERT INTO parameters (defense, attack, power, hp, gold) 
VALUES (5, 5, 5, 5, 0);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_learning_records_date ON learning_records(year, month, day);
CREATE INDEX IF NOT EXISTS idx_learning_records_category ON learning_records(category);
