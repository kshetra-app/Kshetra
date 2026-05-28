import urllib.request
import json

url = "https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q7809367&format=json"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        p31 = data['entities']['Q7809367']['claims']['P31'][0]['mainsnak']['datavalue']['value']['id']
        print("P31 QID:", p31)
except Exception as e:
    print("Error:", e)
