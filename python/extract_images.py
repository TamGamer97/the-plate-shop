#!/usr/bin/env python3
"""
Extract images from MHTML file and save them as separate image files
"""
import re
import base64
import os
import quopri
from urllib.parse import unquote

def extract_images_from_mhtml(mhtml_file):
    """Extract all images from MHTML file"""
    with open(mhtml_file, 'rb') as f:
        content = f.read()
    
    # Decode quoted-printable encoding
    try:
        text_content = quopri.decodestring(content).decode('utf-8', errors='ignore')
    except:
        try:
            text_content = content.decode('utf-8', errors='ignore')
        except:
            text_content = content.decode('latin-1', errors='ignore')
    
    # Create images directory
    os.makedirs('images', exist_ok=True)
    
    # Split by multipart boundary
    parts = re.split(r'------MultipartBoundary[^\r\n]+------', text_content)
    
    extracted_images = []
    
    for part in parts:
        # Look for image content type
        if 'Content-Type: image/' not in part:
            continue
        
        # Extract content type
        content_type_match = re.search(r'Content-Type:\s*(image/[^\r\n]+)', part)
        if not content_type_match:
            continue
        
        content_type = content_type_match.group(1).strip()
        
        # Extract content location
        location_match = re.search(r'Content-Location:\s*([^\r\n]+)', part)
        if not location_match:
            continue
        
        content_location = location_match.group(1).strip()
        
        # Extract base64 data (everything after the blank line after headers)
        # Find the blank line that separates headers from data
        header_end = part.find('\n\n')
        if header_end == -1:
            header_end = part.find('\r\n\r\n')
        
        if header_end == -1:
            continue
        
        base64_section = part[header_end:].strip()
        
        # Clean up base64 data (remove whitespace and newlines)
        base64_data = re.sub(r'[\s\r\n]', '', base64_section)
        
        # Extract filename from Content-Location
        filename = content_location.split('/')[-1]
        # Remove query parameters
        filename = filename.split('?')[0]
        # URL decode
        filename = unquote(filename)
        
        # Determine file extension from content type
        ext_map = {
            'image/webp': 'webp',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif'
        }
        
        ext = ext_map.get(content_type.split(';')[0].strip(), 'webp')
        
        # If filename doesn't have extension, add one
        if not filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif')):
            filename = f"{filename}.{ext}"
        
        # Clean filename (remove invalid characters)
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        
        # Skip if no base64 data
        if not base64_data or len(base64_data) < 100:
            continue
        
        try:
            # Decode base64 (ensure it's bytes)
            if isinstance(base64_data, str):
                base64_data = base64_data.encode('ascii', errors='ignore')
            image_data = base64.b64decode(base64_data)
            
            # Verify it's actually image data (check magic bytes)
            if len(image_data) < 10:
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
            print(f"Error extracting {filename}: {e}")
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
    print("\nExtracted images:")
    for img in images:
        print(f"  - {img['filename']} ({img['size']} bytes)")

