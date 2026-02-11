import { Vector2 } from "../utils/Vector2";
import { CONFIG } from "../core/GameConfig";
import { EventBus } from "../core/EventBus";
import { EntityManager } from "../entities/EntityManager";
import { lerp, randomRange } from "../utils/MathUtils";

export enum StormState {
  WAITING = "WAITING",
  SHRINKING = "SHRINKING",
}

export class StormSystem {
  currentCenter: Vector2;
  currentRadius: number;
  targetCenter: Vector2;
  targetRadius: number;

  phase: number = 0;
  state: StormState = StormState.WAITING;
  timer: number = 0;
  damageRate: number = 0;

  // 다음 안전지대 미리보기
  nextCenter: Vector2;
  nextRadius: number;

  private started: boolean = false;

  constructor(
    private eventBus: EventBus,
    private entityManager: EntityManager
  ) {
    const cx = CONFIG.WORLD.WIDTH / 2;
    const cy = CONFIG.WORLD.HEIGHT / 2;
    this.currentCenter = new Vector2(cx, cy);
    this.currentRadius = Math.max(CONFIG.WORLD.WIDTH, CONFIG.WORLD.HEIGHT) / 2;
    this.targetCenter = new Vector2(cx, cy);
    this.targetRadius = this.currentRadius;
    this.nextCenter = new Vector2(cx, cy);
    this.nextRadius = this.currentRadius;
  }

  start(): void {
    // 전체 초기화
    const cx = CONFIG.WORLD.WIDTH / 2;
    const cy = CONFIG.WORLD.HEIGHT / 2;
    const initialRadius = Math.max(CONFIG.WORLD.WIDTH, CONFIG.WORLD.HEIGHT) / 2;
    this.currentCenter = new Vector2(cx, cy);
    this.currentRadius = initialRadius;
    this.targetCenter = new Vector2(cx, cy);
    this.targetRadius = initialRadius;
    this.nextCenter = new Vector2(cx, cy);
    this.nextRadius = initialRadius;
    this.damageRate = 0;
    this.timer = 0;
    this.state = StormState.WAITING;

    this.started = true;
    this.phase = 0;
    this.startPhase();
  }

  private startPhase(): void {
    if (this.phase >= CONFIG.STORM.PHASES.length) return;

    const phaseConfig = CONFIG.STORM.PHASES[this.phase];
    this.state = StormState.WAITING;
    this.timer = phaseConfig.waitTime;
    this.damageRate = phaseConfig.damageRate;

    // 다음 안전지대 계산
    const drift = phaseConfig.centerDrift;
    this.nextCenter = new Vector2(
      this.currentCenter.x + randomRange(-drift, drift),
      this.currentCenter.y + randomRange(-drift, drift)
    );
    // 맵 안에 유지
    this.nextCenter.x = Math.max(phaseConfig.targetRadius, Math.min(CONFIG.WORLD.WIDTH - phaseConfig.targetRadius, this.nextCenter.x));
    this.nextCenter.y = Math.max(phaseConfig.targetRadius, Math.min(CONFIG.WORLD.HEIGHT - phaseConfig.targetRadius, this.nextCenter.y));
    this.nextRadius = phaseConfig.targetRadius;

    this.eventBus.emit("storm:phase_change", this.phase);
  }

  update(dt: number): void {
    if (!this.started) return;
    if (this.phase >= CONFIG.STORM.PHASES.length) return;

    const phaseConfig = CONFIG.STORM.PHASES[this.phase];
    this.timer -= dt;

    if (this.state === StormState.WAITING) {
      if (this.timer <= 0) {
        // 축소 시작
        this.state = StormState.SHRINKING;
        this.timer = phaseConfig.shrinkTime;
        this.targetCenter = this.nextCenter.clone();
        this.targetRadius = this.nextRadius;
        this.eventBus.emit("storm:shrinking_start");
      }
    } else if (this.state === StormState.SHRINKING) {
      const t = 1 - Math.max(0, this.timer / phaseConfig.shrinkTime);
      const startRadius = this.phase === 0
        ? Math.max(CONFIG.WORLD.WIDTH, CONFIG.WORLD.HEIGHT) / 2
        : CONFIG.STORM.PHASES[this.phase - 1].targetRadius;
      const startCenter = this.phase === 0
        ? new Vector2(CONFIG.WORLD.WIDTH / 2, CONFIG.WORLD.HEIGHT / 2)
        : this.currentCenter;

      this.currentRadius = lerp(startRadius, this.targetRadius, t);
      this.currentCenter = Vector2.lerp(startCenter, this.targetCenter, t);

      if (this.timer <= 0) {
        this.currentRadius = this.targetRadius;
        this.currentCenter = this.targetCenter.clone();
        this.phase++;
        if (this.phase < CONFIG.STORM.PHASES.length) {
          this.startPhase();
        }
      }
    }
  }

  applyDamage(dt: number): void {
    if (!this.started) return;

    for (const entity of this.entityManager.getAllEntities()) {
      const dist = entity.position.distanceTo(this.currentCenter);
      if (dist > this.currentRadius) {
        const resistance = entity.skillStats.stormResistance;
        entity.mass -= entity.mass * this.damageRate * (1 - resistance) * dt;
        if (entity.mass < CONFIG.PLAYER.MIN_MASS) {
          entity.kill();
          this.eventBus.emit("entity:killed", entity.id, "storm");
        }
      }
    }
  }

  isInStorm(position: Vector2): boolean {
    return position.distanceTo(this.currentCenter) > this.currentRadius;
  }

  getTimeLeft(): number {
    return Math.max(0, this.timer);
  }

  getStateLabel(): string {
    if (!this.started) return "";
    if (this.phase >= CONFIG.STORM.PHASES.length) return "최종 안전지대";
    return this.state === StormState.WAITING
      ? `${this.phase + 1}단계 | 자기장 축소: ${Math.ceil(this.timer)}초 남음`
      : `축소 중... ${Math.ceil(this.timer)}초`;
  }
}
