CREATE TABLE user_links
(
    discord_id TEXT PRIMARY KEY,
    ap_slot    TEXT,
    roles      TEXT
);

CREATE TABLE messages
(
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER,
    source    TEXT,
    type      TEXT,
    content   TEXT,
    sender    TEXT
);

CREATE TABLE received_items
(
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER,
    slot_name TEXT,
    team      INTEGER,
    item_name TEXT,
    sender    TEXT
);