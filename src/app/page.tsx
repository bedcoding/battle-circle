"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Game, GameResult } from "@/game/core/Game";
import { GameState } from "@/game/core/GameState";
import { SkillChoice } from "@/game/systems/SkillSystem";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [screen, setScreen] = useState<"menu" | "playing" | "spectating" | "result">("menu");
  const [playerName, setPlayerName] = useState("");
  const [result, setResult] = useState<GameResult | null>(null);
  const [botCount, setBotCount] = useState(100);
  const [levelUpChoices, setLevelUpChoices] = useState<SkillChoice[] | null>(null);
  const [levelUpLevel, setLevelUpLevel] = useState(0);

  // ... (다른 useEffect 등)

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const name = playerName.trim() || "Player";

    gameRef.current?.stop();

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const game = new Game(canvas);
    gameRef.current = game;

    game.onStateChange = (state: GameState, gameResult?: GameResult) => {
      switch (state) {
        case GameState.PLAYING:
          setScreen("playing");
          break;
        case GameState.SPECTATING:
          setScreen("spectating");
          break;
        case GameState.RESULT:
          setScreen("result");
          if (gameResult) setResult(gameResult);
          break;
      }
    };

    game.onLevelUp = (choices: SkillChoice[], level: number) => {
      setLevelUpChoices(choices);
      setLevelUpLevel(level);
    };

    game.start(name, botCount); // 선택된 봇 수 전달
    setScreen("playing");
    setLevelUpChoices(null);
  }, [playerName, botCount]);

  const handleSkillSelect = useCallback((skillId: string) => {
    gameRef.current?.selectSkill(skillId);
    setLevelUpChoices(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") startGame();
    },
    [startGame]
  );

  useEffect(() => {
    return () => {
      gameRef.current?.stop();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <canvas ref={canvasRef} />

      {/* 시작 화면 */}
      {screen === "menu" && (
        <div className="menu-overlay">
          <h1 className="menu-title">레진그라운드</h1>
          <p className="menu-subtitle">내가 뭘 만든거지...</p>
          <input
            className="menu-input"
            type="text"
            placeholder="이름을 입력하세요"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={16}
            autoFocus
          />

          {/* 적 수 선택 드롭다운 추가 */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ color: "white", marginRight: "10px", fontWeight: "bold" }}>적 수:</label>
            <select
              value={botCount}
              onChange={(e) => setBotCount(Number(e.target.value))}
              style={{ padding: "8px", borderRadius: "8px", border: "none", fontSize: "16px", cursor: "pointer" }}
            >
              <option value={50}>50명 (쾌적)</option>
              <option value={100}>100명 (기본)</option>
              <option value={200}>200명 (혼잡)</option>
              <option value={300}>300명 (난장판)</option>
              <option value={500}>500명 (지옥)</option>
            </select>
          </div>

          <button className="play-button" onClick={startGame}>
            게임 시작
          </button>

          <div className="menu-instructions">
            <h3>조작 방법</h3>
            <p>이동: 상하좌우 방향키</p>
            <p>사격: 마우스 왼쪽 클릭</p>
            <p>근접: 작은 적과 부딪히면 흡수함</p>
          </div>
        </div>
      )}

      {/* 레벨업 선택 UI */}
      {levelUpChoices && (
        <div className="levelup-overlay">
          <div className="levelup-title">레벨 업! (Lv.{levelUpLevel})</div>
          <div className="levelup-subtitle">스킬을 선택하세요</div>
          <div className="levelup-choices">
            {levelUpChoices.map((choice) => (
              <button
                key={choice.skill.id}
                className="levelup-card"
                onClick={() => handleSkillSelect(choice.skill.id)}
              >
                <div className="levelup-card-icon">{choice.skill.icon}</div>
                <div className="levelup-card-name">
                  {choice.skill.name}
                  {choice.currentLevel > 0 && (
                    <span className="levelup-card-level">
                      {" "}Lv.{choice.currentLevel} → {choice.nextLevel}
                    </span>
                  )}
                </div>
                <div className="levelup-card-desc">{choice.skill.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 관전 배너 */}
      {screen === "spectating" && (
        <div className="spectating-banner">
          탈락했습니다! 관전 중...
        </div>
      )}

      {/* 결과 화면 */}
      {screen === "result" && result && (
        <div className="result-overlay">
          <div className={`result-rank ${result.isWinner ? "result-winner" : "result-loser"}`}>
            #{result.rank}
          </div>
          <div className="result-title">
            {result.isWinner ? "승리! 최고의 생존자!" : `탈락`}
          </div>
          <div className="result-stats">
            <div className="result-stat">
              <div className="result-stat-value">{result.kills}</div>
              <div className="result-stat-label">처치</div>
            </div>
            <div className="result-stat">
              <div className="result-stat-value">{result.maxMass}</div>
              <div className="result-stat-label">최대 크기</div>
            </div>
            <div className="result-stat">
              <div className="result-stat-value">{formatTime(result.survivalTime)}</div>
              <div className="result-stat-label">생존 시간</div>
            </div>
          </div>
          <button className="play-button" onClick={() => {
            gameRef.current?.stop();
            setScreen("menu");
          }}>
            처음으로
          </button>
        </div>
      )}
    </div>
  );
}
