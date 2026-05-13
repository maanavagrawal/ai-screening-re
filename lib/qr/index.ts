import QRCode from "qrcode";

export async function qrDataUrl(text: string, size = 320) {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    color: {
      dark: "#1A1A1A",
      light: "#FAFAF7"
    }
  });
}

