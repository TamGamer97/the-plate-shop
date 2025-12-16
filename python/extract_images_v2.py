#!/usr/bin/env python3
"""
Extract images from MHTML file - improved version
"""
import re
import base64
import os
from urllib.parse import unquote

def extract_images_from_mhtml(mhtml_file):
    """Extract all images from MHTML file"""
    with open(mhtml_file, 'rb') as f:
        raw_content = f.read()
    
    # Try different encodings
    try:
        content = raw_content.decode('utf-8', errors='ignore')
    except:
        content = raw_content.decode('latin-1', errors='ignore')
    
    # Create images directory
    os.makedirs('images', exist_ok=True)
    
    extracted_images = []
    
    # Find all image sections by looking for Content-Type: image/ patterns
    # Then find the corresponding Content-Location and base64 data
    pattern = r'Content-Type:\s*(image/[^\r\n]+).*?Content-Location:\s*([^\r\n]+).*?\r?\n\r?\n([A-Za-z0-9+/=\s]+?)(?=\r?\n------MultipartBoundary|$)'
    
    matches = re.finditer(pattern, content, re.DOTALL | re.MULTILINE)
    
    for idx, match in enumerate(matches):
        content_type = match.group(1).strip()
        content_location = match.group(2).strip()
        base64_data = match.group(3).strip()
        
        # Clean base64 data
        base64_data = re.sub(r'[\s\r\n]', '', base64_data)
        
        if len(base64_data) < 100:  # Too small to be a real image
            continue
        
        # Extract filename
        filename = content_location.split('/')[-1].split('?')[0]
        filename = unquote(filename)
        
        # Determine extension
        if 'webp' in content_type.lower():
            ext = 'webp'
        elif 'jpeg' in content_type.lower() or 'jpg' in content_type.lower():
            ext = 'jpg'
        elif 'png' in content_type.lower():
            ext = 'png'
        elif 'gif' in content_type.lower():
            ext = 'gif'
        else:
            ext = 'webp'
        
        # Clean filename
        if not filename or filename == '.' or not filename.endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif')):
            # Generate filename from index
            filename = f"image_{idx+1}.{ext}"
        else:
            # Clean invalid chars
            filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        
        try:
            # Decode base64
            image_bytes = base64_data.encode('ascii', errors='ignore')
            image_data = base64.b64decode(image_bytes)
            
            if len(image_data) < 100:  # Still too small
                continue
            
            # Save image
            filepath = os.path.join('images', filename)
            with open(filepath, 'wb') as img_file:
                img_file.write(image_data)
            
            extracted_images.append({
                'filename': filename,
                'filepath': filepath,
                'content_type': content_type,
                'size': len(image_data)
            })
            
            print(f"Extracted: {filename} ({len(image_data)} bytes)")
            
        except Exception as e:
            print(f"Error extracting image {idx+1}: {e}")
            continue
    
    return extracted_images

if __name__ == '__main__':
    mhtml_file = 'THE PLATE SHOP.mhtml'
    
    if not os.path.exists(mhtml_file):
        print(f"Error: {mhtml_file} not found!")
        exit(1)
    
    print(f"Extracting images from {mhtml_file}...")
    images = extract_images_from_mhtml(mhtml_file)
    
    print(f"\nExtracted {len(images)} images to 'images' directory")
    
    # Print summary
    if images:
        print("\nExtracted images:")
        for img in images:
            print(f"  - {img['filename']} ({img['size']} bytes)")

