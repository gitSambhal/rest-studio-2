import sys
import os
import zipfile

if len(sys.argv) < 4:
    print("Usage: zip-app.py <base_dir> <app_name> <zip_name>")
    sys.exit(1)

base_dir = sys.argv[1]
app_name = sys.argv[2]
zip_name = sys.argv[3]

zip_path = os.path.join(base_dir, zip_name)
app_path = os.path.join(base_dir, app_name)

if os.path.exists(zip_path):
    os.remove(zip_path)

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(app_path):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, base_dir)
            info = zipfile.ZipInfo(rel_path)
            if 'MacOS' in rel_path:
                info.external_attr = 0o100755 << 16
            else:
                info.external_attr = 0o100644 << 16
            with open(full_path, 'rb') as f:
                zf.writestr(info, f.read())

print(f"[Zip Helper] Created POSIX 0755 macOS Zip: {zip_path}")
