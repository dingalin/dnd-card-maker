from PIL import Image
import os

def remove_white_bg(img, threshold=240):
    img = img.convert("RGBA")
    datas = img.getdata()

    newData = []
    for item in datas:
        # Check if pixel is close to white
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            newData.append((255, 255, 255, 0)) # Make transparent
        else:
            newData.append(item)

    img.putdata(newData)
    return img

def crop_grid(image_path, rows, cols, names):
    print(f"Processing {image_path}...")
    try:
        img = Image.open(image_path)
        img = remove_white_bg(img)
        
        width, height = img.size
        cell_width = width // cols
        cell_height = height // rows
        
        count = 0
        for r in range(rows):
            for c in range(cols):
                if count >= len(names):
                    break
                
                name = names[count]
                if name: # Skip if name is None/Empty
                    left = c * cell_width
                    top = r * cell_height
                    right = left + cell_width
                    bottom = top + cell_height
                    
                    # Add simple crop margin to avoid edges
                    margin = 20
                    crop_area = (left + margin, top + margin, right - margin, bottom - margin)
                    
                    icon = img.crop(crop_area)
                    
                    # Trim empty space around icon
                    bbox = icon.getbbox()
                    if bbox:
                        icon = icon.crop(bbox)
                        
                    # Save
                    output_path = f"assets/icons/damage/{name}.png"
                    icon.save(output_path)
                    print(f"  Saved {name}.png")
                
                count += 1
                
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

# Define sheets and their layouts
sheets = [
    {
        "file": "assets/icons/damage/sheet1.png",
        "rows": 2, "cols": 2, # Wait, let's verify visual - standard generation usually does 2x2 for 4 items, or 2x3 for 6.
        # Based on my prompt "Set of 6... arranged in 2 rows of 3" -> 2 rows, 3 cols seems likely for Sheet 1
        # But wait, looking at the image provided in chatHistory Step 1451 - it looks like 3 rows of 2? Or 2 cols?
        # Actually standard DALL-E/Imagen generation for "set of 6" often does 2x3 or 3x2.
        # Let's assume 3 rows of 2 columns for Sheet 1 based on the vertical aspect ratio often seen.
        "layout": (3, 2), 
        "names": ["fire", "cold", "lightning", "radiant", "necrotic", "psychic"]
    },
    {
        "file": "assets/icons/damage/sheet2.png", # 4 icons
        "rows": 2, "cols": 2,
        "layout": (2, 2),
        "names": ["acid", "poison", "thunder", "force"]
    },
    {
        "file": "assets/icons/damage/sheet3.png", # 4 icons
        "rows": 2, "cols": 2,
        "layout": (2, 2),
        "names": ["bludgeoning", "piercing", "slashing", "spell"] 
    }
]

# Correction for Sheet 1: The prompt asked for "2 rows of 3". But image generators vary.
# If the crop is wrong, we'll see weird mixes.
# Let's try to detect if it's 2x3 or 3x2 based on aspect ratio.
pass

print("Starting icon extraction...")

if not os.path.exists("assets/icons/damage"):
    os.makedirs("assets/icons/damage")

# Process Sheet 1 (6 icons)
# I suspect it's 3 rows x 2 cols based on typical vertical layout of these generated images
crop_grid("assets/icons/damage/sheet1.png", 3, 2, ["fire", "cold", "lightning", "radiant", "necrotic", "psychic"])

# Process Sheet 2 (4 icons) - 2x2
crop_grid("assets/icons/damage/sheet2.png", 2, 2, ["acid", "poison", "thunder", "force"])

# Process Sheet 3 (4 icons) - 2x2
crop_grid("assets/icons/damage/sheet3.png", 2, 2, ["bludgeoning", "piercing", "slashing", "spell"])

print("Done!")
