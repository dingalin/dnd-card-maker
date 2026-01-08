"""
Script to pad icons to square with transparent margin
Instead of cropping, this adds padding to make icons square while keeping content centered
"""
from PIL import Image
import os

ICON_DIR = "public/assets/icons/damage"

# List of icon files to fix
icons = ["fire.png", "cold.png", "lightning.png", "thunder.png", "acid.png", 
         "poison.png", "necrotic.png", "radiant.png", "force.png", "psychic.png",
         "bludgeoning.png", "piercing.png", "slashing.png", "spell.png"]

for icon_name in icons:
    icon_path = os.path.join(ICON_DIR, icon_name)
    if not os.path.exists(icon_path):
        print(f"Not found: {icon_name}")
        continue
    
    img = Image.open(icon_path)
    w, h = img.size
    
    if w == h:
        print(f"Already square: {icon_name} ({w}x{h})")
        continue
    
    # Pad to square (use maximum dimension, add transparent padding)
    max_dim = max(w, h)
    
    # Create new image with transparent background
    new_img = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))
    
    # Paste original centered
    paste_x = (max_dim - w) // 2
    paste_y = (max_dim - h) // 2
    new_img.paste(img, (paste_x, paste_y))
    
    new_img.save(icon_path)
    print(f"Padded: {icon_name} ({w}x{h}) -> ({max_dim}x{max_dim})")

print("Done!")
