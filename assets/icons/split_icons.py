"""
Icon Sheet Splitter
Splits icon sheets into individual icons.
Each sheet has 4x2 = 8 icons arranged in a grid.
"""

from PIL import Image
import os

# Configuration
ICONS_DIR = r"c:\Users\GOD\Downloads\dnd card creator\assets\icons"
COLS = 4  # 4 icons per row
ROWS = 2  # 2 rows

# Icon names for sheet 1 (based on original uploaded image order)
sheet1_names = [
    "icon-spellbook",    # API/Magic book
    "icon-d20",          # Level (red d20) 
    "icon-swords",       # Type (crossed swords)
    "icon-amulet",       # Ability (amulet)
    "icon-scroll",       # Background (scroll)
    "icon-chest",        # Gallery (treasure chest)
    "icon-potion",       # Create (potion)
    "icon-coins",        # Price (gold coins)
]

# Icon names for sheet 2
sheet2_names = [
    "icon-quill",        # Text (feather quill)
    "icon-brush",        # Image (paintbrush)
    "icon-gear",         # Edit (gear)
    "icon-magnifier",    # Search
    "icon-shield",       # Save
    "icon-floppy",       # Download
    "icon-crown",        # User
    "icon-map",          # Language (world map)
]

def split_sheet(sheet_path, icon_names):
    """Split a sheet into individual icons"""
    img = Image.open(sheet_path)
    width, height = img.size
    
    icon_width = width // COLS
    icon_height = height // ROWS
    
    print(f"Sheet size: {width}x{height}")
    print(f"Icon size: {icon_width}x{icon_height}")
    
    icons = []
    for row in range(ROWS):
        for col in range(COLS):
            idx = row * COLS + col
            if idx >= len(icon_names):
                break
                
            left = col * icon_width
            top = row * icon_height
            right = left + icon_width
            bottom = top + icon_height
            
            icon = img.crop((left, top, right, bottom))
            output_path = os.path.join(ICONS_DIR, f"{icon_names[idx]}.png")
            icon.save(output_path, "PNG")
            print(f"Saved: {icon_names[idx]}.png")
            icons.append(output_path)
    
    return icons

if __name__ == "__main__":
    print("=== Splitting Sheet 1 ===")
    split_sheet(os.path.join(ICONS_DIR, "1.png"), sheet1_names)
    
    print("\n=== Splitting Sheet 2 ===")
    split_sheet(os.path.join(ICONS_DIR, "2.png"), sheet2_names)
    
    print("\n✅ Done! All icons saved.")
