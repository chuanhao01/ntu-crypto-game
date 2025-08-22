import requests
import pixellab
from PIL import Image
import os
import base64
from io import BytesIO

API_KEY = "88735214-b29c-428c-8a88-37c9552c326f"

# Initialize the client
client = pixellab.Client(secret=API_KEY)

def create_character_with_poses(character_description, character_name):
    """Create a character and generate multiple poses while maintaining consistency"""
    
    # Create output directory
    output_dir = f"generated_images/{character_name}"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Step 1: Generate the base character
    print(f"Generating base character: {character_description}")
    base_response = client.generate_image_pixflux(
        description=character_description,
        image_size=dict(width=64, height=64),
        no_background=True
    )
    
    # Save the base character
    base_image = base_response.image.pil_image()
    base_filename = f"{output_dir}/{character_name}_base.png"
    base_image.save(base_filename)
    print(f"Base character saved as: {base_filename}")
    base_image.show()
    
    # Step 2: Estimate skeleton from the base character (use PIL image)
    print("Estimating skeleton keypoints...")
    skeleton_response = client.estimate_skeleton(
        image=base_image  # Use PIL image instead of Base64Image
    )
    
    base_keypoints = skeleton_response.keypoints
    print(f"✅ Skeleton estimated with {len(base_keypoints)} keypoints")
    print("Keypoints:", base_keypoints)
    
    # Step 3: Create different poses using skeleton animation
    poses = [
        {"name": "idle", "keypoint_modifier": None},
        {"name": "walking", "keypoint_modifier": "walking"}, 
        {"name": "running", "keypoint_modifier": "running"},
        {"name": "jumping", "keypoint_modifier": "jumping"},
        {"name": "attacking", "keypoint_modifier": "attacking"},
        {"name": "defending", "keypoint_modifier": "defending"}
    ]
    
    generated_poses = []
    
    for pose in poses:
        try:
            print(f"Generating {pose['name']} pose...")
            
            # Use the estimated keypoints (modify if needed for different poses)
            skeleton_keypoints = base_keypoints.copy() if base_keypoints else []
            
            # Modify keypoints slightly for different poses if needed
            if pose["keypoint_modifier"] and skeleton_keypoints:
                skeleton_keypoints = modify_keypoints_for_pose(skeleton_keypoints, pose["keypoint_modifier"])
            
            # Use the animate_with_skeleton method
            animation_response = client.animate_with_skeleton(
                view="side",
                direction="south", 
                image_size={"width": 64, "height": 64},
                reference_image=base_response.image,
                skeleton_keypoints=base_keypoints
            )
            
            # Handle the response correctly
            if hasattr(animation_response, 'images') and animation_response.images:
                # Convert Base64Image objects to PIL Images
                pil_images = []
                for i, base64_img in enumerate(animation_response.images):
                    # Convert Base64Image to PIL Image
                    pil_img = base64_img.pil_image()
                    pil_images.append(pil_img)
                    
                    # Save each frame
                    print("REACHED HERE")
                    frame_filename = f"{output_dir}/{character_name}_{pose['name']}_frame_{i:02d}.png"
                    pil_img.save(frame_filename)
                    print(f"  Frame {i} saved: {frame_filename}")
                
                # Save the first frame as the main pose
                if pil_images:
                    print("AND HERE")
                    pose_filename = f"{output_dir}/{character_name}_{pose['name']}.png" 
                    pil_images[0].save(pose_filename)
                    
                    # Display the first frame
                    pil_images[0].show()
            else:
                print(f"❌ No images returned for {pose['name']}")
            
        except Exception as e:
            print(f"❌ Failed to generate {pose['name']} pose: {e}")
            print(f"Error type: {type(e)}")
            continue
    
    print(f"\n🎉 Generated {len(generated_poses)} poses for {character_name}")
    return generated_poses

def modify_keypoints_for_pose(keypoints, pose_type):
    """Slightly modify keypoints for different poses"""
    modified_keypoints = keypoints.copy()
    
    # This is a simple example - you can make more sophisticated modifications
    # based on the actual keypoint structure returned by the API
    
    if pose_type == "walking":
        # Slightly adjust leg positions for walking if keypoints support it
        pass
    elif pose_type == "jumping":
        # Adjust arm positions for jumping if keypoints support it
        pass
    elif pose_type == "attacking":
        # Adjust arm positions for attacking if keypoints support it
        pass
    
    return modified_keypoints

