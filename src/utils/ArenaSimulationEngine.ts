// utils/ArenaSimulationEngine.ts

export interface RobotState {
  x: number; // Grid sütunu
  y: number; // Grid sətri
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
}

export class ArenaSimulationEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private grid: number[][]; // 0: Boş, 1: Divar/Ağac, 2: Hədəf (Böyük Almaz/Ulduz)
  
  // Robotun cari və hədəf vəziyyəti (Animasiya üçün)
  public robot: RobotState = { x: 0, y: 0, direction: 'RIGHT' };
  private renderX: number = 0;
  private renderY: number = 0;
  
  private cellSize: number = 60;
  private animationId: number | null = null;
  private frameCount: number = 0;

  constructor(canvas: HTMLCanvasElement, grid: number[][], startPos: RobotState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.grid = grid;
    this.robot = { ...startPos };
    this.renderX = startPos.x * this.cellSize;
    this.renderY = startPos.y * this.cellSize;
    
    this.resize();
  }

  public resize() {
    const rows = this.grid.length;
    const cols = this.grid[0]?.length || 0;
    this.canvas.width = cols * this.cellSize;
    this.canvas.height = rows * this.cellSize;
  }

  // Komandaların icrası (Məsələn: "FORWARD", "TURN_LEFT")
  public moveForward(): boolean {
    let nextX = this.robot.x;
    let nextY = this.robot.y;

    if (this.robot.direction === 'UP') nextY--;
    else if (this.robot.direction === 'DOWN') nextY++;
    else if (this.robot.direction === 'LEFT') nextX--;
    else if (this.robot.direction === 'RIGHT') nextX++;

    // Divar və ya sərhəd yoxlanışı
    if (
      nextY >= 0 && nextY < this.grid.length &&
      nextX >= 0 && nextX < this.grid[0].length &&
      this.grid[nextY][nextX] !== 1
    ) {
      this.robot.x = nextX;
      this.robot.y = nextY;
      return true; // Uğurlu hərəkət
    }
    return false; // Maneəyə dəydi
  }

  public turnLeft() {
    const dirs: RobotState['direction'][] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
    const idx = dirs.indexOf(this.robot.direction);
    this.robot.direction = dirs[(idx + 1) % 4];
  }

  public turnRight() {
    const dirs: RobotState['direction'][] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
    const idx = dirs.indexOf(this.robot.direction);
    this.robot.direction = dirs[(idx + 1) % 4];
  }

  public reset(startPos: RobotState) {
    this.robot = { ...startPos };
    this.renderX = startPos.x * this.cellSize;
    this.renderY = startPos.y * this.cellSize;
  }

  // --- RENDER DÖVRÜ ---
  public start() {
    const loop = () => {
      this.update();
      this.draw();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  private update() {
    this.frameCount++;
    const targetX = this.robot.x * this.cellSize;
    const targetY = this.robot.y * this.cellSize;
    
    // Robotun rəvan hərəkət animasiyası (Lerp)
    this.renderX += (targetX - this.renderX) * 0.2;
    this.renderY += (targetY - this.renderY) * 0.2;
  }

  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Grid Xanalari və Xəritə Obyektləri
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[r].length; c++) {
        const x = c * this.cellSize;
        const y = r * this.cellSize;

        // Xana fonu (Şahmat lövhəsi stilində yüngül naxış)
        this.ctx.fillStyle = (r + c) % 2 === 0 ? '#f8fafc' : '#f1f5f9';
        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        this.ctx.strokeStyle = '#cbd5e1';
        this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);

        // Obyektlərin renderi
        if (this.grid[r][c] === 1) {
          // Divar / Ağac maneəsi
          this.ctx.font = '30px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText('🌲', x + this.cellSize / 2, y + this.cellSize / 2);
        } else if (this.grid[r][c] === 2) {
          // Hədəf (Almaz / Qiymətli Kristal)
          const pulse = Math.sin(this.frameCount * 0.1) * 3;
          this.ctx.font = `${32 + pulse}px Arial`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText('💎', x + this.cellSize / 2, y + this.cellSize / 2);
        }
      }
    }

    // 2. Robotun (Personajın) Çəkilməsi
    this.ctx.save();
    // Robotun mərkəzinə transfer edirik ki, istiqamətə görə döndərə bilək
    this.ctx.translate(this.renderX + this.cellSize / 2, this.renderY + this.cellSize / 2);
    
    if (this.robot.direction === 'UP') this.ctx.rotate(-Math.PI / 2);
    else if (this.robot.direction === 'DOWN') this.ctx.rotate(Math.PI / 2);
    else if (this.robot.direction === 'LEFT') this.ctx.rotate(Math.PI);
    // RIGHT üçün 0 dərəcə (Default)

    this.ctx.font = '36px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('🤖', 0, 0);
    this.ctx.restore();
  }

  public checkWin(): boolean {
    return this.grid[this.robot.y][this.robot.x] === 2;
  }
}