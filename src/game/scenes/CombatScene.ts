import { Scene } from "phaser";
import { CombatMachine, CombatEvent, PlayerAction, MAX_DARK_POWER } from "../combat/machine";
import { Monster } from "../model/Monster";
import { debugBridge, type DebugStateProvider } from "../debug";

const WIDTH = 320;
const HEIGHT = 240;
const MSG_BOX_H = 64;
const MSG_BOX_Y = HEIGHT - MSG_BOX_H;
const HP_BAR_W = 80;
const HP_BAR_H = 6;
const DP_PIP_SIZE = 8;
const DP_PIP_GAP = 3;

export class CombatScene extends Scene implements DebugStateProvider {
  private machine!: CombatMachine;
  private enemySprite!: Phaser.GameObjects.Image;
  private playerSprite!: Phaser.GameObjects.Image;
  private enemyHpBar!: Phaser.GameObjects.Rectangle;
  private playerHpBar!: Phaser.GameObjects.Rectangle;
  private enemyNameText!: Phaser.GameObjects.Text;
  private playerNameText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private fightBtn!: Phaser.GameObjects.Text;
  private runBtn!: Phaser.GameObjects.Text;
  private rechargeBtn!: Phaser.GameObjects.Text;
  private dpPips: Phaser.GameObjects.Rectangle[] = [];
  private eventQueue: CombatEvent[] = [];
  private processing = false;

  constructor() {
    super("CombatScene");
  }

  preload() {
    if (!this.textures.exists("rockitten-battle")) {
      this.load.spritesheet("rockitten-battle", "assets/sprites/rockitten-sheet.png", {
        frameWidth: 64,
        frameHeight: 64,
      });
    }
  }

  init(data: { playerMonster: Monster; enemyMonster: Monster }) {
    this.machine = new CombatMachine(data.playerMonster, data.enemyMonster);
  }

  create() {
    // Background
    this.cameras.main.setBackgroundColor("#2a4a3a");

    // Enemy sprite (front) — upper right
    this.enemySprite = this.add.image(WIDTH - 72, 48, "rockitten-battle", 1);
    this.enemySprite.setScale(2);

    // Player sprite (back) — lower left
    this.playerSprite = this.add.image(72, MSG_BOX_Y - 48, "rockitten-battle", 0);
    this.playerSprite.setScale(2);

    // Enemy HP bar + name
    const enemyHpX = WIDTH - 72 - HP_BAR_W / 2;
    const enemyHpY = 88;
    this.enemyNameText = this.add.text(enemyHpX, enemyHpY - 12, "", {
      fontSize: "10px",
      color: "#ffffff",
    });
    this.add.rectangle(enemyHpX + HP_BAR_W / 2, enemyHpY + 2, HP_BAR_W, HP_BAR_H, 0x333333);
    this.enemyHpBar = this.add.rectangle(
      enemyHpX + HP_BAR_W / 2,
      enemyHpY + 2,
      HP_BAR_W,
      HP_BAR_H,
      0x44cc44,
    );

    // Player HP bar + name
    const playerHpX = 72 - HP_BAR_W / 2;
    const playerHpY = MSG_BOX_Y - 88;
    this.playerNameText = this.add.text(playerHpX, playerHpY - 12, "", {
      fontSize: "10px",
      color: "#ffffff",
    });
    this.add.rectangle(playerHpX + HP_BAR_W / 2, playerHpY + 2, HP_BAR_W, HP_BAR_H, 0x333333);
    this.playerHpBar = this.add.rectangle(
      playerHpX + HP_BAR_W / 2,
      playerHpY + 2,
      HP_BAR_W,
      HP_BAR_H,
      0x44cc44,
    );

    // Message box background
    this.add.rectangle(WIDTH / 2, MSG_BOX_Y + MSG_BOX_H / 2, WIDTH, MSG_BOX_H, 0x111111, 0.9);

    // Message text
    this.messageText = this.add.text(12, MSG_BOX_Y + 8, "", {
      fontSize: "11px",
      color: "#ffffff",
      wordWrap: { width: WIDTH - 24 },
    });

    // Fight / Run buttons (positioned in message box area)
    const btnY = MSG_BOX_Y + MSG_BOX_H - 20;
    this.fightBtn = this.add
      .text(WIDTH - 100, btnY, "▶ FIGHT", {
        fontSize: "11px",
        color: "#ffcc00",
        backgroundColor: "#333333",
        padding: { x: 6, y: 3 },
      })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.onAction("fight"));

