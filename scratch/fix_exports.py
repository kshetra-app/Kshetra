import os

data_ts_path = r"c:\Users\Laven\OneDrive\Desktop\Kshetra\apps\mobile\lib\data.ts"

with open(data_ts_path, 'r', encoding='utf-8') as f:
    content = f.read()

state_prefixes = [
    'TN', 'KL', 'WB', 'UP', 'BR', 'JK', 'RJ', 'GJ', 'DL', 'PB', 'HR', 'CG',
    'MP', 'JH', 'OD', 'AS', 'GA', 'HP', 'MN', 'ML', 'MZ', 'NL', 'TR', 'SK',
    'AR', 'UK', 'PY'
]

# We want to replace getAllXXTrivia with getXXAllTrivia
# For example, getAllTNTrivia -> getTNAllTrivia
for prefix in state_prefixes:
    old_fn = f"getAll{prefix}Trivia"
    new_fn = f"get{prefix}AllTrivia"
    content = content.replace(old_fn, new_fn)
    print(f"Replacing {old_fn} with {new_fn}")

with open(data_ts_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("data.ts export functions updated successfully.")
