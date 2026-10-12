#!/usr/bin/env python3
"""
Crayon Box School — Automated High-Performance Image Optimizer
Compresses and generates next-generation WebP formats and progressive JPEGs.
"""

import os
from PIL import Image

def optimize_images():
    backup_dir = '.orig_backup'
    os.makedirs(backup_dir, exist_ok=True)

    jpg_files = sorted([f for f in os.listdir('.') if f.lower().endswith(('.jpg', '.jpeg'))])
    png_files = ['cb-logo-circular.png', 'cb logo.png', '404-explorers.png', 'favicon.png', 'android-chrome-512x512.png']

    results = []

    print(f"{'Filename':32s} | {'Original':10s} | {'New JPG/PNG':12s} | {'WebP':10s} | {'Savings %':10s}")
    print("-" * 84)

    total_orig = 0
    total_opt = 0
    total_webp = 0

    # 1. Process JPEGs
    for filename in jpg_files:
        src_path = os.path.join(backup_dir, filename) if os.path.exists(os.path.join(backup_dir, filename)) else filename
        orig_size = os.path.getsize(src_path)
        total_orig += orig_size

        im = Image.open(src_path)
        if im.mode != 'RGB':
            im = im.convert('RGB')

        # Alumni portrait photos resize to 800x800 (retina sharp for 300px cards)
        if filename in ('alumni-female.jpg', 'alumni-male.jpg'):
            im = im.resize((800, 800), Image.Resampling.LANCZOS)

        # Save Progressive Optimized JPEG
        im.save(filename, format='JPEG', quality=82, optimize=True, progressive=True)
        new_jpg_size = os.path.getsize(filename)
        total_opt += new_jpg_size

        # Generate Modern WebP
        webp_name = os.path.splitext(filename)[0] + '.webp'
        im.save(webp_name, format='WEBP', quality=82, method=6)
        webp_size = os.path.getsize(webp_name)
        total_webp += webp_size

        savings_pct = (1.0 - (webp_size / orig_size)) * 100.0
        print(f"{filename:32s} | {orig_size/1024:8.1f} KB | {new_jpg_size/1024:10.1f} KB | {webp_size/1024:8.1f} KB | -{savings_pct:6.1f}%")

    # 2. Process Logo & PNGs
    for filename in png_files:
        if not os.path.exists(filename):
            continue
        src_path = os.path.join(backup_dir, filename) if os.path.exists(os.path.join(backup_dir, filename)) else filename
        orig_size = os.path.getsize(src_path)
        total_orig += orig_size

        im = Image.open(src_path)

        # Logos resized to 512x512 (10x retina for 52px displayed crest)
        if filename in ('cb-logo-circular.png', 'cb logo.png'):
            im_resized = im.resize((512, 512), Image.Resampling.LANCZOS)
            im_resized.save(filename, format='PNG', optimize=True, compress_level=9)
            new_png_size = os.path.getsize(filename)
            total_opt += new_png_size

            # WebP version
            webp_name = os.path.splitext(filename)[0] + '.webp'
            im_resized.save(webp_name, format='WEBP', quality=95, method=6)
            webp_size = os.path.getsize(webp_name)
            total_webp += webp_size
        elif filename == '404-explorers.png':
            im.save(filename, format='PNG', optimize=True, compress_level=9)
            new_png_size = os.path.getsize(filename)
            total_opt += new_png_size

            webp_name = '404-explorers.webp'
            im.save(webp_name, format='WEBP', quality=85, method=6)
            webp_size = os.path.getsize(webp_name)
            total_webp += webp_size
        else:
            im.save(filename, format='PNG', optimize=True, compress_level=9)
            new_png_size = os.path.getsize(filename)
            total_opt += new_png_size
            webp_size = new_png_size

        savings_pct = (1.0 - (webp_size / orig_size)) * 100.0
        print(f"{filename:32s} | {orig_size/1024:8.1f} KB | {new_png_size/1024:10.1f} KB | {webp_size/1024:8.1f} KB | -{savings_pct:6.1f}%")

    print("=" * 84)
    print(f"ORIGINAL ASSET TOTAL:       {total_orig / (1024*1024):6.2f} MB")
    print(f"OPTIMIZED JPEG/PNG TOTAL:   {total_opt / (1024*1024):6.2f} MB (-{(1.0 - total_opt/total_orig)*100:.1f}%)")
    print(f"MODERN WEBP ASSET TOTAL:    {total_webp / (1024*1024):6.2f} MB (-{(1.0 - total_webp/total_orig)*100:.1f}%)")
    print(f"NET DATA REDUCTION:         {(total_orig - total_webp) / (1024*1024):6.2f} MB saved!")

if __name__ == '__main__':
    optimize_images()
