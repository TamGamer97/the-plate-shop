#!/usr/bin/env python3
"""
Simple image extractor from MHTML
"""
import re
import base64
import os
from urllib.parse import unquote

mhtml_file = 'THE PLATE SHOP.mhtml'
os.makedirs('images', exist_ok=True)

with open(mhtml_file, 'rb') as f:
    content = f.read().decode('utf-8', errors='ignore')

# Split by multipart boundaries
parts = content.split('------MultipartBoundary')

image_count = 0

for i, part in enumerate(parts):
    if 'Content-Type: image/' not in part:
        continue
    
    # Extract content type
    ct_match = re.search(r'Content-Type:\s*(image/[^\r\n]+)', part)
    if not ct_match:
        continue
    
    content_type = ct_match.group(1).strip()
    
    # Extract location
    loc_match = re.search(r'Content-Location:\s*([^\r\n]+)', part)
    if not loc_match:
        continue
    
    location = loc_match.group(1).strip()
    
    # Find base64 data (after blank line after headers)
    lines = part.split('\n')
    data_start = -1
    for j, line in enumerate(lines):
        if line.strip() == '' and j > 0:
            # Check if previous line was a header
            if 'Content-Location:' in lines[j-1] or 'Content-ID:' in lines[j-1]:
                data_start = j + 1
                break
    
    if data_start == -1:
        continue
    
    # Collect base64 data
    base64_lines = []
    for j in range(data_start, len(lines)):
        line = lines[j].strip()
        if line.startswith('------MultipartBoundary'):
            break
        if line and re.match(r'^[A-Za-z0-9+/=\s]+$', line):
            base64_lines.append(line)
    
    if not base64_lines:
        continue
    
    base64_data = ''.join(base64_lines).replace(' ', '').replace('\n', '').replace('\r', '')
    
    if len(base64_data) < 100:
        continue
    
    # Get filename
    filename = location.split('/')[-1].split('?')[0]
    filename = unquote(filename)
    
    if not filename or filename == '.':
        filename = f"image_{image_count+1}.webp"
    
    # Determine extension
    if 'webp' in content_type.lower():
        ext = 'webp'
    elif 'jpeg' in content_type.lower() or 'jpg' in content_type.lower():
        ext = 'jpg'
    elif 'png' in content_type.lower():
        ext = 'png'
    else:
        ext = 'webp'
    
    if not filename.endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif')):
        filename = f"{filename}.{ext}"
    
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    
    try:
        img_data = base64.b64decode(base64_data.encode('ascii', errors='ignore'))
        if len(img_data) < 100:
            continue
        
        filepath = os.path.join('images', filename)
        with open(filepath, 'wb') as img_file:
            img_file.write(img_data)
        
        image_count += 1
        print(f"Extracted: {filename} ({len(img_data)} bytes)")
    except Exception as e:
        print(f"Error: {e}")
        continue

print(f"\nExtracted {image_count} images")

