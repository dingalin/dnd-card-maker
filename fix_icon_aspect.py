"""
Script to make all damage icons square by cropping to center
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
    
    # Crop to square (use minimum dimension, center crop)
    min_dim = min(w, h)
    left = (w - min_dim) // 2
    top = (h - min_dim) // 2
    right = left + min_dim
    bottom = top + min_dim
    
    cropped = img.crop((left, top, right, bottom))
    cropped.save(icon_path)
    print(f"Fixed: {icon_name} ({w}x{h}) -> ({min_dim}x{min_dim})")

print("Done!")