def create_gif_from_frames(pil_images, gif_filename, duration=200):
    """Create a GIF animation from PIL images"""
    if len(pil_images) > 1:
        pil_images[0].save(
            gif_filename,
            save_all=True,
            append_images=pil_images[1:],
            duration=duration,
            loop=0
        )
        print(f"  GIF saved: {gif_filename}")
    else:
        # If only one frame, save as static PNG
        pil_images[0].save(gif_filename.replace('.gif', '_static.png'))
        print(f"  Static image saved: {gif_filename.replace('.gif', '_static.png')}")

def create_battle_sprites(character_description, character_name):
    """Create specific sprites needed for battle (left and right facing)"""
    
    output_dir = f"generated_images/{character_name}_battle"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Generate base character
    print(f"Generating base character for battle sprites: {character_description}")
    base_response = client.generate_image_pixflux(
        description=character_description,
        image_size=dict(width=64, height=64),
        no_background=True
    )
    
    base_image = base_response.image.pil_image()
    base_filename = f"{output_dir}/{character_name}_default.png"
    base_image.save(base_filename)
    print(f"Base character saved as: {base_filename}")
    
    # Estimate skeleton for battle sprites (use PIL image)
    print("Estimating skeleton for battle sprites...")
    skeleton_response = client.estimate_skeleton(
        image=base_image  # Use PIL image instead of Base64Image
    )
    
    base_keypoints = skeleton_response.keypoints
    print(f"✅ Battle skeleton estimated with {len(base_keypoints)} keypoints")
    
    # Generate battle-specific poses
    battle_poses = [
        {"name": "battle-left", "view": "side", "direction": "west"},
        {"name": "battle-right", "view": "side", "direction": "east"},
        {"name": "spinning", "view": "side", "direction": "south"}
    ]
    
    generated_sprites = []
    
    for pose in battle_poses:
        try:
            print(f"Generating {pose['name']} sprite...")
            
            animation_response = client.animate_with_skeleton(
                view=pose["view"],
                direction=pose["direction"],
                image_size={"width": 64, "height": 64},
                reference_image=base_response.image,
                skeleton_keypoints=base_keypoints
            )
            
            if hasattr(animation_response, 'images') and animation_response.images:
                # Convert all frames to PIL images
                pil_images = [img.pil_image() for img in animation_response.images]
                
                # Save the first frame as sprite
                sprite_image = pil_images[0]
                sprite_filename = f"{output_dir}/{character_name}_{pose['name']}.png"
                sprite_image.save(sprite_filename)
                
                # Save as GIF if multiple frames
                if len(pil_images) > 1:
                    gif_filename = f"{output_dir}/{character_name}_{pose['name']}.gif"
                    create_gif_from_frames(pil_images, gif_filename)
                
                generated_sprites.append({
                    "name": pose['name'],
                    "filename": sprite_filename,
                    "frames": len(pil_images),
                    "image": sprite_image
                })
                
                print(f"✅ {pose['name']} sprite saved with {len(pil_images)} frames")
                sprite_image.show()
            
        except Exception as e:
            print(f"❌ Failed to generate {pose['name']} sprite: {e}")
            continue
    
    return generated_sprites

def debug_client_methods():
    """Debug function to see available methods"""
    print("Available client methods:")
    methods = [method for method in dir(client) if not method.startswith('_')]
    for method in methods:
        print(f"  - {method}")

# Example usage
if __name__ == "__main__":
    # Debug methods first
    debug_client_methods()
    print("\n" + "="*50 + "\n")
    
    # Generate character poses
    character_desc = "pixelart knight in blue armor with sword and shield"
    character_name = "blue_knight"
    
    # Generate poses with animations
    poses = create_character_with_poses(character_desc, character_name)
    
    print("\n" + "="*50 + "\n")
    
    # Generate battle-specific sprites
    battle_sprites = create_battle_sprites(character_desc, character_name)
    
    print(f"\nGeneration complete!")
    print(f"Generated {len(poses)} animated poses")
    print(f"Generated {len(battle_sprites)} battle sprites")
    
    # Show summary
    print("\nGenerated files:")
    for pose in poses:
        print(f"  - {pose['filename']} ({pose['frames']} frames)")
        if 'gif_filename' in pose:
            print(f"    - {pose['gif_filename']} (animated)")