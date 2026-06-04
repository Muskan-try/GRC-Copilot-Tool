import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'app'))
from services.scoring_engine import convertUSDToINR

def safe_build_cost_summary(recommendations):
    total_inr = sum(r.get('cost_inr', 0) for r in recommendations)
    critical_inr = sum(r.get('cost_inr', 0) for r in recommendations if r.get('priority') == 'critical')
    total_usd = sum(r.get('base_cost_usd', 0) for r in recommendations)
    critical_usd = sum(r.get('base_cost_usd', 0) for r in recommendations if r.get('priority') == 'critical')
    breakdown = {}
    for r in recommendations:
        cat = r.get('detail', 'General')[:30]
        breakdown[cat] = breakdown.get(cat, 0) + r.get('base_cost_usd', 0)
    items = []
    for r in recommendations:
        timeline = '0-3 months' if r.get('horizon') == 'short' else '3-6 months' if r.get('horizon') == 'mid' else '6-12 months'
        items.append({
            'label': r.get('title', ''),
            'category': r.get('horizon', ''),
            'base_cost_usd': r.get('base_cost_usd', 0),
            'cost_inr': r.get('cost_inr', 0),
            'timeline': timeline,
        })
    return {
        'total_inr': total_inr,
        'critical_inr': critical_inr,
        'total_usd': total_usd,
        'critical_usd': critical_usd,
        'breakdown': breakdown,
        'items': items,
    }

async def migrate():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.grc_copilot
    reports = await db.reports.find({}).to_list(None)
    updated = 0
    for r in reports:
        needs_update = False
        recs = r.get('recommendations', [])
        for rec in recs:
            if 'base_cost_usd' in rec:
                expected_inr = convertUSDToINR(rec['base_cost_usd'])
                if rec.get('cost_inr') != expected_inr:
                    rec['cost_inr'] = expected_inr
                    needs_update = True
        
        if recs:
            new_cost_summary = safe_build_cost_summary(recs)
            if r.get('cost_summary') != new_cost_summary:
                r['cost_summary'] = new_cost_summary
                needs_update = True
                
        if r.get('assessment_type') == 'ai_policy_scan' or r.get('framework') == 'AI Policy Upload':
            gaps = r.get('gap_analysis', r.get('gaps', []))
            if gaps:
                deductions = sum(15 if str(g.get('priority', '')).strip().title() == 'High' else 8 if str(g.get('priority', '')).strip().title() == 'Medium' else 3 for g in gaps)
                new_score = max(0, 100 - deductions)
                if float(r.get('compliance_score', 0)) != float(new_score):
                    r['compliance_score'] = float(new_score)
                    needs_update = True
                
        if needs_update:
            await db.reports.update_one({'_id': r['_id']}, {'$set': {
                'recommendations': recs,
                'cost_summary': r.get('cost_summary'),
                'compliance_score': r.get('compliance_score')
            }})
            updated += 1
            
    print(f'Successfully migrated {updated} legacy reports with the new rules.')
    client.close()

asyncio.run(migrate())
