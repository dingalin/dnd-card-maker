"""
Regenerate damage icons from sheets with proper square padding (not cropping)
"""
from PIL import Image
import os

ICON_DIR = "public/assets/icons/damage"

# Sheet configurations: (sheet_file, icon_names)
# Each sheet is 4x2 grid = 8 icons
sheets_config = [
    ("sheet1.png", [
        "fire", "cold", "lightning", "thunder",
        "acid", "poison", "necrotic", "radiant"
    ]),
    ("sheet2.png", [
        "force", "psychic", "bludgeoning", "piercing",
        "slashing", "spell", None, None  # Only 6 icons in sheet2
    ]),
]

COLS = 4
ROWS = 2

def make_square_with_padding(img):
    """Make image square by adding transparent padding (not cropping)"""
    w, h = img.size
    if w == h:
        return img
    
    max_dim = max(w, h)
    new_img = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))
    paste_x = (max_dim - w) // 2
    paste_y = (max_dim - h) // 2
    new_img.paste(img, (paste_x, paste_y))
    return new_img

def process_sheet(sheet_file, icon_names):
    sheet_path = os.path.join(ICON_DIR, sheet_file)
    if not os.path.exists(sheet_path):
        print(f"Sheet not found: {sheet_path}")
        return
    
    img = Image.open(sheet_path)
    width, height = img.size
    
    icon_width = width // COLS
    icon_height = height // ROWS
    
    print(f"Processing {sheet_file}: {width}x{height}, icon size: {icon_width}x{icon_height}")
    
    for row in range(ROWS):
        for col in range(COLS):
            idx = row * COLS + col
            if idx >= len(icon_names) or icon_names[idx] is None:
                continue
            
            icon_name = icon_names[idx]
            
            left = col * icon_width
            top = row * icon_height
            right = left + icon_width
            bottom = top + icon_height
            
            icon = img.crop((left, top, right, bottom))
            
            # Make square with padding
            icon_square = make_square_with_padding(icon)
            
            output_path = os.path.join(ICON_DIR, f"{icon_name}.png")
            icon_square.save(output_path, "PNG")
            print(f"  Saved: {icon_name}.png ({icon_square.size[0]}x{icon_square.size[1]})")

if __name__ == "__main__":
    for sheet_file, icon_names in sheets_config:
        process_sheet(sheet_file, icon_names)
    print("Done!")
