import os
from PIL import Image

def is_green(r, g, b):
    # g > r and g > (b-10)?
    # More like, mainly green if G component is highest OR Hue is in green area
    return g > r and g > b - 10

def is_yellow_brown(r, g, b):
    # Sand color, usually R and G are high compared to B
    return r > b + 20 and g > b + 20

def process():
    tiles_dir = os.path.join(os.path.dirname(__file__), 'sprites', 'tiles')
    
    # 1. Generate water.png
    water_color = (15, 94, 156) # Deep blue
    try:
        grass = Image.open(os.path.join(tiles_dir, 'grass.png')).convert('RGBA')
        water = Image.new('RGBA', grass.size)
        water_data = water.load()
        grass_data = grass.load()
        for y in range(grass.size[1]):
            for x in range(grass.size[0]):
                # Add some noise based on grass
                c = grass_data[x, y]
                if c[3] > 0:
                    offset = (c[1] - 80) // 2 # Use green channel variation for noise
                    water_data[x, y] = (max(0, min(255, water_color[0] + offset)),
                                        max(0, min(255, water_color[1] + offset)),
                                        max(0, min(255, water_color[2] + int(offset*1.5))), c[3])
                else:
                    water_data[x, y] = c
        water.save(os.path.join(tiles_dir, 'water.png'))
    except Exception as e:
        print("Error water:", e)

    # 2. Process all grass-sand-*.png into sand-water-*.png
    sand_color_avg = (210, 180, 140)
    for filename in os.listdir(tiles_dir):
        if filename.startswith('grass-sand-') and filename.endswith('.png'):
            try:
                img = Image.open(os.path.join(tiles_dir, filename)).convert('RGBA')
                new_img = Image.new('RGBA', img.size)
                idata = img.load()
                ndata = new_img.load()
                
                for y in range(img.size[1]):
                    for x in range(img.size[0]):
                        c = idata[x, y]
                        if c[3] == 0:
                            ndata[x, y] = c
                            continue
                        
                        r, g, b, a = c
                        if is_green(r, g, b):
                            # Turn to sand
                            offset = (g - 80) // 2
                            ndata[x, y] = (max(0, min(255, 210 + offset)), 
                                           max(0, min(255, 180 + offset)), 
                                           max(0, min(255, 140 + offset)), a)
                        else:
                            # Turn to water
                            offset = (r - 180) // 2
                            ndata[x, y] = (max(0, min(255, water_color[0] + offset)),
                                           max(0, min(255, water_color[1] + offset)),
                                           max(0, min(255, water_color[2] + int(offset*1.5))), a)
                
                new_filename = filename.replace('grass-sand-', 'sand-water-')
                new_img.save(os.path.join(tiles_dir, new_filename))
            except Exception as e:
                print("Error with file", filename, e)

if __name__ == "__main__":
    process()