    this.runBtn = this.add
      .text(WIDTH - 44, btnY, "RUN", {
        fontSize: "11px",
        color: "#cccccc",
        backgroundColor: "#333333",
        padding: { x: 6, y: 3 },
      })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.onAction("run"));

    // Recharge button (shown when DP is not full)
    this.rechargeBtn = this.add
      .text(WIDTH - 100, btnY - 18, "⚡ RECHARGE", {
        fontSize: "10px",
        color: "#bb66ff",
        backgroundColor: "#333333",
        padding: { x: 6, y: 2 },
      })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.onRecharge());

    // Dark Power pips — below player HP bar
    const dpStartX = 72 - HP_BAR_W / 2;
    const dpY = MSG_BOX_Y - 72;

    this.add.text(dpStartX, dpY - 10, "DP", {
      fontSize: "8px",
      color: "#bb66ff",
    });

    this.dpPips = [];
    for (let i = 0; i < MAX_DARK_POWER; i++) {
      const pip = this.add
        .rectangle(
          dpStartX + i * (DP_PIP_SIZE + DP_PIP_GAP) + DP_PIP_SIZE / 2 + 16,
          dpY - 5,
          DP_PIP_SIZE,
          DP_PIP_SIZE,
          0xbb66ff,
        )
        .setStrokeStyle(1, 0x8833cc);
      this.dpPips.push(pip);
    }

    this.hideMenu();
    this.updateHpBars();
    this.updateDpPips();
    this.updateNameLabels();

    // Start combat
    this.queueEvents(this.machine.intro());

    debugBridge.setScene(this);
    debugBridge.emit("scene_started", { scene: "CombatScene" });

    this.events.once("shutdown", () => {
      debugBridge.emit("scene_stopped", { scene: "CombatScene" });
    });
  }

  getDebugState(): Record<string, unknown> {
    const m = this.machine;
    const monsterSnapshot = (mon: Monster) => ({
      slug: mon.slug,
      level: mon.level,
      currentHp: mon.currentHp,
      maxHp: mon.maxHp,
    });
    return {
      combat: {
        state: m.state,
        outcome: m.outcome,
        darkPower: m.darkPower,
        maxDarkPower: m.maxDarkPower,
        playerMonster: monsterSnapshot(m.player),
        enemyMonster: monsterSnapshot(m.enemy),
      },
    };
  }

  private updateNameLabels() {
    const p = this.machine.player;
    const e = this.machine.enemy;
    this.playerNameText.setText(`${p.name} Lv${p.level}`);
    this.enemyNameText.setText(`${e.name} Lv${e.level}`);
  }

  private updateHpBars() {
    const pRatio = this.machine.player.currentHp / this.machine.player.maxHp;
    const eRatio = this.machine.enemy.currentHp / this.machine.enemy.maxHp;
    this.playerHpBar.setScale(Math.max(0, pRatio), 1);
    this.enemyHpBar.setScale(Math.max(0, eRatio), 1);

    // Color shift: green > yellow > red
    this.playerHpBar.setFillStyle(this.hpColor(pRatio));
    this.enemyHpBar.setFillStyle(this.hpColor(eRatio));
  }

  private hpColor(ratio: number): number {
    if (ratio > 0.5) return 0x44cc44;
    if (ratio > 0.2) return 0xcccc44;
    return 0xcc4444;
  }

  private updateDpPips() {
    for (let i = 0; i < this.dpPips.length; i++) {
      if (i < this.machine.darkPower) {
        this.dpPips[i].setFillStyle(0xbb66ff);
      } else {
        this.dpPips[i].setFillStyle(0x332244);
      }
    }
  }

  private showMenu() {
    const canFight = this.machine.canFight();
    this.fightBtn.setVisible(true);
    this.fightBtn.setColor(canFight ? "#ffcc00" : "#666666");
    this.fightBtn.setInteractive(canFight ? { useHandCursor: true } : false);
    this.runBtn.setVisible(true);
    this.rechargeBtn.setVisible(this.machine.darkPower < this.machine.maxDarkPower);
  }

  private hideMenu() {
    this.fightBtn.setVisible(false);
    this.runBtn.setVisible(false);
    this.rechargeBtn.setVisible(false);
  }

  private onAction(action: PlayerAction) {
    if (this.processing) return;
    if (action === "fight" && !this.machine.canFight()) return;
    this.hideMenu();
    this.queueEvents(this.machine.submitAction(action));
  }

  private onRecharge() {
    if (this.processing) return;
    if (this.machine.darkPower >= this.machine.maxDarkPower) return;
    this.hideMenu();

    this.scene.pause();
    this.scene.launch("MathProblemScene", { returnScene: "CombatScene" });

    this.scene.get("MathProblemScene").events.once("shutdown", () => {
      const mathScene = this.scene.get("MathProblemScene");
      const correct = mathScene.data.get("correct") as boolean;
      if (correct) {
        this.machine.rechargeDarkPower();
        this.messageText.setText("Dark Power recharged!");
      } else {
        this.messageText.setText("Recharge failed...");
      }
      this.updateDpPips();
      this.time.delayedCall(1000, () => {
        if (this.machine.state === "DECISION") {
          this.showMenu();
        }
      });
    });
  }

  private queueEvents(events: CombatEvent[]) {
    this.eventQueue.push(...events);
    if (!this.processing) {
      this.processNextEvent();
    }
  }

  private processNextEvent() {
    if (this.eventQueue.length === 0) {
      this.processing = false;
      this.updateHpBars();
      if (this.machine.state === "DECISION") {
        this.showMenu();
      } else if (this.machine.state === "END") {
        this.showEndMessage();
      }
      return;
    }

    this.processing = true;
    const event = this.eventQueue.shift()!;
    this.messageText.setText(event.message);
    this.updateHpBars();
    this.updateDpPips();

    // Pause between events so the player can read them
    this.time.delayedCall(1000, () => this.processNextEvent());
  }

  private showEndMessage() {
    const outcome = this.machine.outcome;
    let msg = "";
    if (outcome === "win") msg = "You won the battle!";
    else if (outcome === "lose") msg = "You lost...";
    else if (outcome === "fled") msg = "Got away safely!";

    this.messageText.setText(msg);

    // Return to overworld after a delay
    this.time.delayedCall(2000, () => {
      this.scene.stop("CombatScene");
      this.scene.resume("OverworldScene");
    });
  }
}
