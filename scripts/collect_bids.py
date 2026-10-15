"""BidRadar public feed: fail closed rather than publish invented or stale bids."""
import csv, io, json, os, re, urllib.request
from datetime import datetime, timezone
from pathlib import Path

SOURCE = os.getenv("BIDRADAR_CSV_URL", "")
KEYWORDS = re.compile(
    r"construction|renovation|remodel|rehabilitat|repair|paving|asphalt|concrete|roof|plumb|electrical|hvac|mechanical|grading|excavat|demolition|building improvement|public works|landscap|seismic|water main|sewer|storm drain|bridge|roadway|sidewalk|engineering|architect",
    re.I
)

def pick(row, *names):
    lookup = {str(k).strip().lower().replace("_", " "): v for k, v in row.items()}
    for name in names:
        value = lookup.get(name.lower())
        if value:
            return str(value).strip()
    return ""

def infer_trade(text):
    t = text.lower()
    if re.search(r"architect", t):
        return "Architecture"
    if re.search(r"hvac|mechanical", t):
        return "HVAC"
    if re.search(r"electrical", t):
        return "Electrical"
    if re.search(r"plumb", t):
        return "Plumbing"
    if re.search(r"roof", t):
        return "Roofing"
    if re.search(r"landscap", t):
        return "Landscaping"
    if re.search(r"engineering", t):
        return "Engineering"
    if re.search(r"civil|paving|asphalt|concrete|grading|excavat|roadway|bridge|sidewalk|sewer|water main|storm drain", t):
        return "Civil"
    if re.search(r"construction|renovation|remodel|rehabilitat|repair|demolition|building improvement|public works|seismic", t):
        return "Construction"
    return "Unclassified"

def process_csv_data(raw_csv, source_url):
    rows = list(csv.DictReader(io.StringIO(raw_csv.decode("utf-8-sig"))))
    if not rows:
        raise ValueError("Source returned no rows")
    bids = {}
    now = datetime.now(timezone.utc)
    for row in rows:
        title = pick(row, "title", "solicitation title", "project title", "bid title", "description")
        detail = pick(row, "description", "scope", "project description")
        if not title or not KEYWORDS.search(title + " " + detail):
            continue
        url = pick(row, "url", "link", "solicitation url", "bid url", "notice url")
        if not url.startswith("https://"):
            continue
        deadline = pick(row, "closing date", "due date", "bid due date", "deadline")
        agency = pick(row, "department", "agency", "organization", "issuing department")
        number = pick(row, "solicitation number", "bid number", "id", "number")
        key = number or url
        trade = infer_trade(title + " " + detail)
        bids[key] = {
            "title": title[:250],
            "agency": agency[:160],
            "deadline": deadline[:80],
            "trade": trade,
            "sourceUrl": url,
            "source": "LA County public procurement"
        }
    if not bids:
        raise ValueError("No source-linked construction records; retaining previous feed")
    return {
        "checkedAt": now.isoformat(),
        "total": len(bids),
        "source": source_url,
        "opportunities": list(bids.values())
    }

def main():
    if not SOURCE:
        print("BIDRADAR_CSV_URL not configured; no feed will be fabricated.")
        return
    if not SOURCE.startswith("https://"):
        raise ValueError("CSV source must be HTTPS")
    req = urllib.request.Request(SOURCE, headers={"User-Agent": "BidRadar-public-bid-monitor/1.0"})
    with urllib.request.urlopen(req, timeout=40) as resp:
        raw = resp.read(12_000_000)
    output = process_csv_data(raw, SOURCE)
    path = Path("data/construction-bids.json")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    print(f"Prepared {len(output['opportunities'])} source-linked candidate records. Review eligibility and deadlines at source.")

if __name__ == "__main__":
    main()
