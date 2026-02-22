import { newspaperLayout } from "./layoutConfig";

const drawImageCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;

  let drawWidth = w;
  let drawHeight = h;
  let offsetX = 0;
  let offsetY = 0;

  if (imgRatio > boxRatio) {
    // Image lebih lebar dari box
    drawHeight = h;
    drawWidth = img.width * (h / img.height);
    offsetX = (drawWidth - w) / 2;
  } else {
    // Image lebih tinggi dari box
    drawWidth = w;
    drawHeight = img.height * (w / img.width);
    offsetY = (drawHeight - h) / 2;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.drawImage(
    img,
    x - offsetX,
    y - offsetY,
    drawWidth,
    drawHeight
  );

  ctx.restore();
};

// Fungsi untuk mengubah gambar menjadi hitam putih murni
const applyPureBlackAndWhite = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  // Ambil data pixel dari area yang ditentukan
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;

  // Konversi ke hitam putih murni (grayscale)
  for (let i = 0; i < data.length; i += 4) {
    // Gunakan rumus luminance standar untuk hasil yang natural
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    
    // Set semua channel RGB ke nilai gray yang sama
    data[i] = gray;     // Red
    data[i + 1] = gray; // Green
    data[i + 2] = gray; // Blue
    // Alpha channel (i+3) dibiarkan apa adanya
  }

  // Kembalikan data yang sudah dimodifikasi
  ctx.putImageData(imageData, x, y);
};

// Fungsi untuk memastikan gambar termuat dengan benar
const loadImageSafe = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Untuk menghindari CORS issues
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.substring(0, 50)}...`));
    img.src = src;
  });
};

export const composeNewspaper = async (
  photo1: string,
  photo2: string,
  dateText: string
): Promise<string> => {
  try {
    // Load semua gambar dengan Promise.all untuk memastikan semua termuat
    const [frame, img1, img2] = await Promise.all([
      loadImageSafe("/frames/newspaper-a4.png"),
      loadImageSafe(photo1),
      loadImageSafe(photo2)
    ]);

    // Buat canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: false });

    if (!ctx) {
      throw new Error("Canvas context not available");
    }

    // Set ukuran canvas dari layout
    canvas.width = newspaperLayout.canvas.width;
    canvas.height = newspaperLayout.canvas.height;

    console.log("Canvas size:", canvas.width, canvas.height);
    console.log("Frame size:", frame.width, frame.height);
    console.log("Photo1 size:", img1.width, img1.height);
    console.log("Photo2 size:", img2.width, img2.height);

    // 1. Gambar background frame koran
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

    // 2. Gambar foto pertama (besar) dengan posisi dari layout
    const main = newspaperLayout.photoMain;
    console.log("Main photo position:", main);
    drawImageCover(ctx, img1, main.x, main.y, main.width, main.height);
    
    // Terapkan efek hitam putih pada foto pertama
    applyPureBlackAndWhite(ctx, main.x, main.y, main.width, main.height);

    // 3. Gambar foto kedua (kecil) dengan posisi dari layout
    const secondary = newspaperLayout.photoSecondary;
    console.log("Secondary photo position:", secondary);
    drawImageCover(ctx, img2, secondary.x, secondary.y, secondary.width, secondary.height);
    
    // Terapkan efek hitam putih pada foto kedua
    applyPureBlackAndWhite(ctx, secondary.x, secondary.y, secondary.width, secondary.height);

    // 4. Tambahkan text date jika ada di layout
    

    // 5. Tambahkan grain efek koran (tipis saja)
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#000000";
    for (let i = 0; i < 1000; i++) {
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        1,
        1
      );
    }
    ctx.restore();

    // 6. Tambahkan sedikit vignette effect
    ctx.save();
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 1.2
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.1)");
    ctx.fillStyle = gradient;
    ctx.globalCompositeOperation = "multiply";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Konversi ke data URL dengan kualitas tinggi
    return canvas.toDataURL("image/png", 1.0);
    
  } catch (error) {
    console.error("Error in composeNewspaper:", error);
    throw error;
  }
};

export const getFormattedDate = () => {
  const d = new Date();
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const year = d.getFullYear();

  // Format: 22 FEB 2026
  return `${day} ${month} ${year}`;
};