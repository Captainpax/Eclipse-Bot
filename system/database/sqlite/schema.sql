CREATE TABLE IF NOT EXISTS linked_users
(
    user_id     TEXT PRIMARY KEY,
    player_name TEXT,
    roles       TEXT
);

CREATE TABLE IF NOT EXISTS messages
(
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER,
    source    TEXT,
    type      TEXT,
    content   TEXT,
    sender    TEXT
);

CREATE TABLE IF NOT EXISTS received_items
(
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER,
    slot_name TEXT,
    team      INTEGER,
    item_name TEXT,
    sender    TEXT
);
