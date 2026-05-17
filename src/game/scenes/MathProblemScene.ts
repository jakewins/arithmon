import { Scene } from "phaser";
import { skillTree } from "../skilltree";
import type { PerseusProblem, ProblemWidget, GradeResult } from "../data/problems";
import { debugBridge, type DebugCommandHandler, type DebugStateProvider } from "../debug";

const WIDTH = 320;
const HEIGHT = 240;

export class MathProblemScene extends Scene implements DebugStateProvider, DebugCommandHandler {
  private problem!: PerseusProblem;
  private currentAnswer = "";
  private answerText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private hintIndex = 0;
  private resolved = false;
  private returnScene = "OverworldScene";
  private choiceButtons: Phaser.GameObjects.Text[] = [];
  // Comparison state
  private comparisonButtons: Phaser.GameObjects.Text[] = [];
  // Dual-input state
  private dualAnswers: [string, string] = ["", ""];
  private dualTexts: [Phaser.GameObjects.Text | null, Phaser.GameObjects.Text | null] = [
    null,
    null,
  ];
  private dualBoxes: [Phaser.GameObjects.Rectangle | null, Phaser.GameObjects.Rectangle | null] = [
    null,
    null,
  ];
  private activeField: 0 | 1 = 0;
  // Number-line state
  private nlMarker: Phaser.GameObjects.Rectangle | null = null;
  private nlValueText: Phaser.GameObjects.Text | null = null;
  private nlValue = 0;
  private nlRange: [number, number] = [0, 20];
  private nlLineX = 0;
  private nlLineW = 0;
  private injectedProblem: PerseusProblem | null = null;
  private isInjected = false;

  constructor() {
    super("MathProblemScene");
  }

  init(data?: { returnScene?: string; problem?: PerseusProblem }) {
    this.returnScene = data?.returnScene ?? "OverworldScene";
    this.injectedProblem = data?.problem ?? null;
  }

