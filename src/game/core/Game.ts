import { GameState } from "./GameState";
import { EventBus } from "./EventBus";
import { CONFIG } from "./GameConfig";
import { EntityManager } from "../entities/EntityManager";
import { Bot, WorldView } from "../entities/Bot";
import { Projectile } from "../entities/Projectile";
import { PhysicsSystem } from "../systems/PhysicsSystem";
import { AbsorptionSystem } from "../systems/AbsorptionSystem";
import { StormSystem } from "../systems/StormSystem";
import { FoodSpawnSystem } from "../systems/FoodSpawnSystem";
import { ScoreSystem } from "../systems/ScoreSystem";
import { ProjectileSystem } from "../systems/ProjectileSystem";
import { BuffSystem } from "../systems/BuffSystem";
import { EquipmentSystem } from "../systems/EquipmentSystem";
import { SkillChoice } from "../systems/SkillSystem";
import { Camera } from "../rendering/Camera";
import { Renderer } from "../rendering/Renderer";
import { InputManager } from "../input/InputManager";
import { Vector2 } from "../utils/Vector2";
import { BuffType } from "../entities/BuffItem";
import { EquipType } from "../entities/EquipmentItem";

const SHOOT_COOLDOWN = 0.3; // 초

export interface GameResult {
  rank: number;
  kills: number;
  maxMass: number;
  survivalTime: number;
  playerName: string;
  isWinner: boolean;
}

export class Game {
  state: GameState = GameState.MENU;
  eventBus: EventBus;
  entityManager: EntityManager;
  physicsSystem: PhysicsSystem;
  absorptionSystem: AbsorptionSystem;
  stormSystem: StormSystem;
  foodSpawnSystem: FoodSpawnSystem;
  scoreSystem: ScoreSystem;
  projectileSystem: ProjectileSystem;
  buffSystem: BuffSystem;
  equipmentSystem: EquipmentSystem;
  camera: Camera;
  renderer: Renderer;
  inputManager: InputManager;

  elapsedTime: number = 0;
  private lastTime: number = 0;
  private animationId: number = 0;
  private playerDeathTime: number = 0;
  private playerDeathRank: number = 0;
  private levelUpPaused: boolean = false;
  private playerShootCooldown: number = 0;

  onStateChange?: (state: GameState, result?: GameResult) => void;
  onLevelUp?: (choices: SkillChoice[], level: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.eventBus = new EventBus();
    this.entityManager = new EntityManager();
    this.physicsSystem = new PhysicsSystem(this.entityManager);
    this.absorptionSystem = new AbsorptionSystem(this.entityManager, this.eventBus);
    this.stormSystem = new StormSystem(this.eventBus, this.entityManager);
    this.foodSpawnSystem = new FoodSpawnSystem(this.entityManager);
    this.scoreSystem = new ScoreSystem(this.entityManager);
    this.projectileSystem = new ProjectileSystem(this.entityManager, this.eventBus);
    this.buffSystem = new BuffSystem(this.entityManager);
    this.equipmentSystem = new EquipmentSystem(this.entityManager);
    this.inputManager = new InputManager();
    this.camera = new Camera(canvas.width, canvas.height);
    this.renderer = new Renderer(
      canvas,
      this.camera,
      this.entityManager,
      this.stormSystem,
      this.absorptionSystem,
      this.scoreSystem,
      this.projectileSystem,
      this.buffSystem,
      this.equipmentSystem
    );

    this.inputManager.attach(canvas);

    this.eventBus.on("entity:killed", (entityId: unknown) => {
      const player = this.entityManager.player;
      if (player && entityId === player.id) {
        this.onPlayerDeath();
      }
    });

    this.eventBus.on("entity:absorbed", (_absorberId: unknown, targetId: unknown) => {
      const player = this.entityManager.player;
      if (player && targetId === player.id) {
        this.onPlayerDeath();
      }
    });
  }

