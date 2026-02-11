export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  apply: (level: number, stats: SkillStats) => void;
}

export interface SkillStats {
  speedMultiplier: number;
  absorptionRangeMultiplier: number;
  stormResistance: number;       // 0~1, 자기장 대미지 감소율
  massGainMultiplier: number;    // 음식/흡수 시 추가 mass 배율
  thornsDamage: number;          // 가시: 접촉 시 상대 mass 감소량
  regenRate: number;             // 초당 mass 자연 회복
  visionMultiplier: number;      // 시야 범위 배율
}

export function defaultStats(): SkillStats {
  return {
    speedMultiplier: 1.0,
    absorptionRangeMultiplier: 1.0,
    stormResistance: 0,
    massGainMultiplier: 1.0,
    thornsDamage: 0,
    regenRate: 0,
    visionMultiplier: 1.0,
  };
}

export const ALL_SKILLS: Skill[] = [
  {
    id: "speed_boost",
    name: "신속 (Swift)",
    description: "이동 속도가 15% 빨라집니다.",
    icon: ">>",
    maxLevel: 5,
    apply: (level, stats) => {
      stats.speedMultiplier += 0.15 * level;
    },
  },
  {
    id: "glutton",
    name: "폭식 (Glutton)",
    description: "음식 섭취 시 20% 더 많이 성장합니다.",
    icon: "++",
    maxLevel: 5,
    apply: (level, stats) => {
      stats.massGainMultiplier += 0.2 * level;
    },
  },
  {
    id: "storm_resist",
    name: "자기장 보호막",
    description: "자기장 피해를 25% 덜 받습니다.",
    icon: "[]",
    maxLevel: 3,
    apply: (level, stats) => {
      stats.stormResistance = Math.min(0.75, 0.25 * level);
    },
  },
  {
    id: "thorns",
    name: "가시 갑옷",
    description: "접촉한 적에게 피해를 줍니다.",
    icon: "**",
    maxLevel: 3,
    apply: (level, stats) => {
      stats.thornsDamage = 2 * level;
    },
  },
  {
    id: "absorb_range",
    name: "중력장",
    description: "더 먼 거리의 아이템을 흡수합니다.",
    icon: "()",
    maxLevel: 3,
    apply: (level, stats) => {
      stats.absorptionRangeMultiplier += 0.25 * level;
    },
  },
  {
    id: "regen",
    name: "재생 (Regen)",
    description: "시간이 지나면 서서히 크기가 회복됩니다.",
    icon: "HP",
    maxLevel: 3,
    apply: (level, stats) => {
      stats.regenRate = 0.5 * level;
    },
  },
];

// 레벨업에 필요한 mass 임계값
export function getMassThreshold(level: number): number {
  // 레벨 1: 30, 레벨 2: 60, 레벨 3: 100, 레벨 4: 160, ...
  return Math.floor(30 * Math.pow(1.5, level - 1));
}

export interface SkillChoice {
  skill: Skill;
  currentLevel: number;
  nextLevel: number;
}

export class SkillSystem {
  private skillLevels: Map<string, number> = new Map();
  private _stats: SkillStats = defaultStats();
  playerLevel: number = 0;
  pendingLevelUp: boolean = false;
  choices: SkillChoice[] = [];

  get stats(): SkillStats {
    return this._stats;
  }

  reset(): void {
    this.skillLevels.clear();
    this._stats = defaultStats();
    this.playerLevel = 0;
    this.pendingLevelUp = false;
    this.choices = [];
  }

  checkLevelUp(currentMass: number): boolean {
    const nextThreshold = getMassThreshold(this.playerLevel + 1);
    if (currentMass >= nextThreshold && !this.pendingLevelUp) {
      this.playerLevel++;
      this.pendingLevelUp = true;
      this.choices = this.generateChoices();
      return true;
    }
    return false;
  }

  private generateChoices(): SkillChoice[] {
    // 레벨이 안 찬 스킬 중 랜덤 3개
    const available = ALL_SKILLS.filter((s) => {
      const current = this.skillLevels.get(s.id) ?? 0;
      return current < s.maxLevel;
    });

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).map((skill) => {
      const current = this.skillLevels.get(skill.id) ?? 0;
      return { skill, currentLevel: current, nextLevel: current + 1 };
    });
  }

  selectSkill(skillId: string): void {
    const choice = this.choices.find((c) => c.skill.id === skillId);
    if (!choice) return;

    this.skillLevels.set(skillId, choice.nextLevel);
    this.recalcStats();
    this.pendingLevelUp = false;
    this.choices = [];
  }

  // 봇용: 랜덤 스킬 자동 선택
  autoSelectSkill(): void {
    if (this.choices.length === 0) return;
    const pick = this.choices[Math.floor(Math.random() * this.choices.length)];
    this.selectSkill(pick.skill.id);
  }

  private recalcStats(): void {
    this._stats = defaultStats();
    for (const [skillId, level] of this.skillLevels) {
      const skill = ALL_SKILLS.find((s) => s.id === skillId);
      if (skill && level > 0) {
        skill.apply(level, this._stats);
      }
    }
  }

  getSkillLevel(skillId: string): number {
    return this.skillLevels.get(skillId) ?? 0;
  }
}
