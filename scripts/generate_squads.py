#!/usr/bin/env python3
"""
Generate squad JSON files from the Fjelstul World Cup Database.
Run from the 5aside/ directory:  python3 scripts/generate_squads.py
"""
import csv, json, random, re, io, os
from collections import defaultdict
from urllib.request import urlopen, Request

SQUADS_URL = "https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-csv/squads.csv"
GOALS_URL  = "https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-csv/goals.csv"
OUT_DIR    = "public/data/squads"
INDEX_PATH = "public/data/index.json"

def fetch_csv(url):
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req) as r:
        content = r.read().decode("utf-8")
    return list(csv.DictReader(io.StringIO(content)))

def pos_map(row):
    c = row.get("position_code", "").upper()
    if c == "GK": return "GK"
    if c == "DF": return "DEF"
    if c == "MF": return "MID"
    if c == "FW": return "FWD"
    n = row.get("position_name", "").lower()
    if "goal" in n: return "GK"
    if "defend" in n: return "DEF"
    if "mid" in n: return "MID"
    return "FWD"

def full_name(row):
    g = (row.get("given_name") or "").strip()
    f = (row.get("family_name") or "").strip()
    if g and f: return f"{g} {f}"
    return f or g or "Unknown"

def slugify(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")

def extract_year(tournament_name):
    m = re.match(r"(\d{4})", tournament_name or "")
    return int(m.group(1)) if m else 0

# ── TARGET TEAMS ─────────────────────────────────────────────────────────────
# (db_team_name, year, display_name, flag, nation_code, tier_base)
# tier_base = average overall for the squad (key players will be rated higher)
TARGET_TEAMS = [
    # ── ELITE / STRONG+ ──────────────────────────────────────────────────────
    ("Hungary",              1954, "Hungary",           "🇭🇺", "hu",     85),
    ("West Germany",         1966, "West Germany",      "🇩🇪", "de",     82),
    ("West Germany",         1970, "West Germany",      "🇩🇪", "de",     84),
    ("France",               2006, "France",            "🇫🇷", "fr",     81),
    ("England",              1970, "England",           "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "gb-eng", 80),
    ("England",              1982, "England",           "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "gb-eng", 76),
    ("England",              1986, "England",           "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "gb-eng", 77),
    ("England",              2006, "England",           "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "gb-eng", 78),
    ("England",              2010, "England",           "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "gb-eng", 77),
    ("England",              2014, "England",           "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "gb-eng", 76),
    ("Brazil",               1958, "Brazil",            "🇧🇷", "br",     88),
    ("Brazil",               1962, "Brazil",            "🇧🇷", "br",     86),
    ("Argentina",            1978, "Argentina",         "🇦🇷", "ar",     83),
    ("Italy",                1970, "Italy",             "🇮🇹", "it",     83),
    ("Italy",                1978, "Italy",             "🇮🇹", "it",     79),
    ("Spain",                2002, "Spain",             "🇪🇸", "es",     78),
    ("Germany",              2002, "Germany",           "🇩🇪", "de",     79),
    # ── STRONG ───────────────────────────────────────────────────────────────
    ("Yugoslavia",           1974, "Yugoslavia",        "🇷🇸", "rs",     77),
    ("Yugoslavia",           1982, "Yugoslavia",        "🇷🇸", "rs",     76),
    ("Soviet Union",         1966, "Soviet Union",      "🇷🇺", "ru",     79),
    ("Soviet Union",         1970, "Soviet Union",      "🇷🇺", "ru",     78),
    ("Soviet Union",         1982, "Soviet Union",      "🇷🇺", "ru",     77),
    ("Soviet Union",         1986, "Soviet Union",      "🇷🇺", "ru",     79),
    ("Peru",                 1970, "Peru",              "🇵🇪", "pe",     74),
    ("Peru",                 1978, "Peru",              "🇵🇪", "pe",     73),
    ("Romania",              1994, "Romania",           "🇷🇴", "ro",     76),
    ("Bulgaria",             1994, "Bulgaria",          "🇧🇬", "bg",     77),
    ("Mexico",               1986, "Mexico",            "🇲🇽", "mx",     75),
    ("Turkey",               2002, "Turkey",            "🇹🇷", "tr",     75),
    ("Japan",                2002, "Japan",             "🇯🇵", "jp",     72),
    ("Japan",                2010, "Japan",             "🇯🇵", "jp",     71),
    ("Czech Republic",       2006, "Czech Republic",    "🇨🇿", "cz",     76),
    ("Australia",            2006, "Australia",         "🇦🇺", "au",     74),
    ("Ghana",                2010, "Ghana",             "🇬🇭", "gh",     73),
    ("Ivory Coast",          2006, "Ivory Coast",       "🇨🇮", "ci",     74),
    ("Ivory Coast",          2010, "Ivory Coast",       "🇨🇮", "ci",     73),
    ("Paraguay",             2010, "Paraguay",          "🇵🇾", "py",     71),
    ("Ecuador",              2006, "Ecuador",           "🇪🇨", "ec",     70),
    ("United States",        2014, "USA",               "🇺🇸", "us",     72),
    ("South Korea",          2010, "South Korea",       "🇰🇷", "kr",     70),
    ("South Korea",          2014, "South Korea",       "🇰🇷", "kr",     70),
    ("Japan",                2018, "Japan",             "🇯🇵", "jp",     72),
    ("Mexico",               2014, "Mexico",            "🇲🇽", "mx",     74),
    ("Mexico",               2018, "Mexico",            "🇲🇽", "mx",     73),
    # ── DARK HORSE ───────────────────────────────────────────────────────────
    ("Nigeria",              1994, "Nigeria",           "🇳🇬", "ng",     73),
    ("Nigeria",              1998, "Nigeria",           "🇳🇬", "ng",     71),
    ("Republic of Ireland",  1990, "Rep. of Ireland",  "🇮🇪", "ie",     70),
    ("Scotland",             1974, "Scotland",          "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "gb-sct", 70),
    ("Scotland",             1978, "Scotland",          "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "gb-sct", 69),
    ("Scotland",             1982, "Scotland",          "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "gb-sct", 68),
    ("Greece",               2010, "Greece",            "🇬🇷", "gr",     68),
    ("Sweden",               1958, "Sweden",            "🇸🇪", "se",     74),
    ("Sweden",               1978, "Sweden",            "🇸🇪", "se",     70),
    ("Algeria",              2014, "Algeria",           "🇩🇿", "dz",     69),
    ("Costa Rica",           2014, "Costa Rica",        "🇨🇷", "cr",     70),
    ("Switzerland",          2006, "Switzerland",       "🇨🇭", "ch",     71),
    ("Switzerland",          2014, "Switzerland",       "🇨🇭", "ch",     72),
    ("Senegal",              2022, "Senegal",           "🇸🇳", "sn",     73),
    ("Morocco",              2022, "Morocco",           "🇲🇦", "ma",     74),  # already exists, will skip
    ("Tunisia",              2022, "Tunisia",           "🇹🇳", "tn",     67),
    ("Cameroon",             2002, "Cameroon",          "🇨🇲", "cm",     70),
    ("Cameroon",             2014, "Cameroon",          "🇨🇲", "cm",     68),
]

def main():
    random.seed(42)

    print("Fetching squads CSV…")
    squads_rows = fetch_csv(SQUADS_URL)
    print(f"  {len(squads_rows):,} rows")

    print("Fetching goals CSV…")
    goals_rows = fetch_csv(GOALS_URL)
    print(f"  {len(goals_rows):,} rows")

    # goals_map: (player_id, year) → tournament goals
    goals_map = defaultdict(int)
    for g in goals_rows:
        if g.get("own_goal", "0") == "1":
            continue
        pid  = g.get("player_id", "")
        year = extract_year(g.get("tournament_name", ""))
        if pid and year:
            goals_map[(pid, year)] += 1

    # squad_map: (team_name_lower, year) → [rows]
    squad_map = defaultdict(list)
    for row in squads_rows:
        tname = row.get("team_name", "").strip()
        year  = extract_year(row.get("tournament_name", ""))
        if tname and year:
            squad_map[(tname.lower(), year)].append(row)

    # Load existing index
    with open(INDEX_PATH) as f:
        index = json.load(f)
    existing_keys = {e["key"] for e in index}

    new_entries = []

    for (db_name, year, our_name, flag, nation_code, tier_base) in TARGET_TEAMS:
        key = f"{slugify(our_name)}_{year}"
        if key in existing_keys:
            print(f"  skip  {key}")
            continue

        # Lookup squad rows
        players_rows = squad_map.get((db_name.lower(), year), [])
        if not players_rows:
            # Try partial match
            matches = [(k, v) for (k, v) in squad_map if v == year and db_name.lower() in k]
            if matches:
                k0 = matches[0]
                players_rows = squad_map[k0]
                print(f"  ~match {key}: '{db_name}' → '{k0[0]}'")
            else:
                print(f"  MISS  {db_name} {year}")
                continue

        squad_players = []
        for row in players_rows:
            pid    = row.get("player_id", "")
            pos    = pos_map(row)
            name   = full_name(row)
            shirt  = row.get("shirt_number", "99") or "99"
            try: shirt_num = int(shirt)
            except: shirt_num = 99

            goals      = goals_map.get((pid, year), 0)
            goals_bon  = min(goals * 2, 10)
            shirt_bon  = max(0, (12 - shirt_num) * 0.5) if shirt_num <= 11 else 0
            pos_adj    = {"GK": 0, "DEF": -2, "MID": 0, "FWD": 2}[pos]
            noise      = random.randint(-4, 5)

            overall = int(round(tier_base + pos_adj + goals_bon + shirt_bon + noise))
            overall = max(55, min(96, overall))

            squad_players.append({
                "id":               f"{key}_{slugify(name)}",
                "name":             name,
                "position":         pos,
                "age_at_tournament": 26,
                "overall":          overall,
            })

        if not squad_players:
            print(f"  EMPTY {key}")
            continue

        squad_json = {
            "team":        our_name,
            "year":        year,
            "nation_code": nation_code,
            "flag":        flag,
            "players":     squad_players,
        }

        out_path = os.path.join(OUT_DIR, f"{key}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(squad_json, f, indent=2, ensure_ascii=False)
        print(f"  ✓     {key}: {len(squad_players)} players")

        # Tier for index
        if tier_base >= 83:
            tier, weight = "powerhouse", 2
        elif tier_base >= 75:
            tier, weight = "strong", 4
        else:
            tier, weight = "dark_horse", 10

        new_entries.append({
            "key":         key,
            "team":        our_name,
            "year":        year,
            "nation_code": nation_code,
            "flag":        flag,
            "weight":      weight,
            "tier":        tier,
        })

    if new_entries:
        index.extend(new_entries)
        with open(INDEX_PATH, "w", encoding="utf-8") as f:
            json.dump(index, f, indent=2, ensure_ascii=False)
        print(f"\n✅  Added {len(new_entries)} teams — index now has {len(index)} entries")
    else:
        print("\nNo new teams added.")

if __name__ == "__main__":
    main()
