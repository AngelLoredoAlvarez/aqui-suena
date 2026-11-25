import { flyerDownloadName } from "@aqui-suena/ui/flyer-lightbox/download-name";
import { describe, expect, it } from "vitest";

describe("flyerDownloadName", () => {
  it("slugifies the business name and keeps the image extension", () => {
    expect(flyerDownloadName("El Sazón de Ale", "https://api.test/images/a.jpg")).toBe(
      "flyer-el-sazon-de-ale.jpg",
    );
    expect(flyerDownloadName('Repostería "La Dulce"', "https://api.test/images/b.PNG?v=2")).toBe(
      "flyer-reposteria-la-dulce.png",
    );
  });

  it("falls back to a generic name without a business name", () => {
    expect(flyerDownloadName("", "https://api.test/images/c.webp")).toBe("flyer.webp");
    expect(flyerDownloadName("  ", "https://api.test/images/c")).toBe("flyer.jpg");
  });
});
