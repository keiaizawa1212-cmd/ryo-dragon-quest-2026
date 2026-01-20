-- ボス討伐記録テーブル
CREATE TABLE IF NOT EXISTS boss_defeats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boss_level INTEGER NOT NULL UNIQUE,
  defeated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_boss_defeats_level ON boss_defeats(boss_level);