  create() {
    this.currentAnswer = "";
    this.hintIndex = 0;
    this.resolved = false;
    this.choiceButtons = [];
    this.comparisonButtons = [];
    this.dualAnswers = ["", ""];
    this.dualTexts = [null, null];
    this.dualBoxes = [null, null];
    this.activeField = 0;
    this.nlMarker = null;
    this.nlValueText = null;
    this.nlValue = 0;

    this.isInjected = this.injectedProblem !== null;
    this.problem = this.injectedProblem ?? skillTree.getNextProblem();
    this.injectedProblem = null;

    const widget = Object.values(this.problem.question.widgets)[0];

    // Extract display text from Perseus content: strip markdown bold and LaTeX $
    const displayQuestion = this.problem.question.content
      .replace(/\[\[☃.*?\]\]/g, "") // remove widget placeholders
      .replace(/\*\*/g, "") // strip bold markers
      .replace(/\$/g, "") // strip LaTeX delimiters
      .trim();

    this.cameras.main.setBackgroundColor("#1a1a2e");

    // --- Outer frame ---
    const panelY = 16;
    const panelW = WIDTH - 40;
    const panelH = HEIGHT - 32;

    // Panel background
    this.add
      .rectangle(WIDTH / 2, HEIGHT / 2, panelW, panelH, 0x111111, 0.92)
      .setStrokeStyle(2, 0x4488cc);

    // Title
    this.add
      .text(WIDTH / 2, panelY + 14, "MATH CHALLENGE", {
        fontSize: "12px",
        color: "#4488cc",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Separator line
    this.add.rectangle(WIDTH / 2, panelY + 28, panelW - 24, 1, 0x4488cc, 0.5);

    // Question text — use smaller font + word wrap for longer text (e.g. word problems)
    const isLongQuestion = displayQuestion.length > 40;
    const questionFontSize = isLongQuestion ? "10px" : "14px";
    const questionObj = this.add
      .text(WIDTH / 2, panelY + 38, displayQuestion, {
        fontSize: questionFontSize,
        color: "#ffffff",
        fontStyle: "bold",
        wordWrap: { width: panelW - 24 },
        align: "center",
      })
      .setOrigin(0.5, 0);

    // Position UI elements below the question text
    const contentY = questionObj.y + questionObj.height + 8;

    if (widget.type === "radio") {
      this.createRadioUI(widget, contentY, panelW);
    } else if (widget.type === "dual-input") {
      this.createDualInputUI(widget, contentY, panelW);
    } else if (widget.type === "comparison") {
      this.createComparisonUI(widget, contentY);
    } else if (widget.type === "number-line") {
      this.createNumberLineUI(widget, contentY, panelW);
    } else {
      this.createNumericInputUI(contentY, panelW);
    }

    // Feedback text (correct/incorrect)
    this.feedbackText = this.add
      .text(WIDTH / 2, HEIGHT - panelY - 24, "", {
        fontSize: "12px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    debugBridge.setScene(this);
    debugBridge.emit("scene_started", { scene: "MathProblemScene" });
    debugBridge.emit("math_problem_shown", {
      skill: this.problem.id,
      type: widget.type,
    });

    this.events.once("shutdown", () => {
      debugBridge.emit("scene_stopped", { scene: "MathProblemScene" });
    });
  }

  getDebugState(): Record<string, unknown> {
    return {
      mathProblem: {
        problemId: this.problem.id,
        currentAnswer: this.currentAnswer,
        resolved: this.resolved,
        hintIndex: this.hintIndex,
        totalHints: this.problem.hints.length,
        returnScene: this.returnScene,
      },
    };
  }

  // --- DebugCommandHandler ---

  debugTypeAnswer(text: string): void {
    if (this.resolved) return;
    const widget = Object.values(this.problem.question.widgets)[0];
    if (widget.type === "dual-input") {
      const parts = text.split(",");
      this.dualAnswers = [parts[0] ?? "", parts[1] ?? ""];
      this.updateDualDisplay();
    } else if (widget.type === "number-line") {
      const val = parseInt(text, 10);
      if (!isNaN(val)) {
        this.nlValue = val;
        this.updateNumberLineMarker();
      }
    } else {
      this.currentAnswer = text;
      if (widget.type !== "radio" && widget.type !== "comparison") {
        this.updateAnswerDisplay();
      }
    }
  }

  debugSubmitAnswer(): void {
    if (this.resolved) return;
    const widget = Object.values(this.problem.question.widgets)[0];
    if (widget.type === "radio") {
      // For radio, interpret currentAnswer as a 0-based index
      const index = parseInt(this.currentAnswer, 10);
      if (!isNaN(index)) {
        this.selectChoice(index);
      }
    } else if (widget.type === "comparison") {
      // For comparison, interpret currentAnswer as 0-based index (0=>, 1==, 2=<)
      const index = parseInt(this.currentAnswer, 10);
      if (!isNaN(index)) {
        this.selectComparison(index);
      }
    } else if (widget.type === "dual-input") {
      this.submitDualAnswer();
    } else if (widget.type === "number-line") {
      this.submitNumberLineAnswer();
    } else {
      this.submitNumericAnswer();
    }
  }

  private createNumericInputUI(contentY: number, panelW: number) {
    // Answer input area
    const inputY = contentY;
    this.add.rectangle(WIDTH / 2, inputY, 80, 22, 0x222244).setStrokeStyle(1, 0x6666aa);

    this.answerText = this.add
      .text(WIDTH / 2, inputY, "_", {
        fontSize: "14px",
        color: "#ffcc00",
      })
      .setOrigin(0.5);

    // Submit button
    const submitY = inputY + 30;
    this.add
      .text(WIDTH / 2, submitY, "▶ SUBMIT", {
        fontSize: "11px",
        color: "#ffcc00",
        backgroundColor: "#333333",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.submitNumericAnswer());

    // Hint button
    this.add
      .text(WIDTH / 2, submitY + 24, "? HINT", {
        fontSize: "10px",
        color: "#88aacc",
        backgroundColor: "#222233",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.showNextHint());

    // Hint display area
    this.hintText = this.add
      .text(WIDTH / 2, submitY + 52, "", {
        fontSize: "9px",
        color: "#88aacc",
        wordWrap: { width: panelW - 40 },
        align: "center",
      })
      .setOrigin(0.5, 0);

    // Keyboard input: digits, backspace, enter
    this.input.keyboard!.on("keydown", (event: KeyboardEvent) => {
      if (this.resolved) return;

      if (event.key >= "0" && event.key <= "9") {
        if (this.currentAnswer.length < 5) {
          this.currentAnswer += event.key;
          this.updateAnswerDisplay();
        }
      } else if (event.key === "Backspace") {
        this.currentAnswer = this.currentAnswer.slice(0, -1);
        this.updateAnswerDisplay();
      } else if (event.key === "Enter") {
        this.submitNumericAnswer();
      }
    });
  }

  private createDualInputUI(
    widget: ProblemWidget & { type: "dual-input" },
    contentY: number,
    _panelW: number,
  ) {
    // Dummy answerText so updateAnswerDisplay() doesn't crash if called
    this.answerText = this.add.text(0, 0, "").setVisible(false);

    const inputY = contentY;
    const boxW = 56;
    const gap = 24;
    const leftX = WIDTH / 2 - gap - boxW / 2;
    const rightX = WIDTH / 2 + gap + boxW / 2;

    // Labels
    const labels = widget.options.labels;
    this.add
      .text(leftX, inputY - 16, labels[0], { fontSize: "9px", color: "#88aacc" })
      .setOrigin(0.5);
    this.add
      .text(rightX, inputY - 16, labels[1], { fontSize: "9px", color: "#88aacc" })
      .setOrigin(0.5);

    // Input boxes
    this.dualBoxes[0] = this.add
      .rectangle(leftX, inputY, boxW, 22, 0x222244)
      .setStrokeStyle(2, 0xffcc00);
    this.dualBoxes[1] = this.add
      .rectangle(rightX, inputY, boxW, 22, 0x222244)
      .setStrokeStyle(1, 0x6666aa);

    // Answer texts
    this.dualTexts[0] = this.add
      .text(leftX, inputY, "_", { fontSize: "14px", color: "#ffcc00" })
      .setOrigin(0.5);
    this.dualTexts[1] = this.add
      .text(rightX, inputY, "_", { fontSize: "14px", color: "#ffcc00" })
      .setOrigin(0.5);

    // Click to focus
    this.dualBoxes[0].setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      this.activeField = 0;
      this.updateDualFocus();
    });
    this.dualBoxes[1].setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      this.activeField = 1;
      this.updateDualFocus();
    });

    // Submit button
    const submitY = inputY + 30;
    this.add
      .text(WIDTH / 2, submitY, "▶ SUBMIT", {
        fontSize: "11px",
        color: "#ffcc00",
        backgroundColor: "#333333",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.submitDualAnswer());

    // Hint button
    this.add
      .text(WIDTH / 2, submitY + 24, "? HINT", {
        fontSize: "10px",
        color: "#88aacc",
        backgroundColor: "#222233",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.showNextHint());

    // Hint display
    this.hintText = this.add
      .text(WIDTH / 2, submitY + 52, "", {
        fontSize: "9px",
        color: "#88aacc",
        wordWrap: { width: _panelW - 40 },
        align: "center",
      })
      .setOrigin(0.5, 0);

    // Keyboard input
    this.input.keyboard!.on("keydown", (event: KeyboardEvent) => {
      if (this.resolved) return;

      if (event.key === "Tab") {
        event.preventDefault();
        this.activeField = this.activeField === 0 ? 1 : 0;
        this.updateDualFocus();
      } else if (event.key >= "0" && event.key <= "9") {
        if (this.dualAnswers[this.activeField].length < 3) {
          this.dualAnswers[this.activeField] += event.key;
          this.updateDualDisplay();
        }
      } else if (event.key === "Backspace") {
        this.dualAnswers[this.activeField] = this.dualAnswers[this.activeField].slice(0, -1);
        this.updateDualDisplay();
      } else if (event.key === "Enter") {
        this.submitDualAnswer();
      }
    });
  }

  private updateDualFocus() {
    this.dualBoxes[0]?.setStrokeStyle(
      this.activeField === 0 ? 2 : 1,
      this.activeField === 0 ? 0xffcc00 : 0x6666aa,
    );
    this.dualBoxes[1]?.setStrokeStyle(
      this.activeField === 1 ? 2 : 1,
      this.activeField === 1 ? 0xffcc00 : 0x6666aa,
    );
  }

  private updateDualDisplay() {
    this.dualTexts[0]?.setText(this.dualAnswers[0] || "_");
    this.dualTexts[1]?.setText(this.dualAnswers[1] || "_");
  }

  private submitDualAnswer() {
    if (this.resolved) return;
    if (this.dualAnswers[0] === "" || this.dualAnswers[1] === "") return;
    this.resolved = true;

    const a0 = parseInt(this.dualAnswers[0], 10);
    const a1 = parseInt(this.dualAnswers[1], 10);
    const result = this.grade([a0, a1]);
    debugBridge.emit("math_problem_answered", {
      correct: result.correct,
      answer: `${a0},${a1}`,
    });

    this.data.set("correct", result.correct);

    if (result.correct) {
      this.feedbackText.setText("CORRECT!");
      this.feedbackText.setColor("#44cc44");
    } else {
      const exp = result.expected as [number, number];
      this.feedbackText.setText(`INCORRECT — answer was ${exp[0]}, ${exp[1]}`);
      this.feedbackText.setColor("#cc4444");
    }

    this.time.delayedCall(2000, () => {
      this.scene.stop("MathProblemScene");
      this.scene.resume(this.returnScene);
    });
  }

  private createRadioUI(
    widget: ProblemWidget & { type: "radio" },
    contentY: number,
    panelW: number,
  ) {
    const choices = widget.options.choices;
    const startY = contentY;
    const spacing = 24;

    for (let i = 0; i < choices.length; i++) {
      const y = startY + i * spacing;
      const btn = this.add
        .text(WIDTH / 2, y, choices[i].content, {
          fontSize: "13px",
          color: "#ffffff",
          backgroundColor: "#333355",
          padding: { x: 12, y: 5 },
          fixedWidth: panelW - 80,
          align: "center",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.selectChoice(i));

      this.choiceButtons.push(btn);
    }

    // No hint button for radio — the choices themselves are scaffolding.
    // Create a dummy hintText so showNextHint() doesn't crash if called.
    this.hintText = this.add.text(0, 0, "").setVisible(false);
  }

  private createComparisonUI(widget: ProblemWidget & { type: "comparison" }, contentY: number) {
    // Dummy elements so other methods don't crash
    this.answerText = this.add.text(0, 0, "").setVisible(false);
    this.hintText = this.add.text(0, 0, "").setVisible(false);

    const rowY = contentY;
    const { left, right } = widget.options;

    // Left value
    this.add
      .text(WIDTH / 2 - 80, rowY, left, {
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Right value
    this.add
      .text(WIDTH / 2 + 80, rowY, right, {
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Three comparison buttons in the middle
    const symbols: Array<">" | "=" | "<"> = [">", "=", "<"];
    const btnSpacing = 36;
    const startX = WIDTH / 2 - btnSpacing;

    for (let i = 0; i < symbols.length; i++) {
      const x = startX + i * btnSpacing;
      const btn = this.add
        .text(x, rowY, symbols[i], {
          fontSize: "16px",
          color: "#ffffff",
          backgroundColor: "#333355",
          padding: { x: 8, y: 6 },
          align: "center",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.selectComparison(i));

      this.comparisonButtons.push(btn);
    }
  }

  private createNumberLineUI(
    widget: ProblemWidget & { type: "number-line" },
    contentY: number,
    panelW: number,
  ) {
    // Dummy elements so other methods don't crash
    this.answerText = this.add.text(0, 0, "").setVisible(false);
    this.hintText = this.add.text(0, 0, "").setVisible(false);

    const { range, step, labelStep } = widget.options;
    this.nlRange = range;
    this.nlValue = range[0];

    const lineY = contentY + 16;
    const margin = 28;
    const lineX = (WIDTH - panelW) / 2 + margin;
    const lineW = panelW - margin * 2;
    this.nlLineX = lineX;
    this.nlLineW = lineW;

    // Main horizontal line
    this.add.rectangle(lineX + lineW / 2, lineY, lineW, 2, 0x6688aa);

    // Tick marks and labels
    const totalSteps = (range[1] - range[0]) / step;
    for (let i = 0; i <= totalSteps; i++) {
      const val = range[0] + i * step;
      const x = lineX + (i / totalSteps) * lineW;
      const isLabel = (val - range[0]) % labelStep === 0;
      const tickH = isLabel ? 8 : 4;

      this.add.rectangle(x, lineY, 1, tickH, 0x6688aa);

      if (isLabel) {
        this.add
          .text(x, lineY + 8, String(val), {
            fontSize: "8px",
            color: "#88aacc",
          })
          .setOrigin(0.5, 0);
      }
    }

    // Marker (visual only — interaction is handled by the hit zone below)
    const markerX = lineX; // starts at range[0]
    this.nlMarker = this.add
      .rectangle(markerX, lineY - 1, 8, 14, 0xffcc00)
      .setStrokeStyle(1, 0xffaa00);

    // Value label above marker
    this.nlValueText = this.add
      .text(markerX, lineY - 16, String(range[0]), {
        fontSize: "10px",
        color: "#ffcc00",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 1);

    // Hit zone handles both click-to-place and drag
    const snapPointer = (px: number) => {
      if (this.resolved) return;
      const clamped = Math.min(Math.max(px, lineX), lineX + lineW);
      const frac = (clamped - lineX) / lineW;
      const rawVal = range[0] + frac * (range[1] - range[0]);
      const snapped = Math.round(rawVal / step) * step;
      this.nlValue = Math.min(Math.max(snapped, range[0]), range[1]);
      this.updateNumberLineMarker();
    };

    let dragging = false;
    const hitZone = this.add
      .rectangle(lineX + lineW / 2, lineY, lineW + 16, 30, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hitZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      dragging = true;
      snapPointer(pointer.x);
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (dragging) snapPointer(pointer.x);
    });
    this.input.on("pointerup", () => {
      dragging = false;
    });

    // Submit button
    const submitY = lineY + 32;
    this.add
      .text(WIDTH / 2, submitY, "▶ SUBMIT", {
        fontSize: "11px",
        color: "#ffcc00",
        backgroundColor: "#333333",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.submitNumberLineAnswer());

    // Hint button
    this.add
      .text(WIDTH / 2, submitY + 24, "? HINT", {
        fontSize: "10px",
        color: "#88aacc",
        backgroundColor: "#222233",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.showNextHint());

    // Keyboard: left/right arrows to nudge
    this.input.keyboard!.on("keydown", (event: KeyboardEvent) => {
      if (this.resolved) return;
      if (event.key === "ArrowLeft") {
        this.nlValue = Math.max(this.nlValue - step, range[0]);
        this.updateNumberLineMarker();
      } else if (event.key === "ArrowRight") {
        this.nlValue = Math.min(this.nlValue + step, range[1]);
        this.updateNumberLineMarker();
      } else if (event.key === "Enter") {
        this.submitNumberLineAnswer();
      }
    });
  }

  private updateNumberLineMarker() {
    const frac = (this.nlValue - this.nlRange[0]) / (this.nlRange[1] - this.nlRange[0]);
    const x = this.nlLineX + frac * this.nlLineW;
    this.nlMarker?.setX(x);
    this.nlValueText?.setX(x);
    this.nlValueText?.setText(String(this.nlValue));
  }

  private submitNumberLineAnswer() {
    if (this.resolved) return;
    this.resolved = true;

    const result = this.grade(this.nlValue);
    debugBridge.emit("math_problem_answered", {
      correct: result.correct,
      answer: this.nlValue,
    });

    this.data.set("correct", result.correct);

    if (result.correct) {
      this.feedbackText.setText("CORRECT!");
      this.feedbackText.setColor("#44cc44");
      this.nlMarker?.setFillStyle(0x44cc44);
    } else {
      this.feedbackText.setText(`INCORRECT — answer was ${result.expected}`);
      this.feedbackText.setColor("#cc4444");
      this.nlMarker?.setFillStyle(0xcc4444);

      // Show correct position marker
      const expected = result.expected as number;
      const frac = (expected - this.nlRange[0]) / (this.nlRange[1] - this.nlRange[0]);
      const correctX = this.nlLineX + frac * this.nlLineW;
      this.add
        .rectangle(correctX, this.nlMarker!.y, 8, 14, 0x44cc44, 0.6)
        .setStrokeStyle(1, 0x44cc44);
    }

    this.time.delayedCall(2000, () => {
      this.scene.stop("MathProblemScene");
      this.scene.resume(this.returnScene);
    });
  }

  private selectComparison(index: number) {
    if (this.resolved) return;
    this.resolved = true;

    const symbols: Array<">" | "=" | "<"> = [">", "=", "<"];
    const selected = symbols[index];
    const result = this.grade(selected);
    debugBridge.emit("math_problem_answered", {
      correct: result.correct,
      answer: selected,
    });

    this.data.set("correct", result.correct);

    // Highlight buttons
    for (let i = 0; i < this.comparisonButtons.length; i++) {
      if (i === index) {
        this.comparisonButtons[i].setBackgroundColor(result.correct ? "#225522" : "#552222");
        this.comparisonButtons[i].setColor(result.correct ? "#44cc44" : "#cc4444");
      }
      if (!result.correct && symbols[i] === (result.expected as string)) {
        this.comparisonButtons[i].setBackgroundColor("#225522");
        this.comparisonButtons[i].setColor("#44cc44");
      }
    }

    if (result.correct) {
      this.feedbackText.setText("CORRECT!");
      this.feedbackText.setColor("#44cc44");
    } else {
      this.feedbackText.setText(`INCORRECT — answer was ${result.expected}`);
      this.feedbackText.setColor("#cc4444");
    }

    this.time.delayedCall(2000, () => {
      this.scene.stop("MathProblemScene");
      this.scene.resume(this.returnScene);
    });
  }

  private selectChoice(index: number) {
    if (this.resolved) return;
    this.resolved = true;

    const widget = Object.values(this.problem.question.widgets)[0];
    if (widget.type !== "radio") return;

    const choices = widget.options.choices;
    const selected = choices[index];
    const result = this.grade(selected.content);
    debugBridge.emit("math_problem_answered", {
      correct: result.correct,
      answer: selected.content,
    });

    this.data.set("correct", result.correct);

    // Highlight the selected button
    for (let i = 0; i < this.choiceButtons.length; i++) {
      if (i === index) {
        this.choiceButtons[i].setBackgroundColor(result.correct ? "#225522" : "#552222");
        this.choiceButtons[i].setColor(result.correct ? "#44cc44" : "#cc4444");
      }
      if (!result.correct && choices[i].correct) {
        // Show correct answer
        this.choiceButtons[i].setBackgroundColor("#225522");
        this.choiceButtons[i].setColor("#44cc44");
      }
    }

    if (result.correct) {
      this.feedbackText.setText("CORRECT!");
      this.feedbackText.setColor("#44cc44");
    } else {
      this.feedbackText.setText(`INCORRECT — answer was ${result.expected}`);
      this.feedbackText.setColor("#cc4444");
    }

    this.time.delayedCall(2000, () => {
      this.scene.stop("MathProblemScene");
      this.scene.resume(this.returnScene);
    });
  }

  private updateAnswerDisplay() {
    this.answerText.setText(this.currentAnswer || "_");
  }

  /** Grade an answer, routing to skill tree for normal problems or local grading for injected ones. */
  private grade(answer: number | string | [number, number]): GradeResult {
    if (!this.isInjected) {
      return skillTree.gradeAnswer(this.problem.id, answer);
    }
    const widget = Object.values(this.problem.question.widgets)[0];
    if (widget.type === "number-line") {
      const expected = widget.options.answer;
      return { correct: answer === expected, expected };
    } else if (widget.type === "comparison") {
      const expected = widget.options.answer;
      return { correct: answer === expected, expected };
    } else if (widget.type === "dual-input") {
      const [exp0, exp1] = widget.options.answers;
      const correct = Array.isArray(answer) && answer[0] === exp0.value && answer[1] === exp1.value;
      return { correct, expected: [exp0.value, exp1.value] };
    } else if (widget.type === "radio") {
      const correctChoice = widget.options.choices.find((c) => c.correct);
      const expected = correctChoice?.content ?? "";
      return { correct: answer === expected, expected };
    } else {
      const correctAnswer = widget.options.answers.find((a) => a.status === "correct");
      const expected = correctAnswer?.value ?? 0;
      return { correct: answer === expected, expected };
    }
  }

  private submitNumericAnswer() {
    if (this.resolved || this.currentAnswer === "") return;
    this.resolved = true;

    const answer = parseInt(this.currentAnswer, 10);
    const result = this.grade(answer);
    debugBridge.emit("math_problem_answered", {
      correct: result.correct,
      answer: this.currentAnswer,
    });

    // Store result so the calling scene can read it
    this.data.set("correct", result.correct);

    if (result.correct) {
      this.feedbackText.setText("CORRECT!");
      this.feedbackText.setColor("#44cc44");
    } else {
      this.feedbackText.setText(`INCORRECT — answer was ${result.expected}`);
      this.feedbackText.setColor("#cc4444");
    }

    this.time.delayedCall(2000, () => {
      this.scene.stop("MathProblemScene");
      this.scene.resume(this.returnScene);
    });
  }

  private showNextHint() {
    if (this.resolved) return;
    if (this.hintIndex >= this.problem.hints.length) return;

    const hint = this.problem.hints[this.hintIndex];
    // Strip markdown formatting for display
    const displayHint = hint.content.replace(/\*\*/g, "").replace(/\$/g, "").trim();

    this.hintText.setText(displayHint);
    this.hintIndex++;
  }
}
