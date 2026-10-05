const MAX_DIMENSION = 1600;

export function resizeImage(file, maxDimension = MAX_DIMENSION) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;

      if (width > height && width > maxDimension) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else if (height > maxDimension) {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      // Fyll bakgrunden vit innan bilden ritas, annars blir genomskinliga
      // områden svarta när canvasen exporteras som JPEG (ingen alfakanal)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) return reject(new Error("Kunde inte bearbeta bilden"));
          resolve(
            new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
              type: "image/jpeg",
            }),
          );
        },
        "image/jpeg",
        0.85,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Kunde inte läsa bildfilen"));
    };

    img.src = objectUrl;
  });
}

export async function uploadProductImage(supabase, file) {
  const resized = await resizeImage(file);
  const path = `${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, resized);
  if (error) throw new Error(`Bilduppladdning misslyckades: ${error.message}`);

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}
