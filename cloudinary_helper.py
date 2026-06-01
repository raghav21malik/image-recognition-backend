import cloudinary
import cloudinary.uploader
import os

def init_cloudinary():
    cloudinary.config(
        cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
        api_key=os.environ.get("CLOUDINARY_API_KEY"),
        api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
        secure=True
    )

def upload_to_cloudinary(image_bytes, filename):
    """
    Uploads image bytes to Cloudinary.
    Returns a dict with image_url and public_id.
    """
    init_cloudinary()

    # Strip extension from filename to use as display name
    display_name = filename.rsplit(".", 1)[0]

    result = cloudinary.uploader.upload(
        image_bytes,
        folder="image-recognition",         # All uploads go into this folder
        public_id=display_name,
        overwrite=False,
        resource_type="image",
        transformation=[
            {"quality": "auto"},             # Auto-optimize quality
            {"fetch_format": "auto"}         # Auto best format (webp etc)
        ]
    )

    return {
        "image_url": result.get("secure_url"),
        "public_id": result.get("public_id"),
        "width": result.get("width"),
        "height": result.get("height"),
        "format": result.get("format"),
        "size_bytes": result.get("bytes")
    }
