import { Camera } from "./Camera";
import { CONFIG } from "../core/GameConfig";
import { EntityManager } from "../entities/EntityManager";
import { StormSystem, StormState } from "../systems/StormSystem";
import { AbsorptionSystem } from "../systems/AbsorptionSystem";
import { ScoreSystem } from "../systems/ScoreSystem";
import { ProjectileSystem } from "../systems/ProjectileSystem";
import { BuffSystem } from "../systems/BuffSystem";
import { EquipmentSystem } from "../systems/EquipmentSystem";
import { Player } from "../entities/Player";
import { Entity } from "../entities/Entity";
import { GameState } from "../core/GameState";
import { BuffType } from "../entities/BuffItem";
import { Bot } from "../entities/Bot";
import { EquipType, EquipRarity } from "../entities/EquipmentItem";
import { SpriteManager, SpriteKey } from "./SpriteManager";

const BUFF_SPRITE_MAP: Record<BuffType, SpriteKey> = {
  [BuffType.SPEED]: "buff_speed",
  [BuffType.SHIELD]: "buff_shield",
  [BuffType.DAMAGE]: "buff_damage",
  [BuffType.MAGNET]: "buff_magnet",
};

const EQUIP_SPRITE_MAP: Record<EquipType, SpriteKey> = {
  [EquipType.ARMOR]: "equip_armor",
  [EquipType.SCOPE]: "equip_scope",
  [EquipType.BOOTS]: "equip_boots",
  [EquipType.HEAVY_AMMO]: "equip_ammo",
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private sprites: SpriteManager;

  constructor(
    canvas: HTMLCanvasElement,
    private camera: Camera,
    private entityManager: EntityManager,
    private stormSystem: StormSystem,
    private absorptionSystem: AbsorptionSystem,
    private scoreSystem: ScoreSystem,
    private projectileSystem: ProjectileSystem,
    private buffSystem: BuffSystem,
    private equipmentSystem: EquipmentSystem
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.sprites = new SpriteManager();
    this.sprites.load();
  }

  render(gameState: GameState, elapsedTime: number): void {
    const ctx = this.ctx;
    const cam = this.camera;

    // 클리어
    ctx.fillStyle = CONFIG.RENDER.BG_COLOR;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();

    // 배경 그리드
    this.drawGrid();

    // 월드 경계
    this.drawWorldBorder();

    // 자기장
    this.drawStorm();

    // 엄폐물
    this.drawObstacles();

    // 음식
    this.drawFood();

    // 버프 아이템
    this.drawBuffItems();

    // 장비 아이템
    this.drawEquipmentItems();

    // 엔티티
    this.drawEntities();

    // 흡수 이펙트
    this.drawAbsorptionEffects();

    // 탄환
    this.drawProjectiles();

    // 조준선
    this.drawAimIndicator();

    ctx.restore();

    // HUD (화면 고정 좌표)
    if (gameState === GameState.PLAYING || gameState === GameState.SPECTATING) {
      this.drawHUD(elapsedTime);
      this.drawActiveBuffs();
      this.drawEquipmentHUD();
      this.drawMinimap();
      this.drawStormTimer();
    }
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const bounds = cam.getVisibleBounds();
    const gridSize = CONFIG.RENDER.GRID_SIZE;

    ctx.strokeStyle = CONFIG.RENDER.GRID_COLOR;
    ctx.lineWidth = 1;

    const startX = Math.floor(bounds.left / gridSize) * gridSize;
    const startY = Math.floor(bounds.top / gridSize) * gridSize;

    for (let x = startX; x <= bounds.right; x += gridSize) {
      const screen = cam.worldToScreen(x, 0);
      ctx.beginPath();
      ctx.moveTo(screen.x, 0);
      ctx.lineTo(screen.x, this.canvas.height);
      ctx.stroke();
    }

    for (let y = startY; y <= bounds.bottom; y += gridSize) {
      const screen = cam.worldToScreen(0, y);
      ctx.beginPath();
      ctx.moveTo(0, screen.y);
      ctx.lineTo(this.canvas.width, screen.y);
      ctx.stroke();
    }
  }

  private drawWorldBorder(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const tl = cam.worldToScreen(0, 0);
    const br = cam.worldToScreen(CONFIG.WORLD.WIDTH, CONFIG.WORLD.HEIGHT);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  }

  private drawObstacles(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const bounds = cam.getVisibleBounds();

    for (const obs of this.entityManager.obstacles) {
      if (
        obs.position.x < bounds.left - obs.radius * 2 ||
        obs.position.x > bounds.right + obs.radius * 2 ||
        obs.position.y < bounds.top - obs.radius * 2 ||
        obs.position.y > bounds.bottom + obs.radius * 2
      ) continue;

      const screen = cam.worldToScreen(obs.position.x, obs.position.y);
      const r = obs.radius * cam.zoom;

      // 그림자
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.beginPath();
      ctx.arc(screen.x + 3, screen.y + 3, r, 0, Math.PI * 2);
      ctx.fill();

      // 본체
      ctx.fillStyle = obs.color;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
      ctx.fill();

      // 테두리
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 질감 (내부 선)
      ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, r * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawStorm(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const storm = this.stormSystem;

    // 안전지대 바깥 = 자기장 영역 (반투명 빨간 오버레이)
    const center = cam.worldToScreen(storm.currentCenter.x, storm.currentCenter.y);
    const radius = storm.currentRadius * cam.zoom;

    // 전체 화면을 자기장 색으로 채우고 안전지대만 잘라냄
    ctx.save();
    ctx.fillStyle = CONFIG.RENDER.STORM_COLOR;
    ctx.beginPath();
    ctx.rect(0, 0, this.canvas.width, this.canvas.height);
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2, true);
    ctx.fill();

    // 안전지대 경계선
    ctx.strokeStyle = CONFIG.RENDER.SAFE_ZONE_BORDER;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 다음 안전지대 미리보기 (점선)
    if (storm.nextRadius < storm.currentRadius) {
      const nextCenter = cam.worldToScreen(storm.nextCenter.x, storm.nextCenter.y);
      const nextRadius = storm.nextRadius * cam.zoom;
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(nextCenter.x, nextCenter.y, nextRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  private drawFood(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const bounds = cam.getVisibleBounds();
    const hasSprite = this.sprites.has("food");

    for (const food of this.entityManager.food) {
      if (!food.isAlive) continue;
      if (
        food.position.x < bounds.left - 20 ||
        food.position.x > bounds.right + 20 ||
        food.position.y < bounds.top - 20 ||
        food.position.y > bounds.bottom + 20
      ) continue;

      const screen = cam.worldToScreen(food.position.x, food.position.y);
      const r = food.radius * cam.zoom;

      if (hasSprite && r > 3) {
        this.sprites.drawTinted(ctx, "food", screen.x, screen.y, r * 2.5, food.color);
      } else {
        ctx.fillStyle = food.color;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, Math.max(r, 2), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawEntities(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const bounds = cam.getVisibleBounds();

    // 크기 순 정렬 (작은 것부터 그려서 큰 것이 위에)
    const entities = this.entityManager.getAllEntities().sort((a, b) => a.mass - b.mass);

    for (const entity of entities) {
      if (
        entity.position.x < bounds.left - entity.radius * 2 ||
        entity.position.x > bounds.right + entity.radius * 2 ||
        entity.position.y < bounds.top - entity.radius * 2 ||
        entity.position.y > bounds.bottom + entity.radius * 2
      ) continue;

      this.drawEntity(entity);
    }
  }

  private drawEntity(entity: Entity): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const screen = cam.worldToScreen(entity.position.x, entity.position.y);
    const r = entity.radius * cam.zoom;
    const isPlayer = entity === this.entityManager.player;

    // 본체 (스프라이트 또는 원)
    const isBot = entity instanceof Bot;

    if (isPlayer) {
      const player = entity as Player;
      let sprite: SpriteKey = "jaymee_idle";

      const dir = player.moveDirection;
      if (dir.length() > 0.1) {
        if (Math.abs(dir.x) > Math.abs(dir.y)) {
          sprite = dir.x > 0 ? "jaymee_right" : "jaymee_left";
        } else {
          sprite = dir.y > 0 ? "jaymee_down" : "jaymee_up";
        }
      }

      if (this.sprites.has(sprite)) {
        // 스프라이트 크기 조절 (히트박스보다 약간 크게)
        const size = r * 2.8;
        this.sprites.draw(ctx, sprite, screen.x, screen.y, size);
      } else {
        this.drawCircleBody(ctx, screen.x, screen.y, r, entity, isPlayer);
      }
    } else if (isBot) {
      if (this.sprites.has("coiny_idle")) {
        const size = r * 2.4;
        this.sprites.draw(ctx, "coiny_idle", screen.x, screen.y, size);
      } else {
        this.drawCircleBody(ctx, screen.x, screen.y, r, entity, isPlayer);
      }
    } else {
      this.drawCircleBody(ctx, screen.x, screen.y, r, entity, isPlayer);
    }
  }

  private drawCircleBody(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, entity: Entity, isPlayer: boolean): void {
    // 본체
    ctx.fillStyle = entity.color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // 테두리
    ctx.strokeStyle = isPlayer ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = isPlayer ? 3 : 1.5;
    ctx.stroke();

    // 실드 버프 이펙트
    if (entity.hasBuff(BuffType.SHIELD)) {
      ctx.strokeStyle = "rgba(124, 77, 255, 0.6)";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 스피드 버프 이펙트
    if (entity.hasBuff(BuffType.SPEED)) {
      ctx.strokeStyle = "rgba(0, 229, 255, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 데미지 버프 이펙트
    if (entity.hasBuff(BuffType.DAMAGE)) {
      ctx.shadowColor = "#ff1744";
      ctx.shadowBlur = 10;
      ctx.strokeStyle = "rgba(255, 23, 68, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }

    // 장비 시각 이펙트
    if (entity.equipment.length > 0) {
      const time = performance.now() / 1000;
      const iconSize = Math.max(r * 0.45, 10);

      // 아머
      if (entity.hasEquip(EquipType.ARMOR)) {
        if (this.sprites.has("equip_armor")) {
          ctx.globalAlpha = 0.7;
          this.sprites.drawTinted(ctx, "equip_armor", x - r - iconSize * 0.4, y, iconSize, "#78909c");
          ctx.globalAlpha = 1;
        } else {
          ctx.strokeStyle = "rgba(120, 144, 156, 0.6)";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(x, y, r + 7, -Math.PI * 0.3, Math.PI * 0.3);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, r + 7, Math.PI * 0.7, Math.PI * 1.3);
          ctx.stroke();
        }
      }

      // 부츠
      if (entity.hasEquip(EquipType.BOOTS)) {
        if (this.sprites.has("equip_boots")) {
          ctx.globalAlpha = 0.6;
          this.sprites.drawTinted(ctx, "equip_boots", x, y + r + iconSize * 0.5, iconSize, "#66bb6a");
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = "rgba(102, 187, 106, 0.5)";
          ctx.beginPath();
          ctx.moveTo(x, y + r + 10);
          ctx.lineTo(x - 5, y + r + 4);
          ctx.lineTo(x + 5, y + r + 4);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 스코프
      if (entity.hasEquip(EquipType.SCOPE)) {
        if (this.sprites.has("equip_scope")) {
          ctx.globalAlpha = 0.5;
          this.sprites.drawTinted(ctx, "equip_scope", x, y - r - iconSize * 0.5, iconSize, "#26c6da");
          ctx.globalAlpha = 1;
        } else {
          ctx.strokeStyle = "rgba(38, 198, 218, 0.4)";
          ctx.lineWidth = 1;
          const crossSize = r * 0.4;
          ctx.beginPath();
          ctx.moveTo(x - crossSize, y - r - 8);
          ctx.lineTo(x + crossSize, y - r - 8);
          ctx.moveTo(x, y - r - 8 - crossSize);
          ctx.lineTo(x, y - r - 8 + crossSize);
          ctx.stroke();
        }
      }

      // 헤비 탄약
      if (entity.hasEquip(EquipType.HEAVY_AMMO)) {
        if (this.sprites.has("equip_ammo")) {
          const pulse = 0.4 + Math.sin(time * 5) * 0.3;
          ctx.globalAlpha = pulse;
          this.sprites.drawTinted(ctx, "equip_ammo", x + r * 0.7, y - r * 0.7, iconSize, "#ef5350");
          ctx.globalAlpha = 1;
        } else {
          const pulse = 0.5 + Math.sin(time * 5) * 0.5;
          ctx.fillStyle = `rgba(239, 83, 80, ${0.3 + pulse * 0.4})`;
          ctx.beginPath();
          ctx.arc(x + r * 0.7, y - r * 0.7, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 1위 왕관
    const leaderboard = this.scoreSystem.leaderboard;
    if (leaderboard.length > 0 && leaderboard[0].name === entity.name && this.sprites.has("crown")) {
      this.sprites.drawTinted(ctx, "crown", x, y - r - 12, Math.max(r * 0.5, 14), "#ffd700");
    }

    // 이름
    if (r > 15) {
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 3;
      const fontSize = Math.max(12, Math.min(r * 0.5, 24));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(entity.name, x, y);
      ctx.fillText(entity.name, x, y);

      // 질량 표시
      const massText = Math.floor(entity.mass).toString();
      const smallFont = fontSize * 0.6;
      ctx.font = `${smallFont}px sans-serif`;
      ctx.strokeText(massText, x, y + fontSize * 0.7);
      ctx.fillText(massText, x, y + fontSize * 0.7);
    }
  }

  private drawAbsorptionEffects(): void {
    const ctx = this.ctx;
    const cam = this.camera;

    for (const effect of this.absorptionSystem.effects) {
      const screen = cam.worldToScreen(effect.x, effect.y);
      const r = effect.radius * cam.zoom;

      ctx.globalAlpha = effect.alpha * 0.6;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  private drawProjectiles(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const bounds = cam.getVisibleBounds();

    for (const proj of this.projectileSystem.projectiles) {
      if (!proj.isAlive) continue;
      if (
        proj.position.x < bounds.left - 20 ||
        proj.position.x > bounds.right + 20 ||
        proj.position.y < bounds.top - 20 ||
        proj.position.y > bounds.bottom + 20
      ) continue;

      const screen = cam.worldToScreen(proj.position.x, proj.position.y);
      const r = proj.radius * cam.zoom;

      // 발광 효과
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, Math.max(r, 2), 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // 컬러 테두리
      ctx.strokeStyle = proj.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, Math.max(r, 2), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawBuffItems(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const bounds = cam.getVisibleBounds();
    const time = performance.now() / 1000;

    for (const buff of this.buffSystem.buffs) {
      if (!buff.isAlive) continue;
      if (
        buff.position.x < bounds.left - 30 ||
        buff.position.x > bounds.right + 30 ||
        buff.position.y < bounds.top - 30 ||
        buff.position.y > bounds.bottom + 30
      ) continue;

      const screen = cam.worldToScreen(buff.position.x, buff.position.y);
      const r = buff.radius * cam.zoom;
      const bob = Math.sin(time * 3 + buff.bobPhase) * 3;

      // 발광
      ctx.shadowColor = buff.def.color;
      ctx.shadowBlur = 12;

      // 배경 원
      ctx.fillStyle = buff.def.color;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y + bob, r * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // 본체
      ctx.fillStyle = buff.def.color;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y + bob, r, 0, Math.PI * 2);
      ctx.fill();

      // 테두리
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // 아이콘 (스프라이트 또는 텍스트 폴백)
      const spriteKey = BUFF_SPRITE_MAP[buff.buffType];
      if (this.sprites.has(spriteKey)) {
        this.sprites.draw(ctx, spriteKey, screen.x, screen.y + bob, r * 1.6);
      } else {
        ctx.fillStyle = "white";
        ctx.font = `bold ${Math.max(r * 0.8, 8)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(buff.def.icon, screen.x, screen.y + bob);
      }
    }
  }

  private drawActiveBuffs(): void {
    const ctx = this.ctx;
    const player = this.entityManager.player;
    if (!player || player.activeBuffs.length === 0) return;

    const startX = 220;
    const y = this.canvas.height - 40;

    for (let i = 0; i < player.activeBuffs.length; i++) {
      const ab = player.activeBuffs[i];
      const x = startX + i * 50;
      const pct = ab.remaining / ab.duration;

      // 배경
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(x, y - 16, 40, 32);

      // 진행바
      const barColor = ab.type === BuffType.SPEED ? "#00e5ff"
        : ab.type === BuffType.SHIELD ? "#7c4dff"
          : ab.type === BuffType.DAMAGE ? "#ff1744"
            : "#ffea00";
      ctx.fillStyle = barColor;
      ctx.fillRect(x, y + 12, 40 * pct, 4);

      // 아이콘 + 시간
      const bSpriteKey = BUFF_SPRITE_MAP[ab.type];
      if (this.sprites.has(bSpriteKey)) {
        this.sprites.draw(ctx, bSpriteKey, x + 12, y, 18);
        ctx.fillStyle = "white";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`${Math.ceil(ab.remaining)}`, x + 24, y);
      } else {
        ctx.fillStyle = "white";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${Math.ceil(ab.remaining)}s`, x + 20, y);
      }
    }
  }

  private drawEquipmentItems(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const bounds = cam.getVisibleBounds();
    const time = performance.now() / 1000;

    for (const item of this.equipmentSystem.items) {
      if (!item.isAlive) continue;
      if (
        item.position.x < bounds.left - 30 ||
        item.position.x > bounds.right + 30 ||
        item.position.y < bounds.top - 30 ||
        item.position.y > bounds.bottom + 30
      ) continue;

      const screen = cam.worldToScreen(item.position.x, item.position.y);
      const r = item.radius * cam.zoom;
      const bob = Math.sin(time * 2 + item.bobPhase) * 4;

      // 레어리티 테두리 색상
      const rarityColor = item.rarity === EquipRarity.EPIC ? "#b43dff"
        : item.rarity === EquipRarity.RARE ? "#3c8cff"
          : "rgba(255,255,255,0.5)";

      // 발광
      ctx.shadowColor = rarityColor;
      ctx.shadowBlur = item.rarity === EquipRarity.EPIC ? 16 : item.rarity === EquipRarity.RARE ? 10 : 4;

      // 다이아몬드 모양
      ctx.save();
      ctx.translate(screen.x, screen.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = item.def.color;
      ctx.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
      ctx.strokeStyle = rarityColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
      ctx.restore();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // 아이콘 (스프라이트 또는 텍스트 폴백)
      const spriteKey = EQUIP_SPRITE_MAP[item.equipType];
      if (this.sprites.has(spriteKey)) {
        this.sprites.draw(ctx, spriteKey, screen.x, screen.y + bob, r * 1.4);
      } else {
        ctx.fillStyle = "white";
        ctx.font = `bold ${Math.max(r * 0.7, 8)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(item.def.icon, screen.x, screen.y + bob);
      }
    }
  }

  private drawEquipmentHUD(): void {
    const ctx = this.ctx;
    const player = this.entityManager.player;
    if (!player || player.equipment.length === 0) return;

    const x = 10;
    const startY = this.canvas.height - 160;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(x, startY, 200, player.equipment.length * 28 + 24);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("Equipment", x + 8, startY + 12);

    for (let i = 0; i < player.equipment.length; i++) {
      const eq = player.equipment[i];
      const ey = startY + 24 + i * 28;
      const pct = eq.durability / eq.maxDurability;

      // 레어리티 색
      const rarityColor = eq.rarity === EquipRarity.EPIC ? "#b43dff"
        : eq.rarity === EquipRarity.RARE ? "#3c8cff"
          : "#aaaaaa";

      // 아이콘 + 이름
      const eSpriteKey = EQUIP_SPRITE_MAP[eq.type as EquipType];
      if (this.sprites.has(eSpriteKey)) {
        this.sprites.drawTinted(ctx, eSpriteKey, x + 16, ey + 6, 18, rarityColor);
        ctx.fillStyle = rarityColor;
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(`${eq.type}`, x + 30, ey + 6);
      } else {
        ctx.fillStyle = rarityColor;
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(`${eq.type}`, x + 8, ey + 6);
      }

      // 내구도 바
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(x + 100, ey, 90, 12);
      const barColor = pct > 0.5 ? "#66bb6a" : pct > 0.2 ? "#ffa726" : "#ef5350";
      ctx.fillStyle = barColor;
      ctx.fillRect(x + 100, ey, 90 * pct, 12);

      // 내구도 텍스트
      ctx.fillStyle = "white";
      ctx.font = "10px sans-serif";
      ctx.fillText(`${Math.ceil(eq.durability)}/${eq.maxDurability}`, x + 105, ey + 6);
    }
  }

  private drawHUD(elapsedTime: number): void {
    const ctx = this.ctx;
    const player = this.entityManager.player;
    const alive = this.entityManager.getAliveCount();

    // 생존자 수 (좌상단)
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, 10, 160, 36);
    ctx.fillStyle = "white";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`Alive: ${alive}`, 20, 28);

    // 경과 시간
    const mins = Math.floor(elapsedTime / 60);
    const secs = Math.floor(elapsedTime % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;
    ctx.textAlign = "right";
    ctx.fillText(timeStr, 160, 28);

    // 플레이어 정보 (좌하단)
    if (player) {
      const rank = this.scoreSystem.getPlayerRank(player.name);
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(10, this.canvas.height - 80, 200, 70);
      ctx.fillStyle = "white";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Mass: ${Math.floor(player.mass)}`, 20, this.canvas.height - 58);
      ctx.fillText(`Kills: ${player.kills}`, 20, this.canvas.height - 38);
      ctx.fillText(`Rank: #${rank}`, 20, this.canvas.height - 18);
    }

    // 리더보드 (우상단)
    const lb = this.scoreSystem.leaderboard.slice(0, 5);
    const lbWidth = 180;
    const lbX = this.canvas.width - lbWidth - 10;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(lbX, 10, lbWidth, 20 + lb.length * 22);
    ctx.fillStyle = "white";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Leaderboard", lbX + 10, 26);
    ctx.font = "12px sans-serif";
    for (let i = 0; i < lb.length; i++) {
      const entry = lb[i];
      const isMe = player && entry.name === player.name;
      ctx.fillStyle = isMe ? "#ffd700" : "white";
      ctx.fillText(
        `${entry.rank}. ${entry.name} (${entry.mass})`,
        lbX + 10,
        48 + i * 22
      );
    }
  }

  private drawMinimap(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const storm = this.stormSystem;
    const size = CONFIG.RENDER.MINIMAP_SIZE;
    const margin = CONFIG.RENDER.MINIMAP_MARGIN;
    const mx = this.canvas.width - size - margin;
    const my = this.canvas.height - size - margin;
    const scale = size / CONFIG.WORLD.WIDTH;

    // 배경
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(mx, my, size, size);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(mx, my, size, size);

    // 자기장
    ctx.fillStyle = CONFIG.RENDER.STORM_COLOR;
    ctx.beginPath();
    ctx.rect(mx, my, size, size);
    ctx.arc(
      mx + storm.currentCenter.x * scale,
      my + storm.currentCenter.y * scale,
      storm.currentRadius * scale,
      0, Math.PI * 2, true
    );
    ctx.fill();

    // 안전지대 경계
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(
      mx + storm.currentCenter.x * scale,
      my + storm.currentCenter.y * scale,
      storm.currentRadius * scale,
      0, Math.PI * 2
    );
    ctx.stroke();

    // 엄폐물
    ctx.fillStyle = "rgba(100, 80, 60, 0.7)";
    for (const obs of this.entityManager.obstacles) {
      const ox = mx + obs.position.x * scale;
      const oy = my + obs.position.y * scale;
      ctx.beginPath();
      ctx.arc(ox, oy, Math.max(obs.radius * scale, 1.5), 0, Math.PI * 2);
      ctx.fill();
    }

    // 버프 아이템
    for (const buff of this.buffSystem.buffs) {
      if (!buff.isAlive) continue;
      const bx = mx + buff.position.x * scale;
      const by = my + buff.position.y * scale;
      ctx.fillStyle = buff.def.color;
      ctx.beginPath();
      ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 장비 아이템
    for (const item of this.equipmentSystem.items) {
      if (!item.isAlive) continue;
      const ix = mx + item.position.x * scale;
      const iy = my + item.position.y * scale;
      const rc = item.rarity === EquipRarity.EPIC ? "#b43dff"
        : item.rarity === EquipRarity.RARE ? "#3c8cff" : "#aaaaaa";
      ctx.fillStyle = rc;
      ctx.save();
      ctx.translate(ix, iy);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }

    // 엔티티 점
    for (const entity of this.entityManager.getAllEntities()) {
      const ex = mx + entity.position.x * scale;
      const ey = my + entity.position.y * scale;
      const isPlayer = entity === this.entityManager.player;

      ctx.fillStyle = isPlayer ? "#ffffff" : entity.color;
      ctx.beginPath();
      ctx.arc(ex, ey, isPlayer ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 뷰포트 표시
    const bounds = cam.getVisibleBounds();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      mx + bounds.left * scale,
      my + bounds.top * scale,
      (bounds.right - bounds.left) * scale,
      (bounds.bottom - bounds.top) * scale
    );
  }

  private stormWarningFlash: number = 0;
  private prevStormState: StormState = StormState.WAITING;

  private drawStormTimer(): void {
    const ctx = this.ctx;
    const storm = this.stormSystem;
    const label = storm.getStateLabel();
    if (!label) return;

    const cx = this.canvas.width / 2;
    const now = performance.now() / 1000;
    const isWaiting = storm.state === StormState.WAITING;
    const isShrinking = storm.state === StormState.SHRINKING;
    const timeLeft = storm.timer;

    // WAITING → SHRINKING 전환 감지 → 플래시
    if (isShrinking && this.prevStormState === StormState.WAITING) {
      this.stormWarningFlash = 1.0;
    }
    this.prevStormState = storm.state;
    if (this.stormWarningFlash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 50, 50, ${this.stormWarningFlash * 0.15})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
      this.stormWarningFlash = Math.max(0, this.stormWarningFlash - 0.02);
    }

    // 경고 단계 결정
    const isUrgent = isWaiting && timeLeft <= 5;
    const isWarning = isWaiting && timeLeft <= 10 && timeLeft > 5;

    if (isUrgent) {
      // 긴급: 화면 테두리 빨간색 펄스
      const pulse = (Math.sin(now * 6) + 1) / 2;
      const borderAlpha = 0.1 + pulse * 0.15;
      ctx.save();
      const grad = ctx.createRadialGradient(
        cx, this.canvas.height / 2, Math.min(cx, this.canvas.height / 2) * 0.7,
        cx, this.canvas.height / 2, Math.max(cx, this.canvas.height / 2) * 1.2
      );
      grad.addColorStop(0, "rgba(255, 0, 0, 0)");
      grad.addColorStop(1, `rgba(255, 0, 0, ${borderAlpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    }

    // 메인 배너
    let fontSize = 14;
    let bannerHeight = 30;
    let bgColor = "rgba(0, 0, 0, 0.5)";
    let textColor = "white";
    let warningText = "";

    if (isShrinking) {
      fontSize = 16;
      bannerHeight = 36;
      const pulse = (Math.sin(now * 4) + 1) / 2;
      bgColor = `rgba(180, 30, 30, ${0.6 + pulse * 0.2})`;
      textColor = "#ff6666";
      warningText = "자기장이 줄어들고 있습니다!";
    } else if (isUrgent) {
      fontSize = 18;
      bannerHeight = 42;
      const pulse = (Math.sin(now * 8) + 1) / 2;
      bgColor = `rgba(200, 20, 20, ${0.6 + pulse * 0.3})`;
      textColor = `rgb(255, ${150 + Math.floor(pulse * 105)}, ${150 + Math.floor(pulse * 105)})`;
      warningText = "자기장 축소 임박!";
    } else if (isWarning) {
      fontSize = 16;
      bannerHeight = 36;
      bgColor = "rgba(180, 100, 0, 0.6)";
      textColor = "#ffcc44";
      warningText = "자기장이 곧 줄어듭니다";
    }

    ctx.save();

    // 경고 텍스트 (배너 위에)
    if (warningText) {
      ctx.font = `bold ${fontSize + 4}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const warningY = isUrgent ? 30 : 28;

      // 경고 텍스트 배경
      const ww = ctx.measureText(warningText).width + 30;
      ctx.fillStyle = bgColor;
      const rx = cx - ww / 2;
      const ry = warningY - (bannerHeight + 4) / 2;
      ctx.beginPath();
      ctx.roundRect(rx, ry, ww, bannerHeight + 4, 6);
      ctx.fill();

      // 경고 텍스트
      ctx.fillStyle = textColor;
      ctx.fillText(warningText, cx, warningY);

      // 카운트다운 (아래줄)
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillText(label, cx, warningY + bannerHeight / 2 + fontSize / 2 + 6);

      ctx.restore();
      return;
    }

    // 기본 상태 (경고 없음)
    ctx.font = `bold ${fontSize}px sans-serif`;
    const textWidth = ctx.measureText(label).width + 20;
    ctx.fillStyle = bgColor;
    const rx = cx - textWidth / 2;
    ctx.beginPath();
    ctx.roundRect(rx, 10, textWidth, bannerHeight, 6);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cx, 10 + bannerHeight / 2);

    ctx.restore();
  }

  private drawAimIndicator(): void {
    const ctx = this.ctx;
    const cam = this.camera;
    const player = this.entityManager.player;
    if (!player || !player.isAlive) return;

    const pScreen = cam.worldToScreen(player.position.x, player.position.y);
    const aScreen = cam.worldToScreen(player.aimTarget.x, player.aimTarget.y);
    const r = player.radius * cam.zoom;

    // 플레이어 → 조준점 방향 벡터
    const dx = aScreen.x - pScreen.x;
    const dy = aScreen.y - pScreen.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return;

    const nx = dx / dist;
    const ny = dy / dist;

    // 1) 방향선: 플레이어 가장자리 → 조준점 방향으로 점선
    const startX = pScreen.x + nx * (r + 4);
    const startY = pScreen.y + ny * (r + 4);
    const lineLen = Math.min(dist - r, 80); // 최대 80px

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + nx * lineLen, startY + ny * lineLen);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 2) 십자선 (조준점 위치)
    const crossSize = 10;
    const crossGap = 4;

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1.5;

    // 가로선 (중앙 갭)
    ctx.beginPath();
    ctx.moveTo(aScreen.x - crossSize, aScreen.y);
    ctx.lineTo(aScreen.x - crossGap, aScreen.y);
    ctx.moveTo(aScreen.x + crossGap, aScreen.y);
    ctx.lineTo(aScreen.x + crossSize, aScreen.y);
    // 세로선 (중앙 갭)
    ctx.moveTo(aScreen.x, aScreen.y - crossSize);
    ctx.lineTo(aScreen.x, aScreen.y - crossGap);
    ctx.moveTo(aScreen.x, aScreen.y + crossGap);
    ctx.lineTo(aScreen.x, aScreen.y + crossSize);
    ctx.stroke();

    // 중앙 점
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(aScreen.x, aScreen.y, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.resize(width, height);
  }
}
