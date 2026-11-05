"""Build the linked chapter from the retained snapshot; never fetch source data."""
import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime
from pathlib import Path
import polars as pl

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--check', action='store_true', help='Verify the committed JSON without modifying it')
args = parser.parse_args()
rules_path = ROOT / 'data/flight-exploration-rules.json'
rules = json.loads(rules_path.read_text())
manifest = json.loads((ROOT / 'data/sources.json').read_text())
source = next(f for f in manifest['files'] if f['path'] == 'data/raw/planecrashdata.parquet')
raw_path = ROOT / source['path']
if hashlib.sha256(raw_path.read_bytes()).hexdigest() != source['sha256']:
    raise ValueError('Retained Parquet checksum mismatch; reconcile the source before rebuilding')
raw = pl.read_parquet(raw_path).to_dicts()
ids = [str(r['id']) for r in raw]
if len(ids) != len(set(ids)) or any(not i for i in ids):
    raise ValueError('Source IDs must be present and unique')
rows = []
period = rules['periods']
for r in raw:
    if any(r[k] != v for k,v in rules['filter'].items()):
        continue
    dt = datetime.fromisoformat(r['timestamp'].replace('Z', '+00:00'))
    if not period['start_inclusive'] <= dt.year < period['end_exclusive']:
        continue
    phase, cause = r['flight_phase'] or '', r['crash_cause'] or ''
    if phase not in rules['phase'] or cause not in rules['cause']:
        raise ValueError(f"Unmapped source categories for {r['id']}")
    rows.append([str(r['id']),rules['phase'][phase],rules['cause'][cause],dt.year,dt.date().isoformat(),phase,cause,r['aircraft'] or ''])
columns = ['source_id','phase','cause','year','date','raw_phase','raw_cause','aircraft']
records = [dict(zip(columns,r)) for r in rows]
bins = list(range(period['start_inclusive'],period['end_exclusive'],period['width_years']))
if len(bins) != period['count']:
    raise ValueError('Period policy must produce eleven equal bins')
if sum(sum(start <= r['year'] < start+period['width_years'] for r in records) for start in bins) != len(rows):
    raise ValueError('Periods must partition the cohort exactly once')
shown = rules['area_display']['causes']
payload = {
    'schema_version':1,
    'source':{'dataset':'MauroPello/planecrashdata','revision':manifest['huggingFaceRevision'],
              'url':source['url'],'sha256':source['sha256'],'format':'parquet',
              'retained_at':manifest['retrieved'],'license_as_declared':'CC-BY-4.0'},
    'rules':rules,'rules_sha256':hashlib.sha256(rules_path.read_bytes()).hexdigest(),
    'columns':columns,'rows':rows,
    'audit':{'source_records':len(raw),'cohort_records':len(rows),
             'phase_counts':dict(Counter(r['phase'] for r in records)),
             'cause_counts':dict(Counter(r['cause'] for r in records)),
             'displayed_records':sum(r['cause'] in shown for r in records),
             'excluded_from_area':sum(r['cause'] not in shown for r in records),
             'first_date':min(r['date'] for r in records),'last_date':max(r['date'] for r in records)}}
text = json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n'
output = ROOT / 'public/data/flight-exploration.json'
if args.check:
    if not output.exists() or output.read_text() != text:
        raise ValueError('Committed linked-view JSON differs from the retained source/rules; rebuild it')
else:
    output.write_text(text)
print(json.dumps(payload['audit'],indent=2))
