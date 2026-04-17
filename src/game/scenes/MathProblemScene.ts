import { Scene } from "phaser";
import { skillTree } from "../skilltree";
import type { PerseusProblem, ProblemWidget } from "../data/problems";
import { debugBridge, type DebugStateProvider } from "../debug";

const WIDTH = 320;
const HEIGHT = 240;

export class MathProblemScene extends Scene implements DebugStateProvider {
  private problem!: PerseusProblem;
  private currentAnswer = "";
  private answerText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private hintIndex = 0;
  private resolved = false;
  private returnScene = "OverworldScene";
  private choiceButtons: Phaser.GameObjects.Text[] = [];

  constructor() {
    super("MathProblemScene");
  }

  init(data?: { returnScene?: string }) {
    this.returnScene = data?.returnScene ?? "OverworldScene";
  }

  create() {
    this.currentAnswer = "";
    this.hintIndex = 0;
    this.resolved = false;
    this.choiceButtons = [];

    this.problem = skillTree.getNextProblem();

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

    // Question text
    this.add
      .text(WIDTH / 2, panelY + 52, displayQuestion, {
        fontSize: "14px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    if (widget.type === "radio") {
      this.createRadioUI(widget, panelY, panelW);
    } else {
      this.createNumericInputUI(panelY, panelW);
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

  private createNumericInputUI(panelY: number, panelW: number) {
    // Answer input area
    const inputY = panelY + 84;
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

  private createRadioUI(widget: ProblemWidget & { type: "radio" }, panelY: number, panelW: number) {
    const choices = widget.options.choices;
    const startY = panelY + 78;
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

  private selectChoice(index: number) {
    if (this.resolved) return;
    this.resolved = true;

    const widget = Object.values(this.problem.question.widgets)[0];
    if (widget.type !== "radio") return;

    const choices = widget.options.choices;
    const selected = choices[index];
    const result = skillTree.gradeAnswer(this.problem.id, selected.content);
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

  private submitNumericAnswer() {
    if (this.resolved || this.currentAnswer === "") return;
    this.resolved = true;

    const answer = parseInt(this.currentAnswer, 10);
    const result = skillTree.gradeAnswer(this.problem.id, answer);
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
