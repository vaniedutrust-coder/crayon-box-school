#!/usr/bin/env python3
"""
Crayon Box School — HTML Image Modernizer & Performance Booster
1. Converts <img> to <picture> with .webp and fallback .jpg/.png
2. Injects width & height attributes to eliminate Cumulative Layout Shift (CLS)
3. Adds loading="lazy" and decoding="async" to below-the-fold images
4. Ensures loading="eager", fetchpriority="high", decoding="async" for LCP hero images
5. Injects script.js where missing to ensure interactive modals & lightboxes work seamlessly
"""

import os
import re
import glob

IMG_DIMS = {
    'hero-students': (1600, 900),
    'life-sports': (1600, 900),
    'campus-building-exterior': (1600, 900),
    'kids-running-grass': (1600, 900),
    'stage-primary': (1600, 900),
    'hpc-students': (1600, 900),
    'life-campus': (1600, 900),
    'parent-partnership': (1600, 900),
    'stage-middle': (1600, 900),
    'kg-spotlight': (1600, 900),
    'stage-kindergarten': (1600, 900),
    'school-community-mega': (1800, 725),
    'faculty-mentoring': (1600, 900),
    'k12-horizon-student': (1600, 900),
    'stage-senior': (1600, 900),
    'life-arts': (1600, 900),
    'faculty-culture': (1600, 900),
    'life-science': (1600, 900),
    'annual-day-paigaam': (1600, 900),
    'life-celebrations': (1600, 900),
    'life-classrooms': (1600, 900),
    'kindergarten-birthday': (1600, 900),
    'sports-trophy-awards': (1400, 788),
    'parent-app-connect': (1400, 788),
    'excursion-india-gate': (900, 1600),
    'dance-performance-stage': (900, 1600),
    'celebration-republic-day': (900, 1600),
    'alumni-female': (800, 800),
    'alumni-male': (800, 800),
    '404-explorers': (579, 462),
    'cb-logo-circular': (48, 48),
}

def transform_tag(match):
    full_tag = match.group(0)
    # Don't touch if lightbox dynamic placeholder or data uri
    if 'id="lightboxImg"' in full_tag or 'data:image' in full_tag:
        return full_tag

    src_match = re.search(r'src=["\']([^"\']+)["\']', full_tag)
    if not src_match:
        return full_tag
    src = src_match.group(1)
    base, ext = os.path.splitext(src)
    if ext.lower() not in ('.jpg', '.jpeg', '.png'):
        return full_tag

    webp_file = f'{base}.webp'
    if not os.path.exists(webp_file):
        return full_tag

    tag = full_tag
    # Clean up any trailing space or slash before closing bracket
    tag = re.sub(r'\s*/?>$', '', tag).strip()

    # Determine if it's an above-the-fold hero image
    is_hero = 'hero-img' in tag or 'fetchpriority="high"' in tag or 'campus-hero-img' in tag

    # Inject dimensions if not present
    if base in IMG_DIMS:
        w, h = IMG_DIMS[base]
        if 'width=' not in tag and 'height=' not in tag:
            tag += f' width="{w}" height="{h}"'

    # Ensure decoding="async"
    if 'decoding=' not in tag:
        tag += ' decoding="async"'

    # Handle loading & fetchpriority
    if is_hero:
        if 'loading="lazy"' in tag:
            tag = tag.replace('loading="lazy"', 'loading="eager"')
        elif 'loading=' not in tag:
            tag += ' loading="eager"'
        if 'fetchpriority=' not in tag:
            tag += ' fetchpriority="high"'
    else:
        if 'loading=' not in tag and 'brand-logo' not in tag:
            tag += ' loading="lazy"'

    tag += '>'

    return f'<picture><source srcset="{webp_file}" type="image/webp">{tag}</picture>'

def process_html_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Step 1: Temporarily tokenize existing <picture> blocks so we never double-wrap
    token_map = {}
    def save_picture(m):
        key = f'__PICTURE_BLOCK_{len(token_map)}__'
        token_map[key] = m.group(0)
        return key

    tokenized = re.sub(r'<picture>.*?</picture>', save_picture, content, flags=re.DOTALL)

    # Step 2: Transform all standalone <img> tags
    updated = re.sub(r'<img[^>]+>', transform_tag, tokenized)

    # Step 3: Restore tokenized picture blocks
    for key, val in token_map.items():
        updated = updated.replace(key, val)

    # Step 4: Add script.js if missing
    if 'script.js' not in updated and '</body>' in updated and file_path not in ('admin.html',):
        updated = updated.replace('</body>', '  <script src="script.js" defer></script>\n</body>')

    if updated != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(updated)
        print(f"Updated: {file_path}")
    else:
        print(f"No changes: {file_path}")

def main():
    html_files = sorted(glob.glob('*.html'))
    print(f"Processing {len(html_files)} HTML files...")
    for h in html_files:
        process_html_file(h)
    print("HTML image modernization completed successfully!")

if __name__ == '__main__':
    main()
