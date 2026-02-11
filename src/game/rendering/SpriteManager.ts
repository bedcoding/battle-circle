/** 아이콘 이미지를 로드하고, 색상 틴팅된 버전을 캐시하는 매니저 */

export type SpriteKey =
  | "buff_shield" | "buff_damage" | "buff_speed" | "buff_magnet"
  | "equip_armor" | "equip_scope" | "equip_boots" | "equip_ammo"
  | "food" | "skull" | "crown" | "heart" | "projectile";

const SPRITE_PATHS: Record<SpriteKey, string> = {
  buff_shield: "/assets/icons/buff_shield.png",
  buff_damage: "/assets/icons/buff_damage.png",
  buff_speed: "/assets/icons/buff_speed.png",
  buff_magnet: "/assets/icons/buff_magnet.png",
  equip_armor: "/assets/icons/equip_armor.png",
  equip_scope: "/assets/icons/equip_scope.png",
  equip_boots: "/assets/icons/equip_boots.png",
  equip_ammo: "/assets/icons/equip_ammo.png",
  food: "/assets/icons/food.png",
  skull: "/assets/icons/skull.png",
  crown: "/assets/icons/crown.png",
  heart: "/assets/icons/heart.png",
  projectile: "/assets/icons/projectile.png",
};

export class SpriteManager {
  private images: Map<SpriteKey, HTMLImageElement> = new Map();
  private tintCache: Map<string, HTMLCanvasElement> = new Map();
  private loaded = false;

  async load(): Promise<void> {
    const entries = Object.entries(SPRITE_PATHS) as [SpriteKey, string][];
    const promises = entries.map(([key, path]) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.images.set(key, img);
          resolve();
        };
        img.onerror = () => {
          // 로드 실패 시 무시 — fallback은 canvas 기본 렌더링
          resolve();
        };
        img.src = path;
      });
    });

    await Promise.all(promises);
    this.loaded = true;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  has(key: SpriteKey): boolean {
    return this.images.has(key);
  }

  /** 원본 흰색 아이콘을 ctx에 직접 그림 (크기 지정) */
  draw(ctx: CanvasRenderingContext2D, key: SpriteKey, x: number, y: number, size: number): void {
    const img = this.images.get(key);
    if (!img) return;
    ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
  }

  /** 색상 틴팅된 아이콘을 그림 — 캐시 활용 */
  drawTinted(
    ctx: CanvasRenderingContext2D,
    key: SpriteKey,
    x: number,
    y: number,
    size: number,
    color: string
  ): void {
    const img = this.images.get(key);
    if (!img) return;

    const tinted = this.getTintedCanvas(key, color, img);
    ctx.drawImage(tinted, x - size / 2, y - size / 2, size, size);
  }

  private getTintedCanvas(key: SpriteKey, color: string, img: HTMLImageElement): HTMLCanvasElement {
    const cacheKey = `${key}:${color}`;
    let canvas = this.tintCache.get(cacheKey);
    if (canvas) return canvas;

    canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const tCtx = canvas.getContext("2d")!;

    // 원본 이미지 그리기 (흰색 실루엣)
    tCtx.drawImage(img, 0, 0);

    // source-in: 기존 픽셀의 알파 영역에만 색상 적용
    tCtx.globalCompositeOperation = "source-in";
    tCtx.fillStyle = color;
    tCtx.fillRect(0, 0, canvas.width, canvas.height);

    this.tintCache.set(cacheKey, canvas);
    return canvas;
  }
}
