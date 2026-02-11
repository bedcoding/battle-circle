export class InputManager {
  mouseX: number = 0;
  mouseY: number = 0;
  mouseDown: boolean = false;
  private canvas: HTMLCanvasElement | null = null;

  // 키보드 이동 상태
  private keys: Set<string> = new Set();

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;

    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.mouseDown = true;
    });

    canvas.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouseDown = false;
    });

    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.mouseX = touch.clientX - rect.left;
      this.mouseY = touch.clientY - rect.top;
    }, { passive: false });

    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.mouseX = touch.clientX - rect.left;
      this.mouseY = touch.clientY - rect.top;
      this.mouseDown = true;
    }, { passive: false });

    canvas.addEventListener("touchend", () => {
      this.mouseDown = false;
    });

    // 키보드 이벤트 — e.code 사용 (물리 키 위치 기반)
    // 한글 IME(ㅈㅁㄴㅇ), Shift, CapsLock 전부 무관하게 동작
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
    });

    // 탭 전환 시 키 상태 초기화
    window.addEventListener("blur", () => {
      this.keys.clear();
    });
  }

  getScreenPosition(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }

  isMouseDown(): boolean {
    return this.mouseDown;
  }

  /** WASD + 화살표 → 정규화된 이동 방향 (0~1) 반환. 입력 없으면 {0,0} */
  getMoveDirection(): { x: number; y: number } {
    let dx = 0;
    let dy = 0;

    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) dy -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) dy += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) dx -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) dx += 1;

    // 대각선 이동 시 정규화
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    return { x: dx, y: dy };
  }

  isMoving(): boolean {
    return this.keys.has("KeyW") || this.keys.has("KeyS") ||
           this.keys.has("KeyA") || this.keys.has("KeyD") ||
           this.keys.has("ArrowUp") || this.keys.has("ArrowDown") ||
           this.keys.has("ArrowLeft") || this.keys.has("ArrowRight");
  }
}
