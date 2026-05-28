import re
import os

files = [
    ("meghalaya-constituencies.ts", "MLConstituencySeed"),
    ("mizoram-constituencies.ts", "MZConstituencySeed"),
    ("nagaland-constituencies.ts", "NLConstituencySeed"),
    ("arunachal-pradesh-constituencies.ts", "ARConstituencySeed"),
]

dir_path = r"c:\Users\Laven\OneDrive\Desktop\Kshetra\data\seed"

for filename, interface_name in files:
    filepath = os.path.join(dir_path, filename)
    if not os.path.exists(filepath):
        print(f"Skipping {filename} - not found")
        continue

    print(f"Processing {filename}...")
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update interface definition to add localName?: string;
    # Locate: export interface INTERFACE_NAME {
    #   acNo: number;
    #   name: string;
    interface_pattern = rf"export interface\s+{interface_name}\s*\{{\s*acNo:\s*number;\s*name:\s*string;"
    
    replacement_interface = f"export interface {interface_name} {{\n  acNo: number;\n  name: string;\n  /** Constituency name in local script */\n  localName?: string;"
    
    new_content = re.sub(interface_pattern, replacement_interface, content)
    if new_content == content:
        print(f"Failed to update interface in {filename} or already updated")

    # 2. Add localName: 'NAME' in each constituency object.
    # Look for objects: { acNo: X, name: 'NAME', ... }
    def replacer(match):
        obj_str = match.group(0)
        # Find the name field
        name_match = re.search(r"name:\s*'([^']+)'", obj_str)
        if name_match:
            name_val = name_match.group(1)
            # Insert localName right after name
            if "localName:" not in obj_str:
                updated_obj = obj_str.replace(f"name: '{name_val}'", f"name: '{name_val}', localName: '{name_val}'")
                return updated_obj
        return obj_str

    object_pattern = r"\{\s*acNo:\s*\d+,\s*name:\s*'[^']+',[^\}]+\}"
    final_content = re.sub(object_pattern, replacer, new_content)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(final_content)
    
    print(f"Successfully processed {filename}")