  start(playerName: string, botCount: number = CONFIG.BOT.COUNT): void {
    // 기존 게임 루프 중단 (중복 방지)
    cancelAnimationFrame(this.animationId);

    this.elapsedTime = 0;
    this.playerDeathTime = 0;
    this.playerDeathRank = 0;
    this.levelUpPaused = false;
    this.playerShootCooldown = 0;

    this.entityManager.player = null;
    this.entityManager.bots = [];
    this.entityManager.food = [];
    this.entityManager.obstacles = [];
    this.projectileSystem.clear();
    this.buffSystem.clear();
    this.equipmentSystem.clear();

    const player = this.entityManager.initPlayer(playerName);
    player.skills.reset();
    this.entityManager.spawnBots(botCount);
    this.entityManager.spawnObstacles();
    this.foodSpawnSystem.init();
    this.stormSystem.start();

    this.camera.x = player.position.x;
    this.camera.y = player.position.y;

    this.state = GameState.PLAYING;
    this.onStateChange?.(this.state);
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  private gameLoop(currentTime: number): void {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    if (this.state === GameState.PLAYING || this.state === GameState.SPECTATING) {
      if (!this.levelUpPaused) {
        this.update(dt);
      }
      this.renderer.render(this.state, this.elapsedTime);
    }

    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  private update(dt: number): void {
    this.elapsedTime += dt;

    const player = this.entityManager.player;

    // 플레이어 입력 처리
    if (player && player.isAlive) {
      // 키보드 이동 (WASD / 화살표)
      const move = this.inputManager.getMoveDirection();
      player.setMoveDirection(move.x, move.y);

      // 마우스 → 조준 방향
      const screen = this.inputManager.getScreenPosition();
      const world = this.camera.screenToWorld(screen.x, screen.y);
      player.aimTarget.set(world.x, world.y);

      this.playerShootCooldown -= dt;
      if (this.inputManager.isMouseDown() && this.playerShootCooldown <= 0) {
        const dir = new Vector2(world.x, world.y).sub(player.position);
        if (dir.length() > 1) {
          const spawnPos = player.position.add(dir.normalize().scale(player.radius + 8));
          const proj = new Projectile(spawnPos, dir, player.id, player.color);
          if (player.hasBuff(BuffType.DAMAGE)) proj.damage = 3;
          this.applyEquipToProjectile(proj, player);
          this.projectileSystem.add(proj);
          this.playerShootCooldown = SHOOT_COOLDOWN;
        }
      }
    }

    // 봇 AI
    for (const bot of this.entityManager.bots) {
      if (!bot.isAlive) continue;
      if (bot.needsDecision()) {
        const view = this.buildWorldView(bot);
        bot.think(view);
      }
      // 봇 사격: 가까운 적이 있으면 쏨
      bot.shootCooldown -= dt;
      if (bot.shootCooldown <= 0) {
        const target = this.findBotShootTarget(bot);
        if (target) {
          const dir = target.sub(bot.position);
          const spawnPos = bot.position.add(dir.normalize().scale(bot.radius + 8));
          const proj = new Projectile(spawnPos, dir, bot.id, bot.color);
          if (bot.hasBuff(BuffType.DAMAGE)) proj.damage = 3;
          this.applyEquipToProjectile(proj, bot);
          this.projectileSystem.add(proj);
          bot.shootCooldown = SHOOT_COOLDOWN + Math.random() * 0.3;
        }
      }
    }

    // 엔티티 업데이트
    if (player && player.isAlive) player.update(dt);
    for (const bot of this.entityManager.bots) {
      if (bot.isAlive) bot.update(dt);
    }

    // 시스템 업데이트
    this.stormSystem.update(dt);
    this.foodSpawnSystem.update(dt);
    this.physicsSystem.update(dt);
    this.absorptionSystem.update(dt);
    this.projectileSystem.update(dt);
    this.buffSystem.update(dt);
    this.equipmentSystem.update(dt);
    this.stormSystem.applyDamage(dt);
    this.scoreSystem.update();

    // 리젠 스킬 적용
    for (const entity of this.entityManager.getAllEntities()) {
      if (entity.skillStats.regenRate > 0) {
        entity.mass += entity.skillStats.regenRate * dt;
      }
    }

    // 정리
    this.entityManager.cleanup();

    // 레벨업 체크 (플레이어)
    if (player && player.isAlive) {
      if (player.skills.checkLevelUp(player.mass)) {
        this.levelUpPaused = true;
        this.onLevelUp?.(player.skills.choices, player.skills.playerLevel);
      }
    }

    // 봇 레벨업 (자동 선택)
    for (const bot of this.entityManager.bots) {
      if (!bot.isAlive) continue;
      if (bot.skills.checkLevelUp(bot.mass)) {
        bot.skills.autoSelectSkill();
      }
    }

    // 카메라 추적
    const followTarget = this.getFollowTarget();
    if (followTarget) {
      this.camera.follow(followTarget.position, followTarget.radius, dt);
    }

    // 승리 조건 체크
    this.checkWinCondition();
  }

  private findBotShootTarget(bot: Bot): Vector2 | null {
    const visionRange = 400;
    const entities = this.entityManager.getAllEntities();
    let closest: Vector2 | null = null;
    let closestDist = Infinity;

    for (const entity of entities) {
      if (entity.id === bot.id || !entity.isAlive) continue;
      const dist = bot.position.distanceTo(entity.position);
      if (dist < visionRange && dist < closestDist) {
        closestDist = dist;
        closest = entity.position.clone();
      }
    }
    return closest;
  }

  selectSkill(skillId: string): void {
    const player = this.entityManager.player;
    if (player) {
      player.skills.selectSkill(skillId);
    }
    this.levelUpPaused = false;
  }

  private buildWorldView(bot: Bot): WorldView {
    const visionRange = this.camera.screenWidth * CONFIG.BOT.VISION_RANGE_MULTIPLIER / this.camera.zoom;
    const nearby = this.entityManager.entityHash.queryArea(bot.position, visionRange);

    return {
      nearbyEntities: nearby.filter((e) => e.id !== bot.id && e.isAlive),
      nearbyFood: this.entityManager.food
        .filter((f) => f.isAlive && f.position.distanceTo(bot.position) < visionRange)
        .map((f) => ({ position: f.position, nutrition: f.nutrition })),
      nearbyBuffs: this.buffSystem.buffs
        .filter((b) => b.isAlive && b.position.distanceTo(bot.position) < visionRange)
        .map((b) => ({ position: b.position })),
      nearbyEquipment: this.equipmentSystem.items
        .filter((e) => e.isAlive && e.position.distanceTo(bot.position) < visionRange)
        .map((e) => ({ position: e.position })),
      stormCenter: this.stormSystem.currentCenter,
      stormRadius: this.stormSystem.currentRadius,
      isInStorm: this.stormSystem.isInStorm(bot.position),
    };
  }

  private applyEquipToProjectile(proj: Projectile, shooter: { getEquipStat: (k: string) => number; wearEquip: (t: EquipType, n?: number) => void; hasEquip: (t: EquipType) => boolean }): void {
    const speedMult = shooter.getEquipStat("projectileSpeed");
    if (speedMult > 0) {
      proj.velocity = proj.velocity.normalize().scale(proj.speed * (1 + speedMult));
      proj.lifetime *= (1 + shooter.getEquipStat("projectileLifetime"));
      shooter.wearEquip(EquipType.SCOPE);
    }
    const dmgBoost = shooter.getEquipStat("damageBoost");
    if (dmgBoost > 0) {
      proj.damage += dmgBoost;
      shooter.wearEquip(EquipType.HEAVY_AMMO);
    }
  }

  private getFollowTarget(): { position: Vector2; radius: number } | null {
    const player = this.entityManager.player;
    if (player && player.isAlive) {
      return player;
    }
    const entities = this.entityManager.getAllEntities();
    if (entities.length === 0) return null;
    return entities.reduce((a, b) => (a.mass > b.mass ? a : b));
  }

  private onPlayerDeath(): void {
    this.playerDeathTime = this.elapsedTime;
    this.playerDeathRank = this.entityManager.getAliveCount() + 1;
    this.state = GameState.SPECTATING;
    this.onStateChange?.(this.state);

    setTimeout(() => {
      this.showResult();
    }, 3000);
  }

  private checkWinCondition(): void {
    const alive = this.entityManager.getAliveCount();
    const player = this.entityManager.player;

    if (alive <= 1) {
      if (player && player.isAlive) {
        this.showResult();
      } else if (this.state === GameState.SPECTATING) {
        this.showResult();
      }
    }
  }

  private showResult(): void {
    if (this.state === GameState.RESULT) return;
    this.state = GameState.RESULT;

    const player = this.entityManager.player;
    const result: GameResult = {
      rank: player && player.isAlive ? 1 : this.playerDeathRank,
      kills: player?.kills ?? 0,
      maxMass: Math.floor(player?.maxMass ?? 0),
      survivalTime: player && player.isAlive ? this.elapsedTime : this.playerDeathTime,
      playerName: player?.name ?? "",
      isWinner: player?.isAlive ?? false,
    };

    this.onStateChange?.(this.state, result);
  }

  stop(): void {
    cancelAnimationFrame(this.animationId);
  }

  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
  }
}
