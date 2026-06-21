import urllib.request, json, urllib.error, uuid
req = urllib.request.Request(
    'https://kssgmycjrpsvqpkuvngs.supabase.co/auth/v1/signup',
    data=json.dumps({"email": f"test_{uuid.uuid4().hex}@test.com", "password": "password123"}).encode('utf-8'),
    headers={'apikey': 'sb_publishable_BrPKomeVMFZm9DDNy0iCKQ_Fvteybur', 'Content-Type': 'application/json'}
)
try:
    response = urllib.request.urlopen(req)
    print("Success:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode('utf-8'))
