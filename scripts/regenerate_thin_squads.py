#!/usr/bin/env python3
"""
Regenerate thin (< 15 player) squad files using the Fjelstul World Cup Database.
Preserves existing hand-crafted ratings for players already in the file;
fills in the rest from the database with computed ratings.

Run from the 5aside/ directory: python3 scripts/regenerate_thin_squads.py
"""
import csv, json, random, re, io, os
from collections import defaultdict
from urllib.request import urlopen, Request

SQUADS_URL = "https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-csv/squads.csv"
GOALS_URL  = "https://raw.githubusercontent.com/jfjelstul/worldcup/master/data-csv/goals.csv"
SQUADS_DIR = "public/data/squads"
INDEX_PATH = "public/data/index.json"
MIN_PLAYERS = 15  # squads below this are regenerated

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

# Map index.json team names → possible DB team names
DB_NAME_MAP = {
    "Brazil":       ["Brazil"],
    "Argentina":    ["Argentina"],
    "France":       ["France"],
    "Germany":      ["Germany", "West Germany"],
    "Italy":        ["Italy"],
    "Spain":        ["Spain"],
    "Netherlands":  ["Netherlands"],
    "England":      ["England"],
    "Portugal":     ["Portugal"],
    "Croatia":      ["Croatia"],
    "Belgium":      ["Belgium"],
    "Uruguay":      ["Uruguay"],
    "Cameroon":     ["Cameroon"],
    "Senegal":      ["Senegal"],
    "Morocco":      ["Morocco"],
    "South Korea":  ["South Korea"],
    "USA":          ["United States"],
    "Poland":       ["Poland"],
    "Denmark":      ["Denmark"],
    "Sweden":       ["Sweden"],
    "Colombia":     ["Colombia"],
    "Mexico":       ["Mexico"],
}

def main():
    random.seed(99)

    print("Fetching squads CSV…")
    squads_rows = fetch_csv(SQUADS_URL)
    print(f"  {len(squads_rows):,} rows")

    print("Fetching goals CSV…")
    goals_rows = fetch_csv(GOALS_URL)
    print(f"  {len(goals_rows):,} rows")

    # goals_map: (player_id, year) → goals
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

    # Load index
    with open(INDEX_PATH) as f:
        index = json.load(f)

    updated = 0

    for entry in index:
        key        = entry["key"]
        squad_path = os.path.join(SQUADS_DIR, f"{key}.json")

        if not os.path.exists(squad_path):
            continue

        with open(squad_path) as f:
            existing = json.load(f)

        if len(existing["players"]) >= MIN_PLAYERS:
            continue  # already full

        team_display = existing["team"]
        year         = existing["year"]
        flag         = existing["flag"]
        nation_code  = existing["nation_code"]

        # Build lookup of existing hand-crafted players (name → overall)
        existing_ratings = {}
        for p in existing["players"]:
            # Normalise name for fuzzy matching
            normed = slugify(p["name"])
            existing_ratings[normed] = p["overall"]

        # Estimate tier_base from existing average
        if existing["players"]:
            tier_base = round(sum(p["overall"] for p in existing["players"]) / len(existing["players"]))
        else:
            tier_base = 75

        # Try to find DB rows
        db_names = DB_NAME_MAP.get(team_display, [team_display])
        db_rows = []
        for db_name in db_names:
            rows = squad_map.get((db_name.lower(), year), [])
            if rows:
                db_rows = rows
                break

        if not db_rows:
            print(f"  MISS  {key} (no DB match)")
            continue

        squad_players = []
        for row in db_rows:
            pid      = row.get("player_id", "")
            pos      = pos_map(row)
            name     = full_name(row)
            shirt    = row.get("shirt_number", "99") or "99"
            try: shirt_num = int(shirt)
            except: shirt_num = 99

            # Check if hand-crafted rating exists for this player
            normed = slugify(name)
            if normed in existing_ratings:
                overall = existing_ratings[normed]
            else:
                goals     = goals_map.get((pid, year), 0)
                goals_bon = min(goals * 2, 10)
                shirt_bon = max(0, (12 - shirt_num) * 0.5) if shirt_num <= 11 else 0
                pos_adj   = {"GK": 0, "DEF": -2, "MID": 0, "FWD": 2}[pos]
                noise     = random.randint(-4, 5)
                overall   = int(round(tier_base + pos_adj + goals_bon + shirt_bon + noise))
                overall   = max(55, min(96, overall))

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

        out = {
            "team":        team_display,
            "year":        year,
            "nation_code": nation_code,
            "flag":        flag,
            "players":     squad_players,
        }

        with open(squad_path, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2, ensure_ascii=False)

        print(f"  ✓ {key}: {len(existing['players'])} → {len(squad_players)} players")
        updated += 1

    print(f"\n✅  Regenerated {updated} squads")

if __name__ == "__main__":
    main()
