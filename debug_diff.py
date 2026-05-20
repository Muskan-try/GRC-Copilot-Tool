import requests
import json
import time
import difflib

URL = "http://localhost:8000/agent/compliance/run"
FILE_PATH = "test_policy.txt"

def run_test(run_number):
    with open(FILE_PATH, 'rb') as f:
        files = {'file': (FILE_PATH, f)}
        headers = {'X-Internal-Service': 'grc-gateway'}
        response = requests.post(URL, files=files, headers=headers)
        
    if response.status_code == 200:
        data = response.json()
        data.pop('report_id', None)
        if 'metadata' in data:
            data['metadata'].pop('timestamp', None)
        return data
    return None

res1 = run_test(1)
time.sleep(1)
res2 = run_test(2)

s1 = json.dumps(res1, indent=2, sort_keys=True)
s2 = json.dumps(res2, indent=2, sort_keys=True)

if s1 == s2:
    print("MATCH")
else:
    print("DIFFERENCE DETECTED")
    diff = difflib.unified_diff(s1.splitlines(), s2.splitlines())
    print('\n'.join(list(diff)[:20])) # Show first 20 lines of diff
