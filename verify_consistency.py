import requests
import json
import time

URL = "http://localhost:8000/agent/compliance/run"
FILE_PATH = "test_policy.txt"

def run_test(run_number):
    print(f"--- Running Test #{run_number} ---")
    with open(FILE_PATH, 'rb') as f:
        files = {'file': (FILE_PATH, f)}
        headers = {'X-Internal-Service': 'grc-gateway'}
        response = requests.post(URL, files=files, headers=headers)
        
    if response.status_code == 200:
        data = response.json()
        # Remove report_id and timestamp as they are expected to change
        data.pop('report_id', None)
        if 'metadata' in data:
            data['metadata'].pop('timestamp', None)
        return data
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return None

results = []
for i in range(1, 4):
    res = run_test(i)
    if res:
        results.append(res)
    time.sleep(2)

print("\n--- CONSISTENCY VERIFICATION ---")
if len(results) < 2:
    print("Not enough results to compare.")
else:
    match = True
    for i in range(len(results) - 1):
        if results[i] != results[i+1]:
            print(f"Run {i+1} and Run {i+2} differ!")
            match = False
            # Find differences
            r1 = json.dumps(results[i], sort_keys=True)
            r2 = json.dumps(results[i+1], sort_keys=True)
            if r1 != r2:
                 # Print a small part of the diff
                 print("Differences detected in JSON content.")
    
    if match:
        print("SUCCESS: All runs produced identical results!")
        print(f"Method used: {results[0].get('method') or results[0].get('metadata', {}).get('analysis_method')}")
        print(f"Controls found: {len(results[0].get('controls_found', []))}")
        print(f"Gaps identified: {len(results[0].get('gaps', []))}")
